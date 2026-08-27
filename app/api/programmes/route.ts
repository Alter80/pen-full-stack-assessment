import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { createProgrammeSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const programmes = await prisma.programme.findMany({ orderBy: { name: "asc" } });
    return NextResponse.json({
      programmes: programmes.map((p) => ({ ...p, feeAmount: p.feeAmount.toNumber() })),
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireStaff();
    const body = await request.json();
    const input = createProgrammeSchema.parse(body);
    const programme = await prisma.programme.create({ data: input });
    return NextResponse.json({ programme }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
