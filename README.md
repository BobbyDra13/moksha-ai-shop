# Moksha Mini Shop — AI E-Commerce Assignment

Small e-commerce app: Google sign-in, product catalogue, cart, Stripe test checkout, order history, admin panel, and an AI support agent grounded in real product/order data.

**Live:** _TODO frontend URL_ · **API:** _TODO backend URL_

## Stack
- Frontend: React 19, TypeScript, Vite, Tailwind v4, shadcn/ui, react-router
- Backend: Python 3.12, FastAPI, Motor (MongoDB), python-jose (JWT), Stripe SDK
- AI: LangChain 1.x agent + Gemini 2.5 Flash, 4 tools reading the DB
- Auth: Google Identity Services → backend verification → own JWT
- Deploy: Vercel (FE) + Render (BE) + MongoDB Atlas

## Repo layout
```
frontend/   Vite app
backend/    FastAPI app (uv project)
docs/       SCHEMA.md · API.md · SYSTEM_DESIGN.md
```

## Local setup

### 1. Backend
```bash
cd backend
cp .env.example .env      # fill values (see below)
uv sync
uv run python seed.py     # demo products
uv run uvicorn app.main:app --reload --port 8000
```
Swagger at http://localhost:8000/docs

### 2. Frontend
```bash
cd frontend
cp .env.example .env      # VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm install
npm run dev               # http://localhost:5173
```

### 3. Stripe webhook (local)
```bash
stripe listen --forward-to localhost:8000/payments/webhook
# copy the whsec_... into backend/.env STRIPE_WEBHOOK_SECRET
```
Test card `4242 4242 4242 4242`, any future expiry, any CVC.

## Environment variables

**backend/.env**
| Var | Purpose |
|---|---|
| MONGO_URI | Atlas or local URI |
| DB_NAME | default `moksha_shop` |
| JWT_SECRET | random string |
| GOOGLE_CLIENT_ID | OAuth web client id |
| ADMIN_EMAILS | comma list; these become admins on first login |
| STRIPE_SECRET_KEY | `sk_test_...` |
| STRIPE_WEBHOOK_SECRET | `whsec_...` |
| CURRENCY | `usd` default. `inr` needs India Stripe account |
| GEMINI_API_KEY | from AI Studio |
| FRONTEND_URL | for CORS + Stripe redirects |

**frontend/.env**
| Var | Purpose |
|---|---|
| VITE_API_URL | backend base URL |
| VITE_GOOGLE_CLIENT_ID | same client id |

## Features checklist
- [x] Google sign-in, new user registration, existing login, logout
- [x] Protected customer routes (`/orders`, `/checkout/*`) and admin route (`/admin`)
- [x] Product list, product detail, add to cart, quantity capped at stock
- [x] Order creation with server-side stock validation and price snapshot
- [x] Stripe Checkout session, success/cancel handling, signed webhook, backend verification, stock decrement on paid
- [x] Customer sees only own orders; admin manages products and all orders
- [x] Backend-enforced RBAC (401/403), not just UI hiding
- [x] AI support agent answers price / availability / order status via tools

## Business rules
- Stock is validated at order creation and decremented only when payment is confirmed (`paid`). `mark_paid` is idempotent.
- Order items snapshot name + price, so later product edits do not alter history.
- The chat agent's order tools are bound to the logged-in user id; it cannot read other users' orders.

## Docs
- [Database schema](docs/SCHEMA.md)
- [API reference](docs/API.md)
- [System design + scaling](docs/SYSTEM_DESIGN.md)

## Deployment

| Piece | Platform | Notes |
|---|---|---|
| Frontend | Vercel | root `frontend/`, build `npm run build`, output `dist`. `vercel.json` rewrites all routes to `index.html` for react-router |
| Backend | Render web service | root `backend/`, build `pip install uv && uv sync`, start `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Database | MongoDB Atlas M0 | network access open, user with readWrite |
| Stripe webhook | Stripe dashboard → Webhooks | endpoint `https://<backend>/payments/webhook`, events `checkout.session.completed`, `checkout.session.expired` |
| Google OAuth | Cloud Console | add Vercel URL to Authorized JavaScript origins |

See [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) for the AWS equivalent and scaling plan.

## Deliverables map (per assignment brief)

| Asked | Where |
|---|---|
| GitHub repository | this repo |
| Live/demo URL | top of this README |
| README | this file |
| Database schema | [docs/SCHEMA.md](docs/SCHEMA.md) |
| Basic API documentation | [docs/API.md](docs/API.md) + live Swagger at `/docs` |
| One-page system design | [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) |
| Total time taken | below |
| AI tools used | below |

## AI tools used

**Claude Code** (Anthropic, Opus model) inside the terminal.

How it was used:
- Scaffolding: Vite/shadcn setup, FastAPI project layout, boilerplate routers and page components.
- Drafting docs (schema, API table, system design) from the code I had written/reviewed.
- Debugging: e.g. shadcn's newer Base UI `render` prop vs `asChild`, Gemini model rename.
- Running smoke tests against the API (curl scripts for RBAC/stock checks).

What was done manually: architecture and stack decisions, business rules (stock decrement on webhook, price snapshot in orders, per-user agent tools), all third-party account setup, end-to-end testing of Google login, Stripe checkout, webhook and the chat agent. Code was intentionally kept small and plain so every file can be explained.

## Time taken

_~6 hours_ (planning, backend, frontend, integrations, docs, deploy). Detailed log kept during work.
