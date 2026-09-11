from bson import ObjectId


def to_object_id(value: str) -> ObjectId:
    """Convert string to ObjectId. Raises ValueError if invalid."""
    if not ObjectId.is_valid(value):
        raise ValueError("Invalid id")
    return ObjectId(value)


def serialize(doc: dict) -> dict:
    """Turn a Mongo document into a JSON-safe dict with `id` as string."""
    if doc is None:
        return None
    out = dict(doc)
    out["id"] = str(out.pop("_id"))
    for key, val in out.items():
        if isinstance(val, ObjectId):
            out[key] = str(val)
    return out
