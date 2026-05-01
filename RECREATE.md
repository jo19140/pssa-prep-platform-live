# Re-create `pssa-prep-platform-live`

This guide rebuilds the platform in a fresh environment from source.

## 1) Prerequisites
- Node.js 20+
- npm 10+
- PostgreSQL 14+
- Git

## 2) Clone and install
```bash
git clone <your-fork-or-repo-url> pssa-prep-platform-live
cd pssa-prep-platform-live
npm install
```

## 3) Environment setup
Create `.env` from the example and fill values:
```bash
cp .env.example .env
```

Required values:
- `DATABASE_URL` (PostgreSQL connection string)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL` (usually `http://localhost:3000`)
- `CRON_SECRET`

Optional:
- `RESEND_API_KEY` (email provider key)

## 4) Database bootstrap
```bash
npm run db:generate
npm run db:push
npm run db:seed
```

## 5) Run locally
```bash
npm run dev
```
Then open: `http://localhost:3000`

## 6) Verify core flows
1. Login as each role:
   - `admin@example.com / Password123!`
   - `teacher@example.com / Password123!`
   - `student@example.com / Password123!`
   - `parent@example.com / Password123!`
2. Student: complete an adaptive assessment and view report.
3. Teacher: create an assignment and confirm growth charts render.
4. Parent: open the parent dashboard and confirm student summary appears.
5. Admin: open admin dashboard and confirm high-level metrics load.

## 7) Production recreation checklist
- Set secure production values for all secrets.
- Run schema sync/migrations against managed Postgres.
- Set `NEXTAUTH_URL` to public domain.
- Configure cron caller with `Authorization: Bearer $CRON_SECRET` for scheduled reports endpoint.
- Configure email sender (`RESEND_API_KEY`) and verify outbound messages.

## 8) One-command recreation (optional)
For development environments with a ready `.env`:
```bash
npm install && npm run db:generate && npm run db:push && npm run db:seed && npm run dev
```

---
If you want, I can also generate:
- a Docker Compose recreation path, and/or
- a cloud deployment recreation runbook (Vercel + Neon/Supabase).
