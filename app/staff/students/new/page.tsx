import { prisma } from "@/lib/prisma";
import { NewStudentForm } from "@/components/students/new-student-form";

export default async function NewStudentPage() {
  const programmes = await prisma.programme.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Add Student</h1>
      <NewStudentForm programmes={programmes.map((p) => ({ ...p, feeAmount: p.feeAmount.toNumber() }))} />
    </div>
  );
}
