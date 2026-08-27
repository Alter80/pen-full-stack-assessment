import { Prisma } from "@prisma/client";

const FEE_DUE_DAYS = 30;

/** Default due date for a newly-enrolled student: enrolment date + 30 days. */
export function defaultFeeDueDate(enrolledAt: Date): Date {
  const due = new Date(enrolledAt);
  due.setDate(due.getDate() + FEE_DUE_DAYS);
  return due;
}

/**
 * Outstanding balance = fee owed - total paid, using Decimal arithmetic
 * throughout (never JS floats) to avoid rounding drift on money.
 *
 * Not clamped to zero: an overpayment shows as a negative balance (a
 * credit) rather than being silently hidden, which is what a Registry
 * team actually needs to see.
 */
export function outstandingBalance(
  feeAmount: Prisma.Decimal.Value,
  payments: { amount: Prisma.Decimal.Value }[]
): Prisma.Decimal {
  const totalPaid = payments.reduce(
    (sum, p) => sum.plus(new Prisma.Decimal(p.amount)),
    new Prisma.Decimal(0)
  );
  return new Prisma.Decimal(feeAmount).minus(totalPaid);
}

/**
 * A balance is overdue when something is still owed past the due date.
 * Deliberately NOT filtered by enrolment status - a Withdrawn student who
 * still owes money should still surface for collections follow-up.
 */
export function isOverdue(balance: Prisma.Decimal, feeDueDate: Date, now: Date = new Date()): boolean {
  return balance.greaterThan(0) && now.getTime() > feeDueDate.getTime();
}
