from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

OrderStatus = Literal["pending", "paid", "failed", "cancelled"]


class CartItemIn(BaseModel):
    product_id: str
    quantity: int = Field(ge=1)


class OrderCreateIn(BaseModel):
    items: list[CartItemIn] = Field(min_length=1)


class OrderItemOut(BaseModel):
    product_id: str
    name: str
    price: float
    quantity: int


class OrderOut(BaseModel):
    id: str
    user_id: str
    items: list[OrderItemOut]
    total: float
    status: OrderStatus
    stripe_session_id: str | None = None
    failure_reason: str | None = None  # Stripe decline message, set when status == failed
    created_at: datetime
    updated_at: datetime


class OrderStatusUpdate(BaseModel):
    status: OrderStatus


class CheckoutOut(BaseModel):
    order_id: str
    checkout_url: str
