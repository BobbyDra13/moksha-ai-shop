# API Reference

Base URL: `http://localhost:8000` (local) / Render URL (prod).
Auth: `Authorization: Bearer <jwt>`. JWT issued by `/auth/google`.
Interactive docs: `/docs` (Swagger).

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | /health | – | Liveness |
| POST | /auth/google | – | Body `{credential}` (Google ID token). Returns `{access_token, user}` |
| GET | /auth/me | user | Current user |
| POST | /auth/logout | user | No-op (stateless JWT). 204 |
| GET | /products | – | List products |
| GET | /products/{id} | – | One product |
| POST | /products | admin | Create |
| PATCH | /products/{id} | admin | Partial update |
| DELETE | /products/{id} | admin | Delete. 204 |
| POST | /orders | user | Body `{items:[{product_id, quantity}]}`. Validates stock. Creates `pending` order |
| GET | /orders/me | user | Own orders |
| GET | /orders/{id} | user | Own order (admin: any) |
| GET | /orders | admin | All orders |
| PATCH | /orders/{id}/status | admin | Body `{status}` |
| POST | /payments/checkout/{order_id} | user (owner) | Creates Stripe session. Returns `{checkout_url}` |
| POST | /payments/webhook | Stripe signature | Handles `checkout.session.completed` → paid; expired/failed → failed |
| POST | /payments/verify/{order_id} | user (owner) | Re-checks Stripe session; marks paid if so. Used on success page |
| POST | /payments/cancel/{order_id} | user (owner) | Marks pending order cancelled |
| POST | /chat | optional | Body `{message, history[]}`. Returns `{reply}`. Order tools need auth |

## Error codes
- 401 — missing/invalid token
- 403 — wrong role or not owner
- 404 — resource missing
- 400 — validation / stock / bad webhook signature

## Example
```bash
curl -X POST $API/orders \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"product_id":"66f...","quantity":2}]}'
```
