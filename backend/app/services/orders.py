"""Order business logic. Stock checks, totals, status changes."""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import HTTPException, status

from app.db import orders, products
from app.models.common import to_object_id
from app.models.order import CartItemIn


async def create_order(user_id: ObjectId, items: list[CartItemIn]) -> dict:
    """Validate stock, snapshot prices, insert a pending order."""
    order_items = []
    total = 0.0

    for item in items:
        product = await products.find_one({"_id": to_object_id(item.product_id)})
        if product is None:
            raise HTTPException(status.HTTP_404_NOT_FOUND, f"Product {item.product_id} not found")
        if product["stock"] < item.quantity:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Only {product['stock']} left for {product['name']}",
            )
        order_items.append(
            {
                "product_id": str(product["_id"]),
                "name": product["name"],
                "price": product["price"],
                "quantity": item.quantity,
            }
        )
        total += product["price"] * item.quantity

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "items": order_items,
        "total": round(total, 2),
        "status": "pending",
        "stripe_session_id": None,
        "created_at": now,
        "updated_at": now,
    }
    result = await orders.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


async def assert_in_stock(order: dict) -> None:
    """Re-check stock for an existing order (used before re-opening checkout)."""
    for item in order["items"]:
        product = await products.find_one({"_id": to_object_id(item["product_id"])})
        if product is None or product["stock"] < item["quantity"]:
            left = product["stock"] if product else 0
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Only {left} left for {item['name']}")


async def set_status(
    order_id: ObjectId,
    new_status: str,
    extra: dict | None = None,
    only_from: str | None = None,
) -> bool:
    """Update status. `only_from` guards the transition (e.g. pending -> failed
    must not overwrite paid/cancelled). Returns True if a doc was changed."""
    changes = {"status": new_status, "updated_at": datetime.now(timezone.utc)}
    if extra:
        changes.update(extra)
    query: dict = {"_id": order_id}
    if only_from:
        query["status"] = only_from
    result = await orders.update_one(query, {"$set": changes})
    return result.modified_count == 1


async def mark_paid(order_id: ObjectId) -> None:
    """Called from Stripe webhook and /payments/verify. Idempotent.

    The status flip is a single atomic update filtered on status != paid, so
    if webhook and verify race, only one caller wins and stock is decremented once.
    """
    order = await orders.find_one_and_update(
        {"_id": order_id, "status": {"$ne": "paid"}},
        {"$set": {"status": "paid", "updated_at": datetime.now(timezone.utc)}},
    )
    if order is None:  # missing or already paid
        return

    # Decrement stock now that money is confirmed
    for item in order["items"]:
        await products.update_one(
            {"_id": to_object_id(item["product_id"])},
            {"$inc": {"stock": -item["quantity"]}},
        )
