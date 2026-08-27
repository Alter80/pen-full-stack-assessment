import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { updateStudentSchema } from "@/lib/validation";
import { updateStudent } from "@/lib/students";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await request.json();
    const input = updateStudentSchema.parse(body);
    const student = await updateStudent(id, input);
    return NextResponse.json({ student });
  } catch (err) {
    return errorResponse(err);
  }
}
