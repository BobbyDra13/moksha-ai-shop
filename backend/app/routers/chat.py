from typing import Literal

from fastapi import APIRouter, Depends
from fastapi.security import HTTPAuthorizationCredentials
from pydantic import BaseModel, Field

from app.db import users
from app.deps import bearer
from app.models.common import to_object_id
from app.services.agent import ask_agent
from app.services.auth import decode_access_token

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    history: list[ChatMessage] = []


class ChatOut(BaseModel):
    reply: str


@router.post("", response_model=ChatOut)
async def chat(body: ChatIn, creds: HTTPAuthorizationCredentials | None = Depends(bearer)):
    """Chat is open to guests (product questions). Order tools only work when logged in."""
    user_id = None
    if creds:
        payload = decode_access_token(creds.credentials)
        if payload:
            user = await users.find_one({"_id": to_object_id(payload["sub"])})
            if user:
                user_id = user["_id"]

    history = [m.model_dump() for m in body.history][-10:]  # keep last 10 turns
    reply = await ask_agent(body.message, history, user_id)
    return ChatOut(reply=reply)
