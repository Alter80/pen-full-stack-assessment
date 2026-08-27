import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { isLateSubmission } from "@/lib/submissions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SubmitAssessmentForm } from "@/components/assessments/submit-assessment-form";
import { formatDateTime } from "@/lib/format";

export default async function StudentAssessmentsPage() {
  const session = await getSession();
  if (session?.role !== "student") notFound();

  const student = await prisma.student.findUnique({ where: { id: session.studentDbId } });
  if (!student) notFound();

  const assessments = await prisma.assessment.findMany({
    where: { programmeId: student.programmeId },
    include: { submissions: { where: { studentId: student.id } } },
    orderBy: { deadline: "desc" },
  });

  const now = Date.now();
  const canSubmitAtAll = student.enrolmentStatus === "ENROLLED";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Assessments</h1>
      {!canSubmitAtAll && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          Your enrolment status is {student.enrolmentStatus.toLowerCase()}, so new coursework can&apos;t be
          submitted. Past submissions remain visible below.
        </p>
      )}

      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assessments have been set for your programme yet.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {assessments.map((a) => {
            const submission = a.submissions[0];
            const deadlinePassed = a.deadline.getTime() < now;
            const locked = submission ? deadlinePassed : false;
            const late = submission ? isLateSubmission(submission.updatedAt, a.deadline) : false;
            const canAct = canSubmitAtAll && !locked;

            return (
              <Card key={a.id}>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      {a.title} <span className="font-normal text-muted-foreground">· {a.module}</span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-normal">
                      {!submission && <Badge variant={deadlinePassed ? "destructive" : "outline"}>
                        {deadlinePassed ? "Not submitted (deadline passed)" : "Not submitted"}
                      </Badge>}
                      {submission && late && <Badge variant="destructive">Late</Badge>}
                      {submission && !late && <Badge>On time</Badge>}
                      {locked && <Badge variant="secondary">Locked</Badge>}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground">Deadline: {formatDateTime(a.deadline)}</p>

                  {submission && (
                    <a
                      href={`/api/files/${submission.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-fit text-sm font-medium hover:underline"
                    >
                      View current submission: {submission.fileName} →
                    </a>
                  )}

                  {canAct && <SubmitAssessmentForm assessmentId={a.id} hasSubmission={Boolean(submission)} />}
                  {!canAct && locked && (
                    <p className="text-xs text-muted-foreground">
                      The deadline has passed - this submission is locked and can no longer be changed.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
