export type Classification = "Fail" | "Pass" | "Merit" | "Distinction";

/**
 * Pass >= 40, Merit >= 60, Distinction >= 70, otherwise Fail.
 * Computed on read rather than stored, so it can never go stale
 * relative to the score.
 */
export function classify(score: number): Classification {
  if (score >= 70) return "Distinction";
  if (score >= 60) return "Merit";
  if (score >= 40) return "Pass";
  return "Fail";
}

export const classificationBadgeVariant: Record<
  Classification,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Distinction: "default",
  Merit: "secondary",
  Pass: "outline",
  Fail: "destructive",
};
