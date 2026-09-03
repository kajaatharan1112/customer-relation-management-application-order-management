# Subiramaniyam Printing Works

Order management and bill tracking for Subiramaniyam Printing Works. Staff manage
customers, bills and job stages; customers sign in to track their orders and
payments.

This branch (`deploy/subiramaniyam-printing-works`) is the client deployment
branch. It auto-deploys to production on Vercel on every push.

## Release process

1. Feature work is merged into `main`.
2. Open a pull request from `main` into `deploy/subiramaniyam-printing-works`.
3. GitHub Actions runs lint, typecheck, unit tests and a production build.
4. Merge once checks pass — Vercel builds and deploys automatically.

## Configuration

Set in the Vercel project environment:

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Hosted Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon (public) key |
| `VITE_APP_NAME` | Product name shown in the UI (`Subiramaniyam Printing Works`) |

Routing is handled by `vercel.json` (all paths rewrite to `index.html`).
