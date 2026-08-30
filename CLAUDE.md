# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## What this is

SMS Registry — a deliberately scoped implementation of the four workflows a university Registry
Administrator uses daily: **Student Enrolment**, **Fees & Payments**, **Assessment Submission**,
**Marksheet & Results**. Built for the PEN Global technical assessment. `plan.md` is the original
design doc and `README.md` documents the product decisions on rules the brief left ambiguous —
read both before changing behavior, since many "odd" choices are intentional and graded.

## Commands

```bash
npm run dev          # next dev (also rewrites the managed block in AGENTS.md — commit it with your work)
npm run build        # prisma generate && next build
npm run lint         # eslint (flat config, eslint-config-next)
npm run db:up        # docker compose up -d  — local Postgres on host port 5433
npm run db:migrate   # prisma migrate dev
npm run db:seed      # prisma db seed  → tsx prisma/seed.ts
npm run db:studio    # prisma studio
```

There is **no test framework** — verification is a manual QA pass through both roles (see the
"Manual QA Performed" section of `README.md`). Don't add a test runner unless asked.

`npm run db:seed` is **destructive**: it truncates every table and deletes the `uploads/`
directory before reseeding. It targets whatever `DATABASE_URL` points at (see below).

## Environment / database

- Prisma config lives in `prisma.config.ts` (not `package.json`). It reads `process.env.DATABASE_URL`
  directly (via `dotenv/config`) so `prisma generate` can run at build time on Vercel with no DB.
  `DIRECT_URL` is used for migrations when `DATABASE_URL` is a pooled connection (Neon); it falls
  back to `DATABASE_URL` for plain local Postgres.
- `docker-compose.yml` maps Postgres to **host port 5433** (not 5432) to dodge a native Postgres
  install. For local Docker use, `DATABASE_URL="postgresql://sms:sms@localhost:5433/sms"`.
- `.env` is gitignored and currently points at a hosted **Neon** database, which is what the
  deployed Vercel app and local `prisma` commands hit by default. `README.md` still references a
  `cp .env.example .env` step, but `.env.example` was removed from the repo — there is no template
  file to copy.
- `prisma generate` runs on `postinstall` and in `build`.

## Architecture

### Roles instead of auth
No auth library. `lib/session.ts` reads two cookies: `sms_role` (`staff` | `student`) and, for a
student, `sms_student` (the acting student's DB id). Cookies are set only by Server Actions in
`app/actions.ts` (from the `/` role picker). Helpers: `getSession()`, `requireStaff()`,
`requireStudent()`. `app/staff/layout.tsx` and `app/student/layout.tsx` each gate their whole
subtree by redirecting to `/` on a role mismatch — there is no `middleware.ts`, and each API route
does its own check.

### Reads vs. mutations
- **Pages are Server Components that call Prisma directly** for reads.
- **Every create/update goes through an `/api/*` route handler**, called from `"use client"` form
  components via `fetch`. There are no DELETE endpoints — a registry never hard-deletes financial
  or academic history; status changes stand in for removal.
- Domain logic lives in `lib/` specifically so a page and its matching API route share one code
  path and can't drift — e.g. `lib/students.ts#listStudents` backs both the `/staff/students` page
  and `GET /api/students`.

### API route shape
Every handler follows:
```ts
export async function POST(request, { params }) {
  const { id } = await params;              // params is a Promise in this Next version
  try {
    await requireStaff();                   // or requireStudent()
    const input = someZodSchema.parse(await request.json());
    // ... call a lib/ function ...
    return NextResponse.json({ ... }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
```
`lib/api-error.ts#errorResponse` is the single funnel: `ZodError` → 400 with field errors,
Prisma `P2002` → 409 ("A record with this X already exists."), `P2025` → 404, `ApiError` → its own
status, anything else → logged + generic 500. Throw `new ApiError(status, msg)` for deliberate,
expected failures (e.g. a locked resubmission). Zod schemas are all in `lib/validation.ts`.

### Client forms
`"use client"` + manual `fetch` + `useState` for `errors` (from `data.details`, flattened Zod
`fieldErrors`) and `formError` (from `data.error`); `sonner` `toast` on success; then
`router.push(...)` + `router.refresh()`.

### Money and derived values
- All fee arithmetic uses `Prisma.Decimal` (`lib/fees.ts`), never JS floats. Convert to `number`
  (`.toNumber()`) only at the JSON/props boundary.
- **Computed on read, never stored as columns**: grade classification (`lib/classification.ts`),
  submission `isLate` (`lib/submissions.ts`), outstanding balance + overdue flag (`lib/fees.ts`).
  Keep it that way so nothing goes stale against a later score/deadline/fee edit.

### File uploads
Stored on local disk at `<cwd>/uploads/<assessmentId>/<studentDbId>.<ext>`, outside `public/` so
they are never statically served. The only way to read one back is `GET /api/files/[submissionId]`,
which enforces staff-or-owning-student. PDF/DOCX only, 10 MB max (`lib/uploads.ts`). Local disk
does not persist on Vercel — a known, documented limitation.

### Key business rules (don't "fix" these — they're intentional)
- **Overdue** = `balance > 0 AND today > feeDueDate`, computed live, **not** filtered by enrolment
  status (a withdrawn debtor still shows on the dashboard).
- A student's **first** submission is always accepted, even after the deadline, and flagged late.
  Once a submission exists, replacing it is allowed only while `now <= deadline`, else `409`.
- Only `ENROLLED` students may create new submissions; deferred/withdrawn keep read access.
- Editing a grade's score auto-sets `isPublished = false` (`lib/grades.ts`).
- Withheld grades: `app/student/results/page.tsx` only ever `select`s `score` for
  `isPublished: true` rows — the score is absent from the page's data, not just hidden in markup.
- Student IDs: `SMS-{year}-{4-digit sequence}` by counting existing rows for the year; on a `P2002`
  collision, regenerate and retry up to 3× (`lib/students.ts`, `lib/student-id.ts`).

## Conventions

- Path alias `@/*` → repo root.
- UI is shadcn/ui in the **`base-nova`** style, built on **`@base-ui/react`** (not Radix). Slot
  composition uses a `render` prop, e.g. `<Button render={<Link href="/" />}>`, not `asChild`.
- This is Next.js 16 with breaking changes from older versions — heed `AGENTS.md` and consult
  `node_modules/next/dist/docs/` (`01-app`, `03-architecture`) before writing framework code.
  Dynamic `params` in pages and route handlers are Promises and must be awaited.
