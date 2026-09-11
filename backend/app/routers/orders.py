from fastapi import APIRouter, Depends, HTTPException, status

from app.db import orders
from app.deps import get_current_user, require_admin
from app.models.common import serialize, to_object_id
from app.models.order import OrderCreateIn, OrderOut, OrderStatusUpdate
from app.services import orders as order_service

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("", response_model=OrderOut, status_code=201)
async def create_order(body: OrderCreateIn, user: dict = Depends(get_current_user)):
    doc = await order_service.create_order(user["_id"], body.items)
    return serialize(doc)


@router.get("/me", response_model=list[OrderOut])
async def my_orders(user: dict = Depends(get_current_user)):
    docs = await orders.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(100)
    return [serialize(d) for d in docs]


@router.get("/{order_id}", response_model=OrderOut)
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    doc = await _find_or_404(order_id)
    # Customers may only read their own orders
    if user["role"] != "admin" and doc["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Not your order")
    return serialize(doc)


# ---- admin ----

@router.get("", response_model=list[OrderOut])
async def all_orders(_: dict = Depends(require_admin)):
    docs = await orders.find().sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]


@router.patch("/{order_id}/status", response_model=OrderOut)
async def update_status(
    order_id: str, body: OrderStatusUpdate, _: dict = Depends(require_admin)
):
    doc = await _find_or_404(order_id)
    await order_service.set_status(doc["_id"], body.status)
    return serialize(await orders.find_one({"_id": doc["_id"]}))


async def _find_or_404(order_id: str) -> dict:
    try:
        oid = to_object_id(order_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    doc = await orders.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    return doc
