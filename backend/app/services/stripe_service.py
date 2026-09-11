import stripe

from app.config import settings

stripe.api_key = settings.stripe_secret_key


def create_checkout_session(order: dict) -> stripe.checkout.Session:
    """Build a Stripe Checkout session from an order doc. Amounts in paise/cents."""
    line_items = [
        {
            "price_data": {
                "currency": "inr",
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
    return stripe.checkout.Session.retrieve(session_id)
