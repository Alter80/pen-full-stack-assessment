# SMS Registry

A focused implementation of the four workflows a university Registry Administrator uses daily: **Student Enrolment**, **Fees & Payments**, **Assessment Submission**, and **Marksheet & Results**.

Built for the PEN Global technical assessment. See [`plan.md`](plan.md) for the original design plan this was built from.

## Tech Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL** + **Prisma ORM**
- **Tailwind CSS** + **shadcn/ui**
- **zod** for input validation

## Getting Started

Requires Node 20+ and Docker Desktop.

```bash
# 1. Install dependencies
npm install

# 2. Copy environment variables
cp .env.example .env

# 3. Start PostgreSQL (Docker)
docker compose up -d

# 4. Run migrations
npx prisma migrate dev

# 5. Seed demo data
npx prisma db seed

# 6. Start the app
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). There's no login — you'll land on a role picker where you choose **Staff** or, as a **Student**, which seeded student to view as.

Convenience scripts are also available: `npm run db:up`, `npm run db:migrate`, `npm run db:seed`, `npm run db:studio`.

### Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. The default in `.env.example` matches `docker-compose.yml` out of the box. |

**Note on the Postgres port:** `docker-compose.yml` maps the container to host port **5433**, not the default 5432. On this dev machine, a pre-existing native Postgres service was already bound to 5432, silently swallowing every connection meant for the container — using 5433 avoids that class of conflict entirely. If port 5433 is also taken on your machine, change it in both `docker-compose.yml` and `.env`.

## How the App Is Organized

No authentication — a Staff/Student toggle (cookie-based) stands in for login, as the brief allows. Staff can do everything; a Student session is scoped to one student's own data.

```
/staff                    Dashboard - status counts, overdue balances, unpublished-grade count
/staff/students           Search & filter students
/staff/students/new       Enrol a student
/staff/students/[id]      Profile, fee ledger + record payment
/staff/programmes         Programmes (fee source of truth)
/staff/assessments        Create assessments
/staff/assessments/[id]   Submissions + grade entry/publish

