# Typing Mastery App

Monorepo with:
- `apps/web`: React + TypeScript + Tailwind frontend
- `apps/api`: Express + TypeScript API
- `services/handwriting`: Flask handwriting service (optional)
- `packages/shared`: Shared DTO types

## Quick start

1. Copy `.env.example` to `.env` and adjust values.
2. Install dependencies from the repo root:

```bash
npm install
```

3. Start services (single command):

```bash
npm run dev
```

Frontend runs on `http://localhost:5173` and the API on `http://localhost:4000`.

## Demo account

On API startup, a demo user is seeded if `DEMO_SEED=true`.
Defaults are:

- Email: `demo@typing.local`
- Password: `demo12345`

To force-reset the demo user in the database:

```bash
npm run reset:demo
```
