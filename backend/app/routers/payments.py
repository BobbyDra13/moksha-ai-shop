from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.db import orders
from app.deps import get_current_user
from app.models.common import serialize, to_object_id
from app.models.order import CheckoutOut, OrderOut
from app.services import orders as order_service
from app.services import stripe_service

router = APIRouter(prefix="/payments", tags=["payments"])


RETRYABLE = ("pending", "failed", "cancelled")


@router.post("/checkout/{order_id}", response_model=CheckoutOut)
async def start_checkout(order_id: str, user: dict = Depends(get_current_user)):
    """Create a Stripe session for an unpaid order owned by the caller.
    Failed/cancelled orders can be retried: stock is re-checked and the order goes back to pending."""
    order = await orders.find_one({"_id": to_object_id(order_id)})
    if order is None or order["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order["status"] not in RETRYABLE:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Order already paid")
    await order_service.assert_in_stock(order)

    session = stripe_service.create_checkout_session(order)
    await order_service.set_status(
        order["_id"], "pending", {"stripe_session_id": session.id, "failure_reason": None}
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

    # Newer stripe SDK objects are not dicts (no .get) -> convert once
    session = event["data"]["object"].to_dict()
    # metadata can be None on some events (e.g. dashboard test events)
    order_id = (session.get("metadata") or {}).get("order_id")
    if not order_id:
        return {"received": True}

    if event["type"] == "checkout.session.completed" and session.get("payment_status") == "paid":
        await order_service.mark_paid(to_object_id(order_id))
    elif event["type"] == "checkout.session.async_payment_failed":
        await order_service.set_status(to_object_id(order_id), "failed", only_from="pending")
    elif event["type"] == "checkout.session.expired":
        # Customer walked away and never paid (24h) -> cancelled, not failed. Never overwrite paid.
        await order_service.set_status(to_object_id(order_id), "cancelled", only_from="pending")

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
    """Frontend calls this on the cancel page (Stripe 'back' link) or from the orders list.
    If the customer actually tried a card and it was declined, the order is 'failed' with the
    decline message; if they just left, it is 'cancelled'."""
    order = await orders.find_one({"_id": to_object_id(order_id)})
    if order is None or order["user_id"] != user["_id"]:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Order not found")
    if order["status"] == "pending":
        reason = None
        if order.get("stripe_session_id"):
            session = stripe_service.retrieve_session(order["stripe_session_id"])
            if session.payment_status == "paid":  # raced with the webhook
                await order_service.mark_paid(order["_id"])
                return serialize(await orders.find_one({"_id": order["_id"]}))
            reason = stripe_service.last_payment_error(session)
        if reason:
            await order_service.set_status(order["_id"], "failed", {"failure_reason": reason}, only_from="pending")
        else:
            await order_service.set_status(order["_id"], "cancelled", only_from="pending")
    return serialize(await orders.find_one({"_id": order["_id"]}))