/student                  Dashboard - balance, open assessments, published results
/student/fees             Balance + payment history (read-only)
/student/assessments      Submit / resubmit coursework
/student/results          Published marksheet only
```

Every mutation (create/update) goes through a real API route under `/api/*`; pages read data straight from Prisma in Server Components. Search/filter logic (`lib/students.ts`) is shared between the `GET /api/students` route and the `/staff/students` page itself, so the two can't drift apart.

## Data Model

`prisma/schema.prisma` has six models: `Programme`, `Student`, `Payment`, `Assessment`, `Submission`, `Grade`. A few decisions worth calling out, because they shape how "correct" the app is against how a real Registry actually operates:

- **`Assessment.programmeId`** — not in the brief, but without it every student would see every assessment system-wide, regardless of programme. This felt like the most important gap to close.
- **`Student.feeAmount`** is a **snapshot** taken from the programme's fee at enrolment time, not a live lookup. If a programme's fee changes later, existing students' bills shouldn't silently move.
- **`Student.feeDueDate`** — the brief asks to "flag students with an overdue balance" but never defines *overdue*. I added a due date (enrolment + 30 days by default, staff-editable) as the simplest explicit definition, rather than a silent hardcoded rule.
- **No hard deletes** anywhere. A registry doesn't erase a student's financial or academic history — status changes (→ Withdrawn) are how records get "removed."
- **Classification and "late" are computed on read**, not stored columns. If a deadline or score changes later, a stored flag could go stale and quietly lie; deriving it can't.

## Product Decisions on Ambiguous Rules

The brief deliberately leaves some behavior open. Here's what I chose and why:

**Overdue fees.** `outstanding balance > 0 AND today > feeDueDate`, computed live. Deliberately **not** filtered by enrolment status — a Withdrawn student who still owes money is exactly what a Registry dashboard should keep surfacing for collections follow-up, not hide because they're no longer "active." (Seed data: Emma Wright is Withdrawn *and* overdue, on purpose.)

**Late submissions vs. resubmission.** The brief says "late submissions are accepted but visually flagged," which only makes sense if a first-ever submission can happen after the deadline. So: if no submission exists yet, a student can submit any time, flagged late if it's past the deadline. Once a submission *exists*, it can only be replaced while `now <= deadline` — after that it's locked (a `409` with a clear message, not a silent no-op). A first late submission is accepted; a resubmission attempt after the deadline is not.

**Non-active students can't create new submissions.** Deferred and Withdrawn students are blocked from submitting new coursework (`403`), but their historical submissions and grades stay fully visible. The brief never says this explicitly — it felt like the kind of thing a real registrar would assume without being asked.

**Student ID generation.** `SMS-{year}-{4-digit sequence}`, computed by counting existing IDs for that year. On the rare chance two creations race and collide, the create route catches that specific Prisma unique-constraint error and retries with a freshly generated ID (up to 3 times) rather than surfacing a raw failure.

**Grade changes auto-unpublish.** If staff corrects an already-published score, it's set back to withheld automatically. A corrected grade shouldn't keep showing to a student without staff deliberately re-publishing it.

**Withheld results never leak the score.** The student-facing results page runs a query that only ever *fetches* the score for grades where `isPublished: true`; a withheld grade's score is never pulled into the page's data at all, not just hidden in the rendered output. I verified this by inspecting the actual HTML response for a withheld grade before and after publishing it — the score genuinely isn't present until publish.

## Error Handling

All API routes funnel errors through `lib/api-error.ts`:
- Zod validation failures → `400` with field-level messages.
- Prisma unique-constraint violations (duplicate email, duplicate payment reference, double submission/grade) → `409` with a plain-English message, not a raw stack trace.
- Not-found records → `404`.
- Everything else → logged server-side, `500` with a generic message.

Mutating routes also check role via `requireStaff()` / `requireStudent()` (`lib/session.ts`) — e.g. a student session can't hit `POST /api/students`, and a file download is only served to staff or the submission's own student.

## Seed Data

`prisma/seed.ts` seeds 2 programmes and 8 students deliberately spanning every status and fee state, because the grading process reviews through the UI — logic that's correct but invisible in the seed data doesn't count for much:

| State | Who |
|---|---|
| Enrolled / Deferred / Withdrawn / Completed | all 4 statuses represented |
| Fully paid | Alice, Daniel, Farid, Grace |
| Partially paid, overdue | Ben |
| Unpaid, **not yet** due | Chloe |
| Unpaid, overdue (incl. a Withdrawn student) | Emma, Harun |
| On-time / late / no submission | across 3 assessments |
| Published grades (Fail/Pass/Merit/Distinction span) | Alice ×2, Ben |
| Withheld grade | Grace |

Submission files are genuinely valid single-page PDFs (correct xref tables), generated in the seed script itself, so they open normally when downloaded rather than being placeholder text.

## Known Limitations

Scoped deliberately for a focused build, not oversights:
- No automated tests — time went into a manual QA pass across both roles instead (see below).
- No pagination on the students/assessments lists — fine at seed-data scale, would need it in production.
- Uploaded files live on local disk (`/uploads`, gitignored) rather than object storage — appropriate for a local/dev deployment, would move to S3-equivalent storage in production.
- Amounts are shown as plain formatted numbers — the brief never specifies a currency, so I avoided assuming one rather than guessing.

## Manual QA Performed

Verified end-to-end against the running dev server (not just read through) — student creation with sequential ID generation, duplicate email/payment-reference/grade rejected with a clean `409`, invalid input rejected with `400` and field errors, status/role-gated redirects, first-time late submission accepted, resubmission blocked after deadline, non-enrolled student blocked from submitting, non-PDF/DOCX rejected, file access restricted to staff/owner, cross-programme grading rejected, and — read directly off the HTML response — a withheld grade's score is genuinely absent from the page until published.

## AI Usage

This project was built with **Claude Code** (Anthropic), used throughout rather than for one-off snippets. Documenting it honestly, as asked:

- **Planning first.** Before writing code, I had it read the assessment PDF and produce a written plan (schema, route map, build order, and — most importantly — a explicit list of the ambiguous rules the brief leaves open, with a reasoned decision for each) for me to review before implementation started. That plan is [`plan.md`](plan.md) in this repo.
- **Schema and architecture were discussed, not dictated.** I had it critique its own first-draft schema against "how does a Registry team actually work" before settling on it — that's where `Assessment.programmeId` and the fee-snapshot decision came from, not from the brief directly.
- **Implementation.** All application code — schema, API routes, pages, components, validation, seed data — was generated by Claude Code, working through the plan's build order phase by phase (Enrolment → Fees → Submissions → Grades → edge cases → docs), with a working build/dev-server check at each phase boundary rather than one big untested drop.
- **Real debugging, not just generation.** Docker Postgres initially failed to authenticate from the host. Rather than guessing, it diagnosed the actual cause by testing the connection from multiple network paths (container-internal vs. host-forwarded) and discovered a native Postgres service already occupying port 5432 on this machine — the fix was moving the container to port 5433, which is documented above rather than hidden.
- **Verification, not just trust.** Every business rule in "Product Decisions" above was exercised against the running app via real HTTP requests (not just read from the code) — including deliberately inspecting the raw HTML response to confirm a withheld grade's score truly isn't present before publish, which is the kind of check that's easy to skip and easy to get subtly wrong.
- **Where I stayed hands-on:** I read and approved the plan before any code was written, checked in at each phase boundary rather than letting it run unsupervised end-to-end, and asked for this README to lay out the reasoning explicitly so I could review it — including the finished set of product decisions above — rather than taking the implementation on faith.

I directed the design and reviewed the output at each stage; Claude Code did the implementation and the lower-level judgment calls (formatting choices, file layout, exact error wording) within that direction.
