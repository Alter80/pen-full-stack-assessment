import { notFound } from "next/navigation";
import { listSubmissionsForAssessment } from "@/lib/submissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { GradeRowForm } from "@/components/assessments/grade-row-form";
import { formatDateTime } from "@/lib/format";

export default async function StaffAssessmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let result;
  try {
    result = await listSubmissionsForAssessment(id);
  } catch {
    notFound();
  }
  const { assessment, submissions } = result;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">{assessment.title}</h1>
        <p className="text-sm text-muted-foreground">
          {assessment.module} · {assessment.programme.name} · Deadline {formatDateTime(assessment.deadline)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submissions &amp; Grading</CardTitle>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>File</TableHead>
                  <TableHead>Grade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {s.studentName}
                      <span className="ml-1 text-muted-foreground">({s.studentDisplayId})</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(s.submittedAt)}
                      {s.isLate && (
                        <Badge variant="destructive" className="ml-2">
                          Late
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <a
                        href={`/api/files/${s.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {s.fileName}
                      </a>
                    </TableCell>
                    <TableCell>
                      <GradeRowForm assessmentId={assessment.id} studentId={s.studentId} grade={s.grade} />
                    </TableCell>
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
