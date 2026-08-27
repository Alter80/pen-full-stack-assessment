import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";
import { UPLOADS_DIR, validateUploadFile } from "@/lib/uploads";
import { EnrolmentStatus } from "@prisma/client";

/** A submission is "late" iff its most recent write happened after the deadline - see submitAssessment for why this can only happen on a first-time submission. */
export function isLateSubmission(submissionUpdatedAt: Date, deadline: Date): boolean {
  return submissionUpdatedAt.getTime() > deadline.getTime();
}

export async function listSubmissionsForAssessment(assessmentId: string) {
  const assessment = await prisma.assessment.findUniqueOrThrow({
    where: { id: assessmentId },
    include: {
      programme: true,
      submissions: { include: { student: true }, orderBy: { updatedAt: "desc" } },
      grades: true,
    },
  });

  const gradeByStudent = new Map(assessment.grades.map((g) => [g.studentId, g]));

  return {
    assessment,
    submissions: assessment.submissions.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      studentDisplayId: s.student.studentId,
      studentName: s.student.fullName,
      fileName: s.fileName,
      submittedAt: s.updatedAt,
      isLate: isLateSubmission(s.updatedAt, assessment.deadline),
      grade: gradeByStudent.get(s.studentId) ?? null,
    })),
  };
}

type UploadedFile = { name: string; type: string; arrayBuffer(): Promise<ArrayBuffer> };

/**
 * Business rules encoded here:
 *  - Only ENROLLED students may submit (Deferred/Withdrawn are blocked from
 *    new activity, but keep their historical data visible elsewhere).
 *  - A first-time submission is always accepted, even after the deadline,
 *    and is simply flagged late.
 *  - Once a submission exists, it can only be replaced while now <= deadline;
 *    after that it's locked.
 */
export async function submitAssessment(assessmentId: string, studentDbId: string, file: UploadedFile) {
  const [assessment, student, existing] = await Promise.all([
    prisma.assessment.findUnique({ where: { id: assessmentId } }),
    prisma.student.findUnique({ where: { id: studentDbId } }),
    prisma.submission.findUnique({
      where: { studentId_assessmentId: { studentId: studentDbId, assessmentId } },
    }),
  ]);

  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (!student) throw new ApiError(404, "Student not found.");
  if (student.programmeId !== assessment.programmeId) {
    throw new ApiError(403, "This assessment isn't part of your programme.");
  }
  if (student.enrolmentStatus !== EnrolmentStatus.ENROLLED) {
    throw new ApiError(403, "Only enrolled students can submit coursework.");
  }

  const now = new Date();
  if (existing && now.getTime() > assessment.deadline.getTime()) {
    throw new ApiError(409, "The deadline has passed - this submission can no longer be changed.");
  }

  const validation = validateUploadFile(file as unknown as File);
  if ("error" in validation) throw new ApiError(400, validation.error);

  const dir = path.join(UPLOADS_DIR, assessmentId);
  await mkdir(dir, { recursive: true });
  const relativePath = path.posix.join(assessmentId, `${studentDbId}${validation.ext}`);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(UPLOADS_DIR, relativePath), buffer);

  return prisma.submission.upsert({
    where: { studentId_assessmentId: { studentId: studentDbId, assessmentId } },
    create: { assessmentId, studentId: studentDbId, fileName: file.name, fileUrl: relativePath },
    update: { fileName: file.name, fileUrl: relativePath },
  });
}
