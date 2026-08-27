"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { classify, classificationBadgeVariant } from "@/lib/classification";

type Grade = { id: string; score: number; isPublished: boolean } | null;

export function GradeRowForm({
  assessmentId,
  studentId,
  grade,
}: {
  assessmentId: string;
  studentId: string;
  grade: Grade;
}) {
  const router = useRouter();
  const [score, setScore] = useState(grade?.score?.toString() ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function saveScore() {
    const parsed = Number(score);
    if (score === "" || Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
      toast.error("Enter a grade between 0 and 100.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/grades`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, score: parsed }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not save the grade.");
        return;
      }
      toast.success("Grade saved");
      router.refresh();
    } catch {
      toast.error("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function togglePublish() {
    if (!grade) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/grades/${grade.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !grade.isPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Could not update publish status.");
        return;
      }
      toast.success(grade.isPublished ? "Result withheld" : "Result published");
      router.refresh();
    } catch {
      toast.error("Network error - please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="h-8 w-20"
        placeholder="0-100"
      />
      <Button type="button" size="sm" variant="secondary" onClick={saveScore} disabled={submitting}>
        Save
      </Button>

      {grade && (
        <>
          <Badge variant={classificationBadgeVariant[classify(grade.score)]}>{classify(grade.score)}</Badge>
          <Button type="button" size="sm" variant={grade.isPublished ? "outline" : "default"} onClick={togglePublish} disabled={submitting}>
            {grade.isPublished ? "Withhold" : "Publish"}
          </Button>
          {grade.isPublished ? (
            <Badge variant="secondary">Published</Badge>
          ) : (
            <Badge variant="outline">Withheld</Badge>
          )}
        </>
      )}
    </div>
  );
}
