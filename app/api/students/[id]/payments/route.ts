import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/api-error";
import { requireStaff } from "@/lib/session";
import { recordPaymentSchema } from "@/lib/validation";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireStaff();
    const payments = await prisma.payment.findMany({
      where: { studentId: id },
      orderBy: { paymentDate: "desc" },
    });
    return NextResponse.json({ payments: payments.map((p) => ({ ...p, amount: p.amount.toNumber() })) });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await requireStaff();
    const body = await request.json();
    const input = recordPaymentSchema.parse(body);
    const payment = await prisma.payment.create({ data: { studentId: id, ...input } });
    return NextResponse.json({ payment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
