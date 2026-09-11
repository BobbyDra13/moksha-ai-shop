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


async def set_status(order_id: ObjectId, new_status: str, extra: dict | None = None) -> None:
    changes = {"status": new_status, "updated_at": datetime.now(timezone.utc)}
    if extra:
        changes.update(extra)
    await orders.update_one({"_id": order_id}, {"$set": changes})


async def mark_paid(order_id: ObjectId) -> None:
    """Called from Stripe webhook. Idempotent: skips if already paid."""
    order = await orders.find_one({"_id": order_id})
    if order is None or order["status"] == "paid":
        return

    # Decrement stock now that money is confirmed
    for item in order["items"]:
        await products.update_one(
            {"_id": to_object_id(item["product_id"])},
            {"$inc": {"stock": -item["quantity"]}},
        )
    await set_status(order_id, "paid")
