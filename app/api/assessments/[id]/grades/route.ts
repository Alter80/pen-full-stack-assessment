import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { gradeInputSchema } from "@/lib/validation";
import { enterGrade } from "@/lib/grades";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireStaff();
    const body = await request.json();
    const input = gradeInputSchema.parse(body);
    const grade = await enterGrade(id, input.studentId, input.score);
    return NextResponse.json({ grade }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
