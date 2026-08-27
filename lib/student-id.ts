import { prisma } from "@/lib/prisma";

/**
 * Next sequence number for SMS-{year}-{4-digit} within the given year,
 * based on how many student IDs already exist for that year.
 * Format: SMS-2025-0001
 */
export async function nextStudentId(enrolledAt: Date = new Date()): Promise<string> {
  const year = enrolledAt.getFullYear();
  const prefix = `SMS-${year}-`;
  const count = await prisma.student.count({
    where: { studentId: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(4, "0")}`;
}
