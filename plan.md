# Student Management System — Registry Module

Implementation plan for the PEN Global technical assessment. Scope is deliberately limited to the four Registry workflows in the brief — this is not a full platform.

## 1. Grading Priorities (what this plan optimizes for)

| Dimension | Weight | What it means for the build |
|---|---|---|
| Stakeholder understanding | 30% | Data model & UI must reflect how a real Registry team works |
| Feature intuition | 30% | Handle edge cases (overdue fees, late submissions, withheld results) without being told |
| Technical quality | 25% | Clean schema, working API routes, basic error handling |
| AI usage | 15% | Documented honestly in the README |

Judgment over volume — small and well-reasoned beats feature-maximal.

## 2. Tech Stack & Local Setup

- **Next.js 14+** (App Router, TypeScript, Tailwind) via `create-next-app`
- **shadcn/ui** for components (forms, tables, badges, tabs, dialogs)
- **PostgreSQL** via `docker-compose.yml` (`postgres:16`) — Docker is already installed locally, no native Postgres or external DB account needed
- **Prisma ORM** — `schema.prisma` committed, migrations tracked
- **zod** for API input validation (small dependency, supports the "basic error handling" grading line)
- **No auth library** — role toggle (Staff / Student) via a cookie set through a Server Action, since auth is explicitly optional
- **No test framework** — time budget instead goes to a manual QA pass through all four workflows as both roles

Run order once scaffolded: `docker compose up -d` → `npx prisma migrate dev` → `npx prisma db seed` → `npm run dev`.

## 3. Data Model

Six models: `Programme`, `Student`, `Payment`, `Assessment`, `Submission`, `Grade`, plus enum `EnrolmentStatus` (ENROLLED, DEFERRED, WITHDRAWN, COMPLETED).

**Deliberate decisions beyond the literal brief** (documented here so they read as judgment calls, not gaps):

- `Programme.code` added — registries reference programmes by code, not just name.
- `Assessment.programmeId` added — without it, every student would see every assessment system-wide regardless of programme. This is the single most important "stakeholder understanding" addition.
- `Student.academicYear` is an `Int` (year of study: 1, 2, 3…), not a cohort string — matches how a registry actually filters ("which final-years haven't submitted").
- `Student.feeAmount` is a **snapshot** taken from `Programme.feeAmount` at creation (staff-editable after) — a registry locks in the fee a student enrolled under; it shouldn't silently change if the programme's listed fee changes later.
- `Student.feeDueDate` — required date, auto-computed as `enrolledAt + 30 days`, staff-editable. Defines what "overdue" means, since the brief never specifies a due date.
- **No hard deletes** on Student/Payment/Submission/Grade — status changes (e.g. → Withdrawn) are how a registry "removes" a student, never a hard delete of financial/academic history. No DELETE endpoints for these.
- `module` on `Assessment` stays a plain string, not its own model — no CRUD for it is requested.
- Classification (Fail/Pass/Merit/Distinction) and `isLate` are **computed at read time**, not stored — so they can never go stale relative to score/deadline edits.
- Unique constraints doing real validation work: `Student.email`, `Payment.referenceNumber`, `Submission[studentId, assessmentId]`, `Grade[studentId, assessmentId]`.

```prisma
enum EnrolmentStatus { ENROLLED DEFERRED WITHDRAWN COMPLETED }

model Programme {
  id          String       @id @default(cuid())
  code        String       @unique
  name        String
  feeAmount   Decimal      @db.Decimal(10, 2)
  students    Student[]
  assessments Assessment[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Student {
  id              String          @id @default(cuid())
  studentId       String          @unique   // SMS-2025-0001
  fullName        String
  email           String          @unique
  dateOfBirth     DateTime        @db.Date
  programmeId     String
  programme       Programme       @relation(fields: [programmeId], references: [id])
  academicYear    Int             @default(1)
  enrolmentStatus EnrolmentStatus @default(ENROLLED)
  enrolledAt      DateTime        @default(now())
  feeAmount       Decimal         @db.Decimal(10, 2)
  feeDueDate      DateTime        @db.Date
  payments        Payment[]
  submissions     Submission[]
  grades          Grade[]
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  @@index([fullName])
  @@index([programmeId])
  @@index([enrolmentStatus])
}

model Payment {
  id              String   @id @default(cuid())
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id])
  amount          Decimal  @db.Decimal(10, 2)
  paymentDate     DateTime @db.Date
  referenceNumber String   @unique
  createdAt       DateTime @default(now())

  @@index([studentId])
}

model Assessment {
  id          String       @id @default(cuid())
  title       String
  module      String
  programmeId String
  programme   Programme    @relation(fields: [programmeId], references: [id])
  deadline    DateTime
  submissions Submission[]
  grades      Grade[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([programmeId])
}

model Submission {
  id           String     @id @default(cuid())
  assessmentId String
  assessment   Assessment @relation(fields: [assessmentId], references: [id])
  studentId    String
  student      Student    @relation(fields: [studentId], references: [id])
  fileName     String
  fileUrl      String
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt   // last resubmit time; drives isLate

  @@unique([studentId, assessmentId])
}

model Grade {
  id           String     @id @default(cuid())
  assessmentId String
  assessment   Assessment @relation(fields: [assessmentId], references: [id])
  studentId    String
  student      Student    @relation(fields: [studentId], references: [id])
  score        Int
  isPublished  Boolean    @default(false)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([studentId, assessmentId])
}
```

