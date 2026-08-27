"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Programme = { id: string; code: string; name: string };

export function NewAssessmentForm({ programmes }: { programmes: Programme[] }) {
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
      title: formData.get("title"),
      module: formData.get("module"),
      programmeId: formData.get("programmeId"),
      deadline: formData.get("deadline"),
    };

    try {
      const res = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.details) setErrors(data.details);
        setFormError(data.error ?? "Could not create the assessment.");
        return;
      }

      toast.success(`Assessment "${data.assessment.title}" created`);
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
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Algorithms Coursework 2" required className="w-56" />
        {errors.title && <p className="text-xs text-destructive">{errors.title[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="module">Module</Label>
        <Input id="module" name="module" placeholder="e.g. Algorithms" required className="w-40" />
        {errors.module && <p className="text-xs text-destructive">{errors.module[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="programmeId">Programme</Label>
        <select
          id="programmeId"
          name="programmeId"
          required
          defaultValue=""
          className="h-9 w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <option value="" disabled>
            Select a programme…
          </option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.code})
            </option>
          ))}
        </select>
        {errors.programmeId && <p className="text-xs text-destructive">{errors.programmeId[0]}</p>}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" name="deadline" type="datetime-local" required />
        {errors.deadline && <p className="text-xs text-destructive">{errors.deadline[0]}</p>}
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? "Creating…" : "Create Assessment"}
      </Button>
    </form>
  );
}
