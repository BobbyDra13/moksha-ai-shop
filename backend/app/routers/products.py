from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from app.db import products
from app.deps import require_admin
from app.models.common import serialize, to_object_id
from app.models.product import ProductIn, ProductOut, ProductUpdate

router = APIRouter(prefix="/products", tags=["products"])


@router.get("", response_model=list[ProductOut])
async def list_products():
    """Public. Anyone can browse."""
    docs = await products.find().sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]


@router.get("/{product_id}", response_model=ProductOut)
async def get_product(product_id: str):
    doc = await _find_or_404(product_id)
    return serialize(doc)


@router.post("", response_model=ProductOut, status_code=201)
async def create_product(body: ProductIn, _: dict = Depends(require_admin)):
    doc = body.model_dump()
    doc["created_at"] = datetime.now(timezone.utc)
    result = await products.insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize(doc)


@router.patch("/{product_id}", response_model=ProductOut)
async def update_product(
    product_id: str, body: ProductUpdate, _: dict = Depends(require_admin)
):
    changes = body.model_dump(exclude_none=True)
    if not changes:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nothing to update")
    await _find_or_404(product_id)
    await products.update_one({"_id": to_object_id(product_id)}, {"$set": changes})
    return serialize(await products.find_one({"_id": to_object_id(product_id)}))


@router.delete("/{product_id}", status_code=204)
async def delete_product(product_id: str, _: dict = Depends(require_admin)):
    await _find_or_404(product_id)
    await products.delete_one({"_id": to_object_id(product_id)})
    return None


async def _find_or_404(product_id: str) -> dict:
    try:
        oid = to_object_id(product_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    doc = await products.find_one({"_id": oid})
    if doc is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Product not found")
    return doc
