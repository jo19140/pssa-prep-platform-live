# PSSA Prep Platform MVP

This is a full-stack Next.js starter for an adaptive PSSA-style assessment platform.

## Included
- Next.js App Router + TypeScript + Tailwind
- Prisma + PostgreSQL
- NextAuth credentials login
- Roles: admin, teacher, student, parent
- Adaptive student assessment flow
- MCQ, EBSR, Hot Text, Multi-Select, Drag-and-Drop
- Student report + standards mastery + growth
- Teacher dashboard + assignment creation + growth charts
- Admin dashboard
- Parent portal + email summary endpoint
- Scheduled reports job endpoint

## Setup
```bash
npm install
cp .env.example .env
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

Open http://localhost:3000

## Demo logins
- admin@example.com / Password123!
- teacher@example.com / Password123!
- student@example.com / Password123!
- parent@example.com / Password123!

## Notes
- Email sending falls back to console logs unless `RESEND_API_KEY` is set.
- Scheduled reports endpoint expects `Authorization: Bearer $CRON_SECRET`.
- This is a strong MVP starter, but you should expect a few integration/polish steps after first local run.
- Branch workflow smoke test note.


## Re-create
See `RECREATE.md` for a clean-environment rebuild checklist and validation flow.
