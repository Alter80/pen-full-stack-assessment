import { NextRequest, NextResponse } from "next/server";
import { errorResponse, ApiError } from "@/lib/api-error";
import { requireStaff, requireStudent } from "@/lib/session";
import { listSubmissionsForAssessment, submitAssessment } from "@/lib/submissions";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireStaff();
    const result = await listSubmissionsForAssessment(id);
    return NextResponse.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const session = await requireStudent();
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) throw new ApiError(400, "No file was provided.");

    const submission = await submitAssessment(id, session.studentDbId, file);
    return NextResponse.json({ submission }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
