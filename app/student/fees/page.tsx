import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { outstandingBalance, isOverdue } from "@/lib/fees";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount, formatDate } from "@/lib/format";

export default async function StudentFeesPage() {
  const session = await getSession();
  if (session?.role !== "student") notFound();

  const student = await prisma.student.findUnique({
    where: { id: session.studentDbId },
    include: { payments: { orderBy: { paymentDate: "desc" } } },
  });
  if (!student) notFound();

  const balance = outstandingBalance(student.feeAmount, student.payments);
  const overdue = isOverdue(balance, student.feeDueDate);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Fees</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Programme Fee</p>
            <p className="text-lg font-semibold">{formatAmount(student.feeAmount.toNumber())}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Payment Due</p>
            <p className="text-lg font-semibold">{formatDate(student.feeDueDate)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className={`text-lg font-semibold ${overdue ? "text-destructive" : ""}`}>
              {formatAmount(balance.toNumber())}
            </p>
            {overdue && <Badge variant="destructive" className="mt-1">Overdue</Badge>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
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
