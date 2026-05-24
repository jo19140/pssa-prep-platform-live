# Sýnesis Learning Platform

Sýnesis is an AI-powered standards-based mastery and intervention platform for grades 3-8. The Pennsylvania PSSA ELA implementation remains the first supported state-specific module, but shared product surfaces should use broader mastery, growth, diagnostic, intervention, and learning-path language.

This is a full-stack Next.js application for standards-aligned diagnostics, personalized learning paths, targeted practice, progress checks, and tutor/interventionist workflows.

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

## Phonogram Inventory Pipeline

The reproducible v2 phonogram content build lives in `scripts/phonogram/`; documentation is in [docs/phonogram.md](docs/phonogram.md).

Run:

```bash
make phonogram
python3 -m pytest scripts/phonogram/tests/
```

The build writes regenerable outputs to `data/phonogram/`:

- `cmudict.{json,csv,sqlite}`: normalized CMUdict pronunciations with ARPABET, IPA, syllables, and stress.
- `subtlex.{json,csv,sqlite}`: SUBTLEX-US frequencies, Zipf scores, POS fields, and polluted-entry flags.
- `awl.{json,csv,sqlite}`: Coxhead AWL headwords, sublists, and word-family forms.
- `alignment.{json,csv,sqlite}`: Phonetisaurus-derived grapheme-to-phoneme alignments joined by word and pronunciation variant.
- `phonogram.sqlite`: combined local SQLite database for downstream seeding.


## Re-create
See `RECREATE.md` for a clean-environment rebuild checklist and validation flow.
