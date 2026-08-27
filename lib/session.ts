import { cookies } from "next/headers";

export type Role = "staff" | "student";

export const ROLE_COOKIE = "sms_role";
export const STUDENT_COOKIE = "sms_student";

export type Session = { role: "staff" } | { role: "student"; studentDbId: string };

/**
 * No real authentication here - a role toggle is explicitly acceptable per
 * the brief. "Student" role additionally carries which seeded student the
 * viewer is acting as, since there's no login to derive that from.
 */
export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  const role = store.get(ROLE_COOKIE)?.value;

  if (role === "staff") return { role: "staff" };

  if (role === "student") {
    const studentDbId = store.get(STUDENT_COOKIE)?.value;
    if (!studentDbId) return null;
    return { role: "student", studentDbId };
  }

  return null;
}
