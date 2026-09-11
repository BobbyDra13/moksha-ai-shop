from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.config import settings

client = AsyncIOMotorClient(settings.mongo_uri)
db: AsyncIOMotorDatabase = client[settings.db_name]

users = db["users"]
products = db["products"]
orders = db["orders"]


async def create_indexes():
    await users.create_index("google_sub", unique=True)
    await users.create_index("email", unique=True)
    await orders.create_index("user_id")
    await orders.create_index("stripe_session_id")
