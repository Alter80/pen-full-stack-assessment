import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { createStudentSchema } from "@/lib/validation";
import { createStudent, listStudents } from "@/lib/students";
import { EnrolmentStatus } from "@prisma/client";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  try {
    await requireStaff();
    const students = await listStudents({
      q: searchParams.get("q") ?? undefined,
      programmeId: searchParams.get("programmeId") ?? undefined,
      status: status && status in EnrolmentStatus ? (status as EnrolmentStatus) : undefined,
    });
    return NextResponse.json({ students });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff();
    const body = await request.json();
    const input = createStudentSchema.parse(body);
    const student = await createStudent(input);
    return NextResponse.json({ student }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
