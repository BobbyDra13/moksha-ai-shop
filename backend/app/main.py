from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_indexes
from app.routers import auth, chat, orders, payments, products


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_indexes()
    yield


app = FastAPI(title="Moksha Mini Shop API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(products.router)
app.include_router(orders.router)
app.include_router(payments.router)
app.include_router(chat.router)


@app.get("/health")
async def health():
    return {"ok": True}
