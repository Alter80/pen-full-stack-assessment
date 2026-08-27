import Link from "next/link";
import { listStudents } from "@/lib/students";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatAmount, STATUS_BADGE_VARIANT, STATUS_LABEL } from "@/lib/format";
import { EnrolmentStatus } from "@prisma/client";

type SearchParams = { q?: string; programmeId?: string; status?: string };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const status =
    params.status && params.status in EnrolmentStatus ? (params.status as EnrolmentStatus) : undefined;

  const [students, programmes] = await Promise.all([
    listStudents({ q: params.q, programmeId: params.programmeId, status }),
    prisma.programme.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Button render={<Link href="/staff/students/new" />}>Add Student</Button>
      </div>

      <form className="flex flex-wrap items-end gap-3 rounded-lg border p-4">
        <div className="flex flex-1 min-w-48 flex-col gap-1">
          <label htmlFor="q" className="text-sm font-medium">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Name, student ID, or email"
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="programmeId" className="text-sm font-medium">
            Programme
          </label>
          <select
            id="programmeId"
            name="programmeId"
            defaultValue={params.programmeId ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={params.status ?? ""}
            className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" variant="secondary">
          Filter
        </Button>
        {(params.q || params.programmeId || params.status) && (
          <Button render={<Link href="/staff/students" />} variant="ghost">
            Clear
          </Button>
        )}
      </form>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No students match these filters.
                </TableCell>
              </TableRow>
            ) : (
              students.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs">
                    <Link href={`/staff/students/${s.id}`} className="hover:underline">
                      {s.studentId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/staff/students/${s.id}`} className="hover:underline">
                      {s.fullName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.programme.name}</TableCell>
                  <TableCell className="text-muted-foreground">{s.academicYear}</TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[s.enrolmentStatus]}>
                      {STATUS_LABEL[s.enrolmentStatus]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={s.overdue ? "font-medium text-destructive" : ""}>
                      {formatAmount(s.balance)}
                    </span>
                    {s.overdue && (
                      <Badge variant="destructive" className="ml-2">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
