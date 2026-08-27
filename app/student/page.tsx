import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { outstandingBalance, isOverdue } from "@/lib/fees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAmount, STATUS_BADGE_VARIANT, STATUS_LABEL } from "@/lib/format";

export default async function StudentDashboardPage() {
  const session = await getSession();
  if (session?.role !== "student") notFound();

  const student = await prisma.student.findUnique({
    where: { id: session.studentDbId },
    include: { programme: true, payments: true },
  });
  if (!student) notFound();

  const balance = outstandingBalance(student.feeAmount, student.payments);
  const overdue = isOverdue(balance, student.feeDueDate);

  const [openAssessments, publishedResults] = await Promise.all([
    prisma.assessment.count({
      where: { programmeId: student.programmeId, submissions: { none: { studentId: student.id } } },
    }),
    prisma.grade.count({ where: { studentId: student.id, isPublished: true } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Welcome, {student.fullName}</h1>
          <p className="text-sm text-muted-foreground">
            {student.studentId} · {student.programme.name}
          </p>
        </div>
        <Badge variant={STATUS_BADGE_VARIANT[student.enrolmentStatus]}>
          {STATUS_LABEL[student.enrolmentStatus]}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Outstanding Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-semibold ${overdue ? "text-destructive" : ""}`}>
              {formatAmount(balance.toNumber())}
            </p>
            {overdue && <Badge variant="destructive" className="mt-2">Overdue</Badge>}
            <Link href="/student/fees" className="mt-2 block text-sm font-medium hover:underline">
              View fees →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Assessments to Submit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{openAssessments}</p>
            <Link href="/student/assessments" className="mt-2 block text-sm font-medium hover:underline">
              View assessments →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Published Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{publishedResults}</p>
            <Link href="/student/results" className="mt-2 block text-sm font-medium hover:underline">
              View results →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
