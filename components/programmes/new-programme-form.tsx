"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewProgrammeForm() {
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
      code: formData.get("code"),
      name: formData.get("name"),
      feeAmount: formData.get("feeAmount"),
    };

    try {
      const res = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error ?? "Could not create the programme.");
        return;
      }

      toast.success(`Programme "${data.programme.name}" created`);
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setFormError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
      {formError && <p className="w-full text-sm text-destructive">{formError}</p>}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="code">Code</Label>
        <Input id="code" name="code" placeholder="e.g. BSC-CS" required maxLength={20} className="w-32" />
        {errors.code && <p className="text-xs text-destructive">{errors.code[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="e.g. BSc Computer Science" required className="w-64" />
        {errors.name && <p className="text-xs text-destructive">{errors.name[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="feeAmount">Fee amount</Label>
        <Input id="feeAmount" name="feeAmount" type="number" step="0.01" min={0} required className="w-32" />
        {errors.feeAmount && <p className="text-xs text-destructive">{errors.feeAmount[0]}</p>}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Adding…" : "Add Programme"}
      </Button>
    </form>
  );
}
