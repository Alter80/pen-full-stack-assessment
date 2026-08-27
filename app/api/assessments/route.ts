import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { createAssessmentSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  try {
    const assessments = await prisma.assessment.findMany({
      where: { programmeId: searchParams.get("programmeId") ?? undefined },
      include: { programme: true, _count: { select: { submissions: true, grades: true } } },
      orderBy: { deadline: "desc" },
    });
    return NextResponse.json({ assessments });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff();
    const body = await request.json();
    const input = createAssessmentSchema.parse(body);
    const assessment = await prisma.assessment.create({ data: input, include: { programme: true } });
    return NextResponse.json({ assessment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
