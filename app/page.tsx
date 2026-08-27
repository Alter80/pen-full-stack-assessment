import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { chooseStaffRole, chooseStudentRole } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function RolePickerPage() {
  const session = await getSession();
  if (session?.role === "staff") redirect("/staff");
  if (session?.role === "student") redirect("/student");

  const students = await prisma.student.findMany({
    orderBy: { fullName: "asc" },
    select: { id: true, studentId: true, fullName: true },
  });

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 py-12">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">SMS Registry</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No login is required for this assessment build — pick how you&apos;d like to view the app.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Staff</CardTitle>
          <CardDescription>Manage students, fees, assessments, and results.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={chooseStaffRole}>
            <Button type="submit">Continue as Staff</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Student</CardTitle>
          <CardDescription>View your own fees, submit coursework, and see published results.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={chooseStudentRole} className="flex flex-col gap-3 sm:flex-row">
            <select
              name="studentDbId"
              required
              defaultValue=""
              className="h-9 flex-1 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <option value="" disabled>
                Choose which student to view as…
              </option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName} ({s.studentId})
                </option>
              ))}
            </select>
            <Button type="submit" variant="secondary">
              Continue as Student
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
