"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Programme = { id: string; code: string; name: string };

type StudentEditable = {
  id: string;
  fullName: string;
  email: string;
  dateOfBirth: string; // yyyy-mm-dd
  programmeId: string;
  academicYear: number;
  enrolmentStatus: string;
  feeAmount: number;
  feeDueDate: string; // yyyy-mm-dd
};

export function EditStudentForm({ student, programmes }: { student: StudentEditable; programmes: Programme[] }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrors({});
    setFormError(null);

    const formData = new FormData(event.currentTarget);
    const body = {
      fullName: formData.get("fullName"),
      email: formData.get("email"),
      dateOfBirth: formData.get("dateOfBirth"),
      programmeId: formData.get("programmeId"),
      academicYear: formData.get("academicYear"),
      enrolmentStatus: formData.get("enrolmentStatus"),
      feeAmount: formData.get("feeAmount"),
      feeDueDate: formData.get("feeDueDate"),
    };

    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error ?? "Could not save changes.");
        return;
      }

      toast.success("Student record updated");
      router.refresh();
    } catch {
      setFormError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {formError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" error={errors.fullName}>
          <Input name="fullName" defaultValue={student.fullName} required maxLength={200} />
        </Field>
        <Field label="Email" error={errors.email}>
          <Input name="email" type="email" defaultValue={student.email} required />
        </Field>
        <Field label="Date of birth" error={errors.dateOfBirth}>
          <Input name="dateOfBirth" type="date" defaultValue={student.dateOfBirth} required />
        </Field>
        <Field label="Programme" error={errors.programmeId}>
          <select
            name="programmeId"
            defaultValue={student.programmeId}
            required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </Field>
        <Field label="Academic year" error={errors.academicYear}>
          <Input name="academicYear" type="number" min={1} max={8} defaultValue={student.academicYear} required />
        </Field>
        <Field label="Enrolment status" error={errors.enrolmentStatus}>
          <select
            name="enrolmentStatus"
            defaultValue={student.enrolmentStatus}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="ENROLLED">Enrolled</option>
            <option value="DEFERRED">Deferred</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
        <Field label="Fee amount" error={errors.feeAmount}>
          <Input name="feeAmount" type="number" step="0.01" min={0} defaultValue={student.feeAmount} required />
        </Field>
        <Field label="Fee due date" error={errors.feeDueDate}>
          <Input name="feeDueDate" type="date" defaultValue={student.feeDueDate} required />
        </Field>
      </div>

      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string[]; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
