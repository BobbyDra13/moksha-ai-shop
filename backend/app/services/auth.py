from datetime import datetime, timedelta, timezone

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token
from jose import JWTError, jwt

from app.config import settings
from app.db import users


def verify_google_token(credential: str) -> dict:
    """Verify Google ID token. Returns Google's payload (sub, email, name, picture)."""
    return id_token.verify_oauth2_token(
        credential, google_requests.Request(), settings.google_client_id
    )


async def get_or_create_user(google_payload: dict) -> dict:
    """Find user by google_sub. Create on first login. Returns Mongo doc."""
    sub = google_payload["sub"]
    email = google_payload["email"].lower()

    existing = await users.find_one({"google_sub": sub})
    if existing:
        return existing

    role = "admin" if email in settings.admin_email_list else "customer"
    doc = {
        "google_sub": sub,
        "email": email,
        "name": google_payload.get("name", email),
        "picture": google_payload.get("picture"),
        "role": role,
        "created_at": datetime.now(timezone.utc),
    }
    result = await users.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


def create_access_token(user_id: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def decode_access_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
    except JWTError:
        return None
