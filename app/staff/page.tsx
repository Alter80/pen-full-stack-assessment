import Link from "next/link";
import { getDashboardStats } from "@/lib/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount, formatDate, STATUS_LABEL } from "@/lib/format";

export default async function StaffDashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Registry Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Students" value={stats.totalStudents} />
        <StatCard label="Enrolled" value={stats.countByStatus.ENROLLED ?? 0} />
        <StatCard label="Deferred" value={stats.countByStatus.DEFERRED ?? 0} />
        <StatCard label="Withdrawn" value={stats.countByStatus.WITHDRAWN ?? 0} />
        <StatCard label="Completed" value={stats.countByStatus.COMPLETED ?? 0} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Overdue Balances
              <Badge variant="destructive">{stats.overdueStudents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.overdueStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No students currently overdue.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.overdueStudents.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/staff/students/${s.id}`} className="hover:underline">
                          {s.fullName}
                          <span className="ml-1 text-muted-foreground">({s.studentId})</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{STATUS_LABEL[s.enrolmentStatus]}</TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(s.feeDueDate)}</TableCell>
                      <TableCell className="text-right font-medium">{formatAmount(s.balance)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Unpublished Grades
              <Badge variant="secondary">{stats.unpublishedGrades}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {stats.unpublishedGrades === 0
                ? "Every entered grade has been published to students."
                : "Grades entered but withheld from students. Review and publish from an assessment's page."}
            </p>
            <Link href="/staff/assessments" className="mt-3 inline-block text-sm font-medium hover:underline">
              Go to Assessments →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  );
}
