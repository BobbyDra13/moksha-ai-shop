"""Insert demo products. Run: uv run python seed.py"""

import asyncio
from datetime import datetime, timezone

from app.db import products

DEMO = [
    ("Wireless Headphones", "Over-ear, noise cancelling, 30h battery.", 2999, 25, "audio",
     "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600"),
    ("Mechanical Keyboard", "Compact 75% layout, hot-swappable switches.", 4499, 12, "accessories",
     "https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=600"),
    ("Smart Watch", "AMOLED display, heart-rate and sleep tracking.", 5999, 8, "wearables",
     "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"),
    ("USB-C Hub", "7-in-1 with HDMI, SD and 100W passthrough.", 1899, 40, "accessories",
     "https://images.unsplash.com/photo-1625948515291-69613efd103f?w=600"),
    ("Desk Lamp", "Warm/cool LED, touch dimmer, USB charging port.", 1299, 30, "home",
     "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=600"),
    ("Bluetooth Speaker", "Waterproof, 12h playtime, deep bass.", 2499, 0, "audio",
     "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=600"),
]


async def main():
    await products.delete_many({})
    docs = [
        {
            "name": n, "description": d, "price": p, "stock": s, "category": c, "image": img,
            "created_at": datetime.now(timezone.utc),
        }
        for n, d, p, s, c, img in DEMO
    ]
    await products.insert_many(docs)
    print(f"Seeded {len(docs)} products")


asyncio.run(main())
