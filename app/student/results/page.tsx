import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { classify, classificationBadgeVariant } from "@/lib/classification";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function StudentResultsPage() {
  const session = await getSession();
  if (session?.role !== "student") notFound();

  const student = await prisma.student.findUnique({ where: { id: session.studentDbId } });
  if (!student) notFound();

  const [assessments, publishedGrades, gradedAssessments] = await Promise.all([
    prisma.assessment.findMany({ where: { programmeId: student.programmeId }, orderBy: { deadline: "desc" } }),
    // Only published grades ever have their score fetched - a withheld
    // result's score never enters this page's data at all.
    prisma.grade.findMany({
      where: { studentId: student.id, isPublished: true },
      select: { assessmentId: true, score: true },
    }),
    prisma.grade.findMany({ where: { studentId: student.id }, select: { assessmentId: true } }),
  ]);

  const publishedByAssessment = new Map(publishedGrades.map((g) => [g.assessmentId, g.score]));
  const gradedAssessmentIds = new Set(gradedAssessments.map((g) => g.assessmentId));

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Results</h1>

      <Card>
        <CardHeader>
          <CardTitle>Marksheet</CardTitle>
        </CardHeader>
        <CardContent>
          {assessments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assessments have been set for your programme yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assessment</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Classification</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((a) => {
                  const score = publishedByAssessment.get(a.id);
                  const isWithheld = !publishedByAssessment.has(a.id) && gradedAssessmentIds.has(a.id);

                  return (
                    <TableRow key={a.id}>
                      <TableCell>{a.title}</TableCell>
                      <TableCell className="text-muted-foreground">{a.module}</TableCell>
                      <TableCell>
                        {score !== undefined ? (
                          score
                        ) : isWithheld ? (
                          <Badge variant="outline">Result pending</Badge>
                        ) : (
                          <span className="text-muted-foreground">Not yet graded</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {score !== undefined && (
                          <Badge variant={classificationBadgeVariant[classify(score)]}>{classify(score)}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
