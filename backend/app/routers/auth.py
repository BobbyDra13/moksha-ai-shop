from fastapi import APIRouter, Depends, HTTPException, status

from app.deps import get_current_user
from app.models.common import serialize
from app.models.user import GoogleLoginIn, TokenOut, UserOut
from app.services.auth import create_access_token, get_or_create_user, verify_google_token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/google", response_model=TokenOut)
async def google_login(body: GoogleLoginIn):
    """Frontend sends Google ID token. We verify, upsert user, return our JWT."""
    try:
        payload = verify_google_token(body.credential)
    except ValueError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid Google token")

    user = await get_or_create_user(payload)
    token = create_access_token(str(user["_id"]), user["role"])
    return TokenOut(access_token=token, user=UserOut(**serialize(user)))


@router.get("/me", response_model=UserOut)
async def me(user: dict = Depends(get_current_user)):
    return UserOut(**serialize(user))


@router.post("/logout", status_code=204)
async def logout(_: dict = Depends(get_current_user)):
    """JWT is stateless. Frontend drops the token. Endpoint exists for clarity."""
    return None
