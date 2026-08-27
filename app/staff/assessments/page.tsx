import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NewAssessmentForm } from "@/components/assessments/new-assessment-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";

export default async function AssessmentsPage() {
  const [assessments, programmes] = await Promise.all([
    prisma.assessment.findMany({
      include: { programme: true, _count: { select: { submissions: true, grades: true } } },
      orderBy: { deadline: "desc" },
    }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  // eslint-disable-next-line react-hooks/purity -- Server Component: runs fresh per request, not memoized by the React Compiler.
  const now = Date.now();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Assessments</h1>

      <Card>
        <CardHeader>
          <CardTitle>Create an Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <NewAssessmentForm programmes={programmes} />
        </CardContent>
      </Card>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                  No assessments yet.
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>
                    <Link href={`/staff/assessments/${a.id}`} className="hover:underline">
                      {a.title}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{a.module}</TableCell>
                  <TableCell className="text-muted-foreground">{a.programme.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDateTime(a.deadline)}
                    {a.deadline.getTime() < now && (
                      <Badge variant="secondary" className="ml-2">
                        Closed
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{a._count.submissions}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
