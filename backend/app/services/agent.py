"""AI support agent. LangChain agent + Gemini + 3 tools that read our DB.

Tools are built per-request so the caller's user_id is baked in.
That way the agent can never read another customer's orders.
"""

from bson import ObjectId
from langchain.agents import create_agent
from langchain_core.tools import tool
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import settings
from app.db import orders, products
from app.models.common import to_object_id

SYSTEM_PROMPT = """You are a friendly support assistant for Moksha Mini Shop.
Always use the tools to look up real product and order data. Never guess prices or stock.
If you cannot find something, say so clearly. Keep answers short. Prices are in INR (₹)."""


def _make_tools(user_id: ObjectId | None):
    """Return tool list bound to this user."""

    @tool
    async def list_products() -> str:
        """List all products currently in the store with price and stock."""
        docs = await products.find().to_list(100)
        if not docs:
            return "No products available right now."
        lines = [
            f"- {d['name']}: ₹{d['price']} ({'in stock: ' + str(d['stock']) if d['stock'] > 0 else 'out of stock'})"
            for d in docs
        ]
        return "\n".join(lines)

    @tool
    async def get_product_info(name: str) -> str:
        """Get price, stock and description for a product by name (partial match ok)."""
        doc = await products.find_one({"name": {"$regex": name, "$options": "i"}})
        if doc is None:
            return f"No product matching '{name}'."
        return (
            f"{doc['name']} — ₹{doc['price']}. Stock: {doc['stock']}. "
            f"{doc.get('description', '')}"
        )

    @tool
    async def get_my_orders() -> str:
        """List the current customer's orders with status. Requires login."""
        if user_id is None:
            return "The customer is not logged in. Ask them to sign in to see orders."
        docs = await orders.find({"user_id": user_id}).sort("created_at", -1).to_list(20)
        if not docs:
            return "This customer has no orders yet."
        lines = []
        for d in docs:
            items = ", ".join(f"{i['name']} x{i['quantity']}" for i in d["items"])
            lines.append(f"- Order {d['_id']}: {d['status']}, ₹{d['total']} ({items})")
        return "\n".join(lines)

    @tool
    async def get_order_status(order_id: str) -> str:
        """Get the status of one order by its id. Only works for the current customer's orders."""
        if user_id is None:
            return "The customer is not logged in."
        try:
            oid = to_object_id(order_id)
        except ValueError:
            return "That does not look like a valid order id."
        doc = await orders.find_one({"_id": oid, "user_id": user_id})
        if doc is None:
            return "No such order for this customer."
        return f"Order {order_id} is '{doc['status']}'. Total ₹{doc['total']}."

    return [list_products, get_product_info, get_my_orders, get_order_status]


def _build_agent(user_id: ObjectId | None):
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.5-flash",
        google_api_key=settings.gemini_api_key,
        temperature=0,
    )
    return create_agent(llm, tools=_make_tools(user_id), system_prompt=SYSTEM_PROMPT)


async def ask_agent(message: str, history: list[dict], user_id: ObjectId | None) -> str:
    """Run one turn. `history` is [{role, content}] from the frontend."""
    agent = _build_agent(user_id)
    messages = [*history, {"role": "user", "content": message}]
    result = await agent.ainvoke({"messages": messages})
    last = result["messages"][-1]
    # Gemini may return content as a list of parts
    if isinstance(last.content, list):
        return "".join(p.get("text", "") for p in last.content if isinstance(p, dict))
    return last.content
