# FinanceFlow MVP
FinanceFlow is a Next.js MVP that helps users understand spending from uploaded bank statement PDFs and build an optional debt payoff plan.

## MVP features
- Email/password authentication with credentials login and 15-minute sessions.
- User registration with password strength requirements.
- PDF bank statement upload and parsing pipeline (PDF text extraction + transaction heuristics).
- Automatic transaction categorization and spending analytics.
- Dashboard views for spending trends and transaction insights.
- Debt onboarding with:
  - Manual debt entry
  - Auto-suggested debt-like recurring payments for user confirmation/rejection
- Debt payoff planning with snowball vs avalanche comparison.
- Configurable extra monthly payment and strategy override tracking.
- Alerts for spending spikes, disposable income changes, and plan-impact events.
- Theme and accessibility settings (light/dark/system + high contrast).
- Stripe checkout endpoint stub for subscription billing.
- Audit log persistence for key actions.

## Tech stack
- **Framework:** Next.js 15 (App Router), React 19, TypeScript
- **Styling/UI:** Tailwind CSS, Recharts, Lucide icons
- **Auth:** NextAuth (credentials provider, JWT session strategy)
- **Database:** Prisma + SQLite
- **Parsing:** `pdf-parse`
- **Billing:** Stripe SDK (optional, env-gated)

## Project structure (high level)
- `src/app` — routes, pages, and API handlers
- `src/lib` — parsing, analytics, debt strategy, and shared utilities
- `src/components` — reusable UI components
- `prisma/schema.prisma` — data model definitions

## Prerequisites
- Node.js 20+ (recommended)
- npm (or compatible package manager)

## Environment setup
1. Copy environment variables:
   - `cp .env.example .env`
2. Set required values in `.env`:
   - `DATABASE_URL` (default SQLite is preconfigured)
   - `AUTH_SECRET` (required for NextAuth)
   - `NEXTAUTH_URL` (for local dev: `http://localhost:3000`)
3. Optional Stripe values (for checkout):
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`

`AUTH_SECRET` generation example:
```bash
openssl rand -base64 32
```

## Installation
```bash
npm install
```

## Database setup
Push the Prisma schema to the local SQLite database:
```bash
npm run db:push
```

Optional DB UI:
```bash
npm run db:studio
```

## Run locally
Start development server:
```bash
npm run dev
```

Open `http://localhost:3000` and follow the onboarding flow:
1. Create account
2. Upload one or more bank statement PDFs
3. Confirm/add debts (optional)
4. Review dashboard and payoff plan

## Build and production run
```bash
npm run build
npm run start
```

## Available scripts
- `npm run dev` — run Next.js dev server (Turbopack)
- `npm run build` — generate Prisma client and build app
- `npm run start` — run production server
- `npm run lint` — run ESLint
- `npm run db:push` — push Prisma schema to DB
- `npm run db:studio` — open Prisma Studio

## Notes and limitations (MVP)
- Statement parsing uses heuristics and may require cleaner/exported digital PDFs for best results.
- Raw PDF files are parsed in memory; structured transaction rows are persisted.
- Stripe flow is intentionally disabled unless Stripe env vars are configured.

## Security and privacy (current MVP behavior)
- Passwords are hashed with bcrypt.
- Sessions use short-lived JWTs.
- Authentication and key actions are recorded in audit logs.
- Do not use this MVP as a regulated financial product without additional hardening, compliance work, and production security controls.
