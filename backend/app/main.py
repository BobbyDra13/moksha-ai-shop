import asyncio
import logging
from contextlib import asynccontextmanager

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import create_indexes
from app.routers import auth, chat, orders, payments, products


log = logging.getLogger("uvicorn.error")


async def _keep_alive():
    """Ping our own /health so the free-tier instance never sleeps.
    Stripe gives a webhook ~10s; a cold start here takes ~50s."""
    url = f"{settings.keep_alive_url.rstrip('/')}/health"
    async with httpx.AsyncClient(timeout=30) as client:
        while True:
            await asyncio.sleep(10 * 60)
            try:
                await client.get(url)
            except httpx.HTTPError as e:
                log.warning("keep-alive ping failed: %s", e)


@asynccontextmanager
async def lifespan(_: FastAPI):
    await create_indexes()
    task = asyncio.create_task(_keep_alive()) if settings.keep_alive_url else None
    yield
    if task:
        task.cancel()


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
