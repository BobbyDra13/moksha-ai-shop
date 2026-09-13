# System Design — Moksha Mini Shop

## Architecture

```mermaid
flowchart LR
  subgraph Client
    FE[React + Vite\nTailwind + shadcn]
  end

  subgraph Google
    GIS[Google Identity\nID token]
  end

  subgraph Backend[FastAPI on Render]
    API[REST routers\nauth / products / orders / payments / chat]
    RBAC[deps.py\nJWT verify + role check]
    SVC[services\norders · stripe · agent]
    AGENT[LangChain agent\nGemini (gemini-3.6-flash, configurable)\n4 tools]
  end

  DB[(MongoDB Atlas\nusers · products · orders)]
  STRIPE[Stripe Checkout\n+ Webhook]

  FE -- "1. sign in" --> GIS
  GIS -- "ID token" --> FE
  FE -- "2. POST /auth/google" --> API
  API -- "verify token" --> GIS
  API --> RBAC --> SVC --> DB
  FE -- "3. cart → /orders → /payments/checkout" --> API
  API -- "create session" --> STRIPE
  STRIPE -- "redirect" --> FE
  STRIPE -- "4. webhook (signed)" --> API
  FE -- "5. /chat" --> API --> AGENT
  AGENT -- "tools read" --> DB
```

## Key flows

**Auth.** Frontend gets a Google ID token via GIS. Backend verifies it with Google's public keys, upserts the user, and issues its own 7-day HS256 JWT containing `sub` + `role`. Every protected route runs `get_current_user`; admin routes run `require_admin`. Role lives in DB, not just the token, so role changes take effect on next request.

**Payment.** Order is created `pending` after stock validation. Backend creates a Stripe Checkout session with `order_id` in metadata. Stripe redirects back. Two paths mark it paid: the signed webhook (source of truth) and `/payments/verify` on the success page (covers webhook lag; re-queries Stripe, never trusts the redirect). `mark_paid` is idempotent and only then decrements stock.

**AI agent.** LangChain `create_agent` + Gemini. Tools are created per request with the caller's `user_id` closed over, so order lookups are scoped and the model cannot query another user. Tools hit the service/DB layer directly — same process, no extra HTTP hop.

## Deployment

| Piece | Where | Why |
|---|---|---|
| Frontend | Vercel | Static build, global CDN, free |
| Backend | Render web service | Public HTTPS for Stripe webhook, free tier |
| DB | MongoDB Atlas M0 | Managed, free |
| Secrets | Platform env vars | Never in repo |

**AWS equivalent:** S3 + CloudFront (frontend), ECS Fargate or App Runner behind ALB (backend), DocumentDB or Atlas on AWS (DB), Secrets Manager, CloudWatch logs.

## Scaling — if users and AI requests grow significantly

1. **Backend is stateless** (JWT, no sessions) → run N replicas behind a load balancer. Auto-scale on CPU/latency.
2. **Database** → Atlas dedicated tier, read replicas, indexes already on `user_id`, `stripe_session_id`, `email`. Product catalogue cached in Redis (TTL 60s) since it is read-heavy.
3. **Stock race** → move to atomic `find_one_and_update` with `stock >= qty` filter, or reserve stock with a TTL at order creation and release on expiry.
4. **Stripe webhooks** → push events onto a queue (SQS) and ack immediately; a worker processes them. Handles bursts and retries safely because `mark_paid` is idempotent.
5. **AI requests** are the expensive part:
   - Move `/chat` to an async worker pool; stream responses over SSE.
   - Cache tool outputs (product list) and cache identical questions briefly.
   - Rate-limit per user. Cap history length (already last 10 turns).
   - Use a cheaper model for simple intents; route only complex questions to a bigger model.
   - Keep the LLM key on the server; never expose to the browser.
6. **Observability** → structured logs, request ids, LangSmith or OpenTelemetry traces for agent runs, Stripe dashboard alerts on failed webhooks.
7. **CDN + image optimisation** for product images.
