"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function SubmitAssessmentForm({ assessmentId, hasSubmission }: { assessmentId: string; hasSubmission: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    if (!(formData.get("file") as File)?.size) {
      setError("Choose a PDF or DOCX file first.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/assessments/${assessmentId}/submissions`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Could not submit this file.");
        return;
      }

      toast.success(hasSubmission ? "Resubmitted" : "Submitted");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-2">
      <input
        type="file"
        name="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        required
        className="text-sm file:mr-3 file:rounded-md file:border file:border-input file:bg-transparent file:px-2.5 file:py-1 file:text-sm"
      />
      <Button type="submit" size="sm" disabled={submitting}>
        {submitting ? "Uploading…" : hasSubmission ? "Resubmit" : "Submit"}
      </Button>
      {error && <p className="w-full text-xs text-destructive">{error}</p>}
    </form>
  );
}
