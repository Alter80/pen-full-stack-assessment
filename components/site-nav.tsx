import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { switchRole } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const staffLinks = [
  { href: "/staff", label: "Dashboard" },
  { href: "/staff/students", label: "Students" },
  { href: "/staff/programmes", label: "Programmes" },
  { href: "/staff/assessments", label: "Assessments" },
];

const studentLinks = [
  { href: "/student", label: "Dashboard" },
  { href: "/student/fees", label: "Fees" },
  { href: "/student/assessments", label: "Assessments" },
  { href: "/student/results", label: "Results" },
];

export async function SiteNav() {
  const session = await getSession();

  const student =
    session?.role === "student"
      ? await prisma.student.findUnique({
          where: { id: session.studentDbId },
          select: { fullName: true, studentId: true },
        })
      : null;

  const links = session?.role === "staff" ? staffLinks : session?.role === "student" ? studentLinks : [];

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href={session ? (session.role === "staff" ? "/staff" : "/student") : "/"} className="font-semibold">
            SMS Registry
          </Link>
          <nav className="flex items-center gap-4 text-sm text-muted-foreground">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {session && (
          <div className="flex items-center gap-3">
            {session.role === "staff" ? (
              <Badge variant="secondary">Staff</Badge>
            ) : (
              <Badge variant="secondary">
                Student{student ? ` · ${student.fullName} (${student.studentId})` : ""}
              </Badge>
            )}
            <form action={switchRole}>
              <Button type="submit" variant="outline" size="sm">
                Switch role
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
