import { prisma } from "@/lib/prisma";
import { defaultFeeDueDate, isOverdue, outstandingBalance } from "@/lib/fees";
import { nextStudentId } from "@/lib/student-id";
import { EnrolmentStatus, Prisma } from "@prisma/client";

export type StudentFilters = {
  q?: string;
  programmeId?: string;
  status?: EnrolmentStatus;
};

/**
 * Shared by the /staff/students page (direct call, server-rendered) and
 * GET /api/students (same logic, exposed as a real API route) so search
 * and filtering behavior can never drift between the two.
 */
export async function listStudents(filters: StudentFilters) {
  const where: Prisma.StudentWhereInput = {};

  if (filters.q?.trim()) {
    const q = filters.q.trim();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { studentId: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  if (filters.programmeId) where.programmeId = filters.programmeId;
  if (filters.status) where.enrolmentStatus = filters.status;

  const students = await prisma.student.findMany({
    where,
    include: { programme: true, payments: true },
    orderBy: { createdAt: "desc" },
  });

  return students.map((s) => {
    const balance = outstandingBalance(s.feeAmount, s.payments);
    return {
      id: s.id,
      studentId: s.studentId,
      fullName: s.fullName,
      email: s.email,
      dateOfBirth: s.dateOfBirth,
      programme: { id: s.programme.id, code: s.programme.code, name: s.programme.name },
      academicYear: s.academicYear,
      enrolmentStatus: s.enrolmentStatus,
      enrolledAt: s.enrolledAt,
      feeAmount: s.feeAmount.toNumber(),
      feeDueDate: s.feeDueDate,
      balance: balance.toNumber(),
      overdue: isOverdue(balance, s.feeDueDate),
    };
  });
}

export type CreateStudentInput = {
  fullName: string;
  email: string;
  dateOfBirth: Date;
  programmeId: string;
  academicYear: number;
  enrolmentStatus?: EnrolmentStatus;
  feeAmount?: number;
};

/**
 * Creates a student with an auto-generated SMS-{year}-{seq} ID. On the rare
 * chance the generated ID collides with one created concurrently (P2002 on
 * studentId specifically), regenerate and retry a few times rather than
 * failing outright.
 */
export async function createStudent(input: CreateStudentInput) {
  const programme = await prisma.programme.findUniqueOrThrow({ where: { id: input.programmeId } });
  const enrolledAt = new Date();
  const feeAmount = input.feeAmount ?? programme.feeAmount;
  const feeDueDate = defaultFeeDueDate(enrolledAt);

  const MAX_ATTEMPTS = 3;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const studentId = await nextStudentId(enrolledAt);
    try {
      return await prisma.student.create({
        data: {
          studentId,
          fullName: input.fullName,
          email: input.email,
          dateOfBirth: input.dateOfBirth,
          programmeId: input.programmeId,
          academicYear: input.academicYear,
          enrolmentStatus: input.enrolmentStatus ?? EnrolmentStatus.ENROLLED,
          enrolledAt,
          feeAmount,
          feeDueDate,
        },
        include: { programme: true },
      });
    } catch (err) {
      const isStudentIdCollision =
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002" &&
        (err.meta?.target as string[] | undefined)?.includes("studentId");
      if (isStudentIdCollision && attempt < MAX_ATTEMPTS) continue;
      throw err;
    }
  }
  // Unreachable, but keeps TypeScript satisfied.
  throw new Error("Failed to generate a unique student ID.");
}

export type UpdateStudentInput = Partial<CreateStudentInput> & { feeDueDate?: Date };

export async function updateStudent(id: string, input: UpdateStudentInput) {
  return prisma.student.update({
    where: { id },
    data: input,
    include: { programme: true },
  });
}
