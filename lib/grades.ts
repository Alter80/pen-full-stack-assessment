import { prisma } from "@/lib/prisma";

export async function enterGrade(assessmentId: string, studentId: string, score: number) {
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
