"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Programme = { id: string; code: string; name: string; feeAmount: number };

export function NewStudentForm({ programmes }: { programmes: Programme[] }) {
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
      feeAmount: formData.get("feeAmount") || undefined,
    };

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error ?? "Could not create the student.");
        return;
      }

      toast.success(`${data.student.fullName} enrolled as ${data.student.studentId}`);
      router.push(`/staff/students/${data.student.id}`);
      router.refresh();
    } catch {
      setFormError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      {formError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{formError}</p>
      )}

      <Field label="Full name" name="fullName" error={errors.fullName}>
        <Input id="fullName" name="fullName" required maxLength={200} />
      </Field>

      <Field label="Email" name="email" error={errors.email}>
        <Input id="email" name="email" type="email" required />
      </Field>

      <Field label="Date of birth" name="dateOfBirth" error={errors.dateOfBirth}>
        <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
      </Field>

      <Field label="Programme" name="programmeId" error={errors.programmeId}>
        <select
          id="programmeId"
          name="programmeId"
          required
          defaultValue=""
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Select a programme…
          </option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code}) — fee {p.feeAmount.toFixed(2)}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Academic year" name="academicYear" error={errors.academicYear}>
          <Input id="academicYear" name="academicYear" type="number" min={1} max={8} defaultValue={1} required />
        </Field>

        <Field label="Enrolment status" name="enrolmentStatus" error={errors.enrolmentStatus}>
          <select
            id="enrolmentStatus"
            name="enrolmentStatus"
            defaultValue="ENROLLED"
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <option value="ENROLLED">Enrolled</option>
            <option value="DEFERRED">Deferred</option>
            <option value="WITHDRAWN">Withdrawn</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </Field>
      </div>

      <Field
        label="Fee amount (optional override)"
        name="feeAmount"
        error={errors.feeAmount}
        hint="Leave blank to use the programme's default fee."
      >
        <Input id="feeAmount" name="feeAmount" type="number" step="0.01" min={0} placeholder="Programme default" />
      </Field>

      <Button type="submit" disabled={submitting} className="w-fit">
        {submitting ? "Creating…" : "Create Student"}
      </Button>
    </form>
  );
}

function Field({
  label,
  name,
  error,
  hint,
  children,
}: {
  label: string;
  name: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={name}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs text-destructive">{error[0]}</p>}
    </div>
  );
}
