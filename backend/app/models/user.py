from datetime import datetime
from typing import Literal

from pydantic import BaseModel

Role = Literal["customer", "admin"]


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None = None
    role: Role
    created_at: datetime


class GoogleLoginIn(BaseModel):
    credential: str  # Google ID token from the frontend


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
