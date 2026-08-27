import { prisma } from "@/lib/prisma";
import { listStudents } from "@/lib/students";
import { EnrolmentStatus } from "@prisma/client";

export async function getDashboardStats() {
  const [statusCounts, unpublishedGrades, students] = await Promise.all([
    prisma.student.groupBy({ by: ["enrolmentStatus"], _count: true }),
    prisma.grade.count({ where: { isPublished: false } }),
    listStudents({}),
  ]);

  const countByStatus = Object.fromEntries(
    statusCounts.map((c) => [c.enrolmentStatus, c._count])
  ) as Record<EnrolmentStatus, number>;

  return {
    totalStudents: students.length,
    countByStatus,
    unpublishedGrades,
    // Deliberately not filtered by status - a withdrawn student who still
    // owes money still belongs on the collections radar.
    overdueStudents: students.filter((s) => s.overdue),
  };
}
