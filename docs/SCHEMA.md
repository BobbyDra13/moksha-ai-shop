# Database Schema (MongoDB)

Database: `moksha_shop`. Three collections.

## users
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| google_sub | string | Google's stable user id. Unique index |
| email | string | Lowercased. Unique index |
| name | string | |
| picture | string \| null | Google avatar URL |
| role | "customer" \| "admin" | Admin if email in `ADMIN_EMAILS` at first login |
| created_at | datetime | |

## products
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| name | string | |
| description | string | |
| price | number | USD (set CURRENCY env) |
| image | string | URL |
| stock | int | >= 0. Decremented when order becomes `paid` |
| category | string | |
| created_at | datetime | |

## orders
| Field | Type | Notes |
|---|---|---|
| _id | ObjectId | |
| user_id | ObjectId | Index. Owner |
| items | array | Snapshot: `{product_id, name, price, quantity}` |
| total | number | Sum at creation time |
| status | "pending" \| "paid" \| "failed" \| "cancelled" | |
| stripe_session_id | string \| null | Index. Set when checkout starts |
| created_at | datetime | |
| updated_at | datetime | |

## Status transitions
```
pending --(webhook checkout.session.completed / verify)--> paid
pending --(user hits cancel URL)------------------------> cancelled
pending --(webhook session.expired / payment failed)----> failed
admin can set any status manually
```

Prices and names are snapshotted into the order so later product edits do not change history.
