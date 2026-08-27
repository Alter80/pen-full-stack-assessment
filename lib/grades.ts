import { prisma } from "@/lib/prisma";
import { ApiError } from "@/lib/api-error";

export async function enterGrade(assessmentId: string, studentId: string, score: number) {
  const [assessment, student] = await Promise.all([
    prisma.assessment.findUnique({ where: { id: assessmentId } }),
    prisma.student.findUnique({ where: { id: studentId } }),
  ]);
  if (!assessment) throw new ApiError(404, "Assessment not found.");
  if (!student) throw new ApiError(404, "Student not found.");
  if (student.programmeId !== assessment.programmeId) {
    throw new ApiError(400, "This student isn't on the assessment's programme.");
  }

  // Changing the score always unpublishes the grade - a corrected score
  // should never silently keep showing to a student without staff
  // deliberately re-publishing it.
  return prisma.grade.upsert({
    where: { studentId_assessmentId: { studentId, assessmentId } },
    create: { assessmentId, studentId, score },
    update: { score, isPublished: false },
  });
}

export async function updateGrade(id: string, input: { score?: number; isPublished?: boolean }) {
  const data: { score?: number; isPublished?: boolean } = {};
  if (input.score !== undefined) {
    data.score = input.score;
    data.isPublished = false;
  }
  if (input.isPublished !== undefined) {
    data.isPublished = input.isPublished;
  }
  return prisma.grade.update({ where: { id }, data });
}