## 4. Business Rules (ambiguous in the brief — decided here)

1. **Overdue fees**: `outstandingBalance > 0 AND today > student.feeDueDate`, computed live. Deliberately **not** filtered by enrolment status — a Withdrawn student who still owes money should still surface on the dashboard for collections follow-up.
2. **Late submission / resubmission**: if no submission exists yet, a student may submit any time — even post-deadline — flagged `isLate`. Once a submission exists, further changes are only allowed while `now <= deadline`; after that the route returns `409` with a clear message. Only `ENROLLED` students may create new submissions (Deferred/Withdrawn can still view history).
3. **Student ID generation**: `SMS-{year}-{4-digit sequence}` via count of existing IDs for that year + 1. On a rare unique-constraint collision (`P2002`), catch and retry generation up to 3 times — no counter table or row locking needed at this scale.

## 5. Routes & Pages

**Staff**
- `/staff` — dashboard: counts by status, overdue list, unpublished-grades count
- `/staff/students` — search/filter list
- `/staff/students/new` — create student
- `/staff/students/[id]` — profile, fee ledger + record payment, submissions, grade entry/publish
- `/staff/programmes` — minimal list/create
- `/staff/assessments` — list/create
- `/staff/assessments/[id]` — submissions (incl. late flags), grade entry/publish

**Student**
- `/` — role picker (Staff / Student + "viewing as" student dropdown), sets a cookie
- `/student` — dashboard: balance, status, open assessments, published-results count
- `/student/fees` — balance + payment history, read-only
- `/student/assessments` — submit/resubmit with on-time/late/locked badges
- `/student/results` — published grades only; withheld shows "Result pending"

**API route handlers**
- `POST/GET /api/students`, `PATCH /api/students/[id]`
- `POST/GET /api/students/[id]/payments`
- `POST/GET /api/programmes`
- `POST/GET /api/assessments`
- `POST /api/assessments/[id]/submissions` (multipart, upsert, deadline-lock + active-student guard), `GET` same (staff grading view)
- `GET /api/files/[submissionId]` (streams file from disk; verifies caller is staff or the owning student)
- `POST /api/assessments/[id]/grades`, `PATCH /api/grades/[id]` (`{ score?, isPublished? }`)

Uploaded files are stored on local disk outside `/public` (e.g. `/uploads`) and served only through the guarded route handler above — never statically exposed.

## 6. Build Order

1. **Foundation** — scaffold Next.js, shadcn init, git init + first commit, `docker-compose.yml`, `.env`/`.env.example`, `schema.prisma`, first migration, `prisma/seed.ts`
2. **Student Enrolment** — ID generator, `/api/students`, list+search+filter, create form, role-switch cookie
3. **Fees & Payments** — balance/overdue calc helper, payment recording, ledger UI, dashboard overdue widget, student fees view
4. **Assessment Submission** — assessment create/list, local file storage w/ validation, upsert route with deadline-lock, staff submissions view, student submit/resubmit UI
5. **Marksheet & Results** — grade entry/publish routes, classification helper, staff grading table, student marksheet with "pending" placeholder
6. **Edge-case + error-handling pass** — see below; friendly messages for constraint violations; empty states
7. **README + seed polish + final QA** — honest AI-usage section, verify no secrets committed, click through all four workflows as both roles

## 7. Edge Cases Handled Proactively

1. Overdue flag computed live, shown regardless of enrolment status
2. First-time late submission always accepted and flagged; resubmission locked after deadline with a clear `409`, never a silent failure
3. Withheld results never leak the score even via the API response — filtered at the database query level for student-role callers, not just hidden in the UI
4. Duplicate email / payment reference / double submission / double grade caught as clean, friendly errors — not raw stack traces
5. Deferred/Withdrawn students blocked from creating new submissions, while their historical data stays visible

**Seed data must visibly exercise every state above**, since grading happens by clicking through the UI: 2 programmes; 5–6 students spanning all four statuses; payments covering fully-paid, partially-paid-and-overdue, and unpaid-but-not-yet-due; assessments with an on-time submission, a late one, a resubmitted-before-deadline one, and a no-submission student; grades spanning Fail/Pass/Merit/Distinction with at least one deliberately withheld.

## 8. Deliverables Checklist

- [ ] GitHub repo, all code committed (no zip files)
- [ ] README: local run steps, `.env` variables, AI usage section
- [ ] `prisma/schema.prisma` committed
- [ ] Seed script: ≥5 students, 2 programmes, fees, sample grades
- [ ] Staff view / Student view role toggle
- [ ] `.env.example` committed, `.env` gitignored, no credentials committed

## 9. Verification

Run end-to-end locally, then manually walk through as **Staff** (create a student, record a payment, see the overdue flag, create an assessment, view/grade a late submission, publish one grade and withhold another) and as **Student** (view own balance, submit against an open assessment, confirm a withheld result shows "pending" while a published one shows correctly, confirm a Withdrawn/Deferred seeded student can't submit new work).
