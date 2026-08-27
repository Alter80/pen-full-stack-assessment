import { PrismaClient, EnrolmentStatus } from "@prisma/client";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

const now = new Date();
function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number) {
  return daysAgo(-n);
}
function feeDueDate(enrolledAt: Date) {
  const d = new Date(enrolledAt);
  d.setDate(d.getDate() + 30);
  return d;
}

/** Builds a small, genuinely valid single-page PDF (correct xref offsets) so seeded submissions open in a real viewer. */
function makeDemoPdf(title: string, lines: string[]): Buffer {
  const body = [title, "", ...lines]
    .map((line, i) => `${i === 0 ? "40 720" : "0 -18"} Td (${line.replace(/[()\\]/g, "")}) Tj`)
    .join("\n");
  const content = `BT /F1 14 Tf\n${body}\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(content, "latin1")} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}

async function saveSubmissionFile(assessmentId: string, studentDbId: string, displayName: string, pdf: Buffer) {
  const dir = path.join(UPLOADS_DIR, assessmentId);
  await mkdir(dir, { recursive: true });
  const relativePath = path.join(assessmentId, `${studentDbId}.pdf`);
  await writeFile(path.join(UPLOADS_DIR, relativePath), pdf);
  return { fileName: displayName, fileUrl: relativePath.replace(/\\/g, "/") };
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.grade.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.student.deleteMany();
  await prisma.assessment.deleteMany();
  await prisma.programme.deleteMany();
  await rm(UPLOADS_DIR, { recursive: true, force: true });

  console.log("Creating programmes...");
  const cs = await prisma.programme.create({
    data: { code: "BSC-CS", name: "BSc Computer Science", feeAmount: "5000.00" },
  });
  const business = await prisma.programme.create({
    data: { code: "BA-BUS", name: "BA Business Administration", feeAmount: "4000.00" },
  });

  console.log("Creating students...");
  // Each student's studentId is assigned sequentially, mirroring what the
  // real /api/students create route does via lib/student-id.ts.
  const year = now.getFullYear();
  const sid = (n: number) => `SMS-${year}-${String(n).padStart(4, "0")}`;

  const studentDefs = [
    {
      seq: 1,
      fullName: "Alice Morgan",
      email: "alice.morgan@example.com",
      dateOfBirth: new Date("2003-04-12"),
      programmeId: cs.id,
      academicYear: 2,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
      enrolledAt: daysAgo(200),
      feeAmount: "5000.00",
    },
    {
      seq: 2,
      fullName: "Ben Carter",
      email: "ben.carter@example.com",
      dateOfBirth: new Date("2004-01-22"),
      programmeId: cs.id,
      academicYear: 1,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
      enrolledAt: daysAgo(60),
      feeAmount: "5000.00",
    },
    {
      seq: 3,
      fullName: "Chloe Davies",
      email: "chloe.davies@example.com",
      dateOfBirth: new Date("2002-09-03"),
      programmeId: business.id,
      academicYear: 3,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
      enrolledAt: daysAgo(10),
      feeAmount: "4000.00",
    },
    {
      seq: 4,
      fullName: "Daniel Osei",
      email: "daniel.osei@example.com",
      dateOfBirth: new Date("2003-11-30"),
      programmeId: cs.id,
      academicYear: 2,
      enrolmentStatus: EnrolmentStatus.DEFERRED,
      enrolledAt: daysAgo(150),
      feeAmount: "5000.00",
    },
    {
      seq: 5,
      fullName: "Emma Wright",
      email: "emma.wright@example.com",
      dateOfBirth: new Date("2001-06-17"),
      programmeId: business.id,
      academicYear: 1,
      enrolmentStatus: EnrolmentStatus.WITHDRAWN,
      enrolledAt: daysAgo(300),
      feeAmount: "4000.00",
    },
    {
      seq: 6,
      fullName: "Farid Hussain",
      email: "farid.hussain@example.com",
      dateOfBirth: new Date("2000-02-08"),
      programmeId: cs.id,
      academicYear: 3,
      enrolmentStatus: EnrolmentStatus.COMPLETED,
      enrolledAt: daysAgo(400),
      feeAmount: "5000.00",
    },
    {
      seq: 7,
      fullName: "Grace Kim",
      email: "grace.kim@example.com",
      dateOfBirth: new Date("2003-07-25"),
      programmeId: business.id,
      academicYear: 2,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
      enrolledAt: daysAgo(100),
      feeAmount: "4000.00",
    },
    {
      seq: 8,
      fullName: "Harun Ali",
      email: "harun.ali@example.com",
      dateOfBirth: new Date("2004-12-05"),
      programmeId: cs.id,
      academicYear: 1,
      enrolmentStatus: EnrolmentStatus.ENROLLED,
      enrolledAt: daysAgo(45),
      feeAmount: "5000.00",
    },
  ];

  const students: Record<string, Awaited<ReturnType<typeof prisma.student.create>>> = {};
  for (const def of studentDefs) {
    const student = await prisma.student.create({
      data: {
        studentId: sid(def.seq),
        fullName: def.fullName,
        email: def.email,
        dateOfBirth: def.dateOfBirth,
        programmeId: def.programmeId,
        academicYear: def.academicYear,
        enrolmentStatus: def.enrolmentStatus,
        enrolledAt: def.enrolledAt,
        feeAmount: def.feeAmount,
        feeDueDate: feeDueDate(def.enrolledAt),
      },
    });
    students[def.fullName] = student;
  }

  console.log("Recording payments...");
  // Fully paid: Alice, Daniel, Farid, Grace.
  // Partially paid (and overdue): Ben.
  // Unpaid, not yet due: Chloe.
  // Unpaid, overdue: Emma (withdrawn - still flagged), Harun.
  await prisma.payment.createMany({
    data: [
      { studentId: students["Alice Morgan"].id, amount: "5000.00", paymentDate: daysAgo(190), referenceNumber: "PAY-0001" },
      { studentId: students["Ben Carter"].id, amount: "2500.00", paymentDate: daysAgo(55), referenceNumber: "PAY-0002" },
      { studentId: students["Daniel Osei"].id, amount: "5000.00", paymentDate: daysAgo(140), referenceNumber: "PAY-0003" },
      { studentId: students["Farid Hussain"].id, amount: "5000.00", paymentDate: daysAgo(390), referenceNumber: "PAY-0004" },
      { studentId: students["Grace Kim"].id, amount: "4000.00", paymentDate: daysAgo(90), referenceNumber: "PAY-0005" },
    ],
  });

  console.log("Creating assessments...");
  const algorithmsCw1 = await prisma.assessment.create({
    data: { title: "Algorithms Coursework 1", module: "Algorithms", programmeId: cs.id, deadline: daysAgo(10) },
  });
  const databasesProject = await prisma.assessment.create({
    data: { title: "Databases Project", module: "Databases", programmeId: cs.id, deadline: daysFromNow(14) },
  });
  const marketingEssay = await prisma.assessment.create({
    data: { title: "Marketing Fundamentals Essay", module: "Marketing", programmeId: business.id, deadline: daysAgo(5) },
  });

  console.log("Writing demo submission files...");
  // On-time submission, well before the deadline.
  const aliceCw1 = await saveSubmissionFile(
    algorithmsCw1.id,
    students["Alice Morgan"].id,
    "alice-algorithms-cw1.pdf",
    makeDemoPdf("Algorithms Coursework 1", ["Alice Morgan - SMS student submission", "Submitted on time"])
  );
  // First-ever submission made after the deadline: accepted, flagged late.
  const benCw1 = await saveSubmissionFile(
    algorithmsCw1.id,
    students["Ben Carter"].id,
    "ben-algorithms-cw1.pdf",
    makeDemoPdf("Algorithms Coursework 1", ["Ben Carter - SMS student submission", "Submitted after the deadline"])
  );
  // Harun: deliberately no submission for this assessment.

  const aliceDb = await saveSubmissionFile(
    databasesProject.id,
    students["Alice Morgan"].id,
    "alice-databases-project.pdf",
    makeDemoPdf("Databases Project", ["Alice Morgan - SMS student submission", "Submitted ahead of an open deadline"])
  );

  const graceEssay = await saveSubmissionFile(
    marketingEssay.id,
    students["Grace Kim"].id,
    "grace-marketing-essay.pdf",
    makeDemoPdf("Marketing Fundamentals Essay", ["Grace Kim - SMS student submission", "Submitted on time"])
  );
  // Chloe: deliberately no submission - deadline has passed with nothing submitted.

  await prisma.submission.create({
    data: {
      assessmentId: algorithmsCw1.id,
      studentId: students["Alice Morgan"].id,
      fileName: aliceCw1.fileName,
      fileUrl: aliceCw1.fileUrl,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(15),
    },
  });
  await prisma.submission.create({
    data: {
      assessmentId: algorithmsCw1.id,
      studentId: students["Ben Carter"].id,
      fileName: benCw1.fileName,
      fileUrl: benCw1.fileUrl,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
  });
  await prisma.submission.create({
    data: {
      assessmentId: databasesProject.id,
      studentId: students["Alice Morgan"].id,
      fileName: aliceDb.fileName,
      fileUrl: aliceDb.fileUrl,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  });
  await prisma.submission.create({
    data: {
      assessmentId: marketingEssay.id,
      studentId: students["Grace Kim"].id,
      fileName: graceEssay.fileName,
      fileUrl: graceEssay.fileUrl,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
  });

  console.log("Entering grades...");
  // Spans Fail / Pass / Merit / Distinction, with one deliberately withheld.
  await prisma.grade.createMany({
    data: [
      { studentId: students["Alice Morgan"].id, assessmentId: algorithmsCw1.id, score: 82, isPublished: true }, // Distinction
      { studentId: students["Ben Carter"].id, assessmentId: algorithmsCw1.id, score: 35, isPublished: true }, // Fail
      { studentId: students["Alice Morgan"].id, assessmentId: databasesProject.id, score: 58, isPublished: true }, // Pass
      { studentId: students["Grace Kim"].id, assessmentId: marketingEssay.id, score: 65, isPublished: false }, // Merit, withheld
    ],
  });

  console.log("\nSeed complete:");
  console.log(`  2 programmes, ${studentDefs.length} students, 5 payments, 3 assessments, 4 submissions, 4 grades.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
