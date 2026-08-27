import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { outstandingBalance, isOverdue } from "@/lib/fees";
import { EditStudentForm } from "@/components/students/edit-student-form";
import { RecordPaymentForm } from "@/components/students/record-payment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount, formatDate, STATUS_BADGE_VARIANT, STATUS_LABEL, toDateInputValue } from "@/lib/format";

export default async function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [student, programmes] = await Promise.all([
    prisma.student.findUnique({
      where: { id },
      include: { programme: true, payments: { orderBy: { paymentDate: "desc" } } },
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!student) notFound();

  const balance = outstandingBalance(student.feeAmount, student.payments);
  const overdue = isOverdue(balance, student.feeDueDate);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{student.fullName}</h1>
          <p className="font-mono text-sm text-muted-foreground">{student.studentId}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE_VARIANT[student.enrolmentStatus]}>
            {STATUS_LABEL[student.enrolmentStatus]}
          </Badge>
          {overdue && <Badge variant="destructive">Overdue</Badge>}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryCard label="Programme" value={`${student.programme.name} (${student.programme.code})`} />
        <SummaryCard label="Enrolled" value={formatDate(student.enrolledAt)} />
        <SummaryCard
          label="Outstanding Balance"
          value={formatAmount(balance.toNumber())}
          emphasize={overdue}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student Details</CardTitle>
        </CardHeader>
        <CardContent>
          <EditStudentForm
            student={{
              id: student.id,
              fullName: student.fullName,
              email: student.email,
              dateOfBirth: toDateInputValue(student.dateOfBirth),
              programmeId: student.programmeId,
              academicYear: student.academicYear,
              enrolmentStatus: student.enrolmentStatus,
              feeAmount: student.feeAmount.toNumber(),
              feeDueDate: toDateInputValue(student.feeDueDate),
            }}
            programmes={programmes}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fees &amp; Payments</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RecordPaymentForm studentId={student.id} />

          {student.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {student.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{formatDate(p.paymentDate)}</TableCell>
                    <TableCell className="font-mono text-xs">{p.referenceNumber}</TableCell>
                    <TableCell className="text-right">{formatAmount(p.amount.toNumber())}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={`text-lg font-semibold ${emphasize ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
