from datetime import datetime

from pydantic import BaseModel, Field


class ProductIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = ""
    price: float = Field(gt=0)
    image: str = ""
    stock: int = Field(ge=0)
    category: str = "general"


class ProductUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    price: float | None = Field(default=None, gt=0)
    image: str | None = None
    stock: int | None = Field(default=None, ge=0)
    category: str | None = None


class ProductOut(ProductIn):
    id: str
    created_at: datetime
