from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.db import orders
from app.deps import get_current_user
from app.models.common import serialize, to_object_id
from app.models.order import CheckoutOut, OrderOut
from app.services import orders as order_service
from app.services import stripe_service

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/checkout/{order_id}", response_model=CheckoutOut)
async def start_checkout(order_id: str, user: dict = Depends(get_current_user)):
    """Create Stripe session for a pending order owned by the caller."""
    order = await orders.find_one({"_id": to_object_id(order_id)})
    if order is None or order["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order["status"] != "pending":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order already processed")

    session = stripe_service.create_checkout_session(order)
    await orders.update_one(
        {"_id": order["_id"]}, {"$set": {"stripe_session_id": session.id}}
    )
    return CheckoutOut(order_id=order_id, checkout_url=session.url)


@router.post("/webhook", status_code=200)
async def stripe_webhook(request: Request, stripe_signature: str = Header(alias="stripe-signature")):
    """Stripe calls this. Signature verified. Source of truth for 'paid'."""
    payload = await request.body()
    try:
        event = stripe_service.parse_webhook(payload, stripe_signature)
    except Exception:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid webhook signature")

    session = event["data"]["object"]
    # metadata can be None on some events (e.g. dashboard test events)
    order_id = (session.get("metadata") or {}).get("order_id")
    if not order_id:
        return {"received": True}

    if event["type"] == "checkout.session.completed" and session.get("payment_status") == "paid":
        await order_service.mark_paid(to_object_id(order_id))
    elif event["type"] in ("checkout.session.expired", "checkout.session.async_payment_failed"):
        # Only a still-pending order becomes failed; never overwrite paid/cancelled
        await order_service.set_status(to_object_id(order_id), "failed", only_from="pending")

    return {"received": True}


@router.post("/verify/{order_id}", response_model=OrderOut)
async def verify_payment(order_id: str, user: dict = Depends(get_current_user)):
    """Frontend calls this on the success page. Double-checks with Stripe.
    Webhook may lag; this closes the gap without trusting the redirect alone."""
    order = await orders.find_one({"_id": to_object_id(order_id)})
    if order is None or order["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")

    if order["status"] == "pending" and order.get("stripe_session_id"):
        session = stripe_service.retrieve_session(order["stripe_session_id"])
        if session.payment_status == "paid":
            await order_service.mark_paid(order["_id"])

    return serialize(await orders.find_one({"_id": order["_id"]}))


@router.post("/cancel/{order_id}", response_model=OrderOut)
async def cancel_payment(order_id: str, user: dict = Depends(get_current_user)):
    """Frontend calls this on the cancel page."""
    order = await orders.find_one({"_id": to_object_id(order_id)})
    if order is None or order["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order["status"] == "pending":
        await order_service.set_status(order["_id"], "cancelled", only_from="pending")
    return serialize(await orders.find_one({"_id": order["_id"]}))
