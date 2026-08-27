import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { updateGradeSchema } from "@/lib/validation";
import { updateGrade } from "@/lib/grades";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireStaff();
    const body = await request.json();
    const input = updateGradeSchema.parse(body);
    const grade = await updateGrade(id, input);
    return NextResponse.json({ grade });
  } catch (err) {
    return errorResponse(err);
  }
}
