import stripe

from app.config import settings

stripe.api_key = settings.stripe_secret_key


def create_checkout_session(order: dict) -> stripe.checkout.Session:
    """Build a Stripe Checkout session from an order doc. Amounts in paise/cents."""
    line_items = [
        {
            "price_data": {
                "currency": settings.currency,
                "product_data": {"name": item["name"]},
                "unit_amount": int(round(item["price"] * 100)),
            },
            "quantity": item["quantity"],
        }
        for item in order["items"]
    ]
    order_id = str(order["_id"])
    return stripe.checkout.Session.create(
        mode="payment",
        line_items=line_items,
        success_url=f"{settings.frontend_url}/checkout/success?order_id={order_id}",
        cancel_url=f"{settings.frontend_url}/checkout/cancel?order_id={order_id}",
        metadata={"order_id": order_id},
    )


def parse_webhook(payload: bytes, signature: str) -> stripe.Event:
    """Verify signature and return the event. Raises on tampering."""
    return stripe.Webhook.construct_event(payload, signature, settings.stripe_webhook_secret)


def retrieve_session(session_id: str) -> stripe.checkout.Session:
    return stripe.checkout.Session.retrieve(session_id, expand=["payment_intent"])


def last_payment_error(session: stripe.checkout.Session) -> str | None:
    """Decline message from the last attempt, if the customer tried a card that failed.
    Checkout only creates the PaymentIntent once the customer submits, so None means no attempt."""
    intent = session.payment_intent
    if not intent or isinstance(intent, str):
        return None
    err = intent.last_payment_error
    return err.message if err and err.message else None
