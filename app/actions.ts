"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE_COOKIE, STUDENT_COOKIE } from "@/lib/session";

const COOKIE_OPTS = { path: "/", httpOnly: false as const };

export async function chooseStaffRole() {
  const store = await cookies();
  store.set(ROLE_COOKIE, "staff", COOKIE_OPTS);
  store.delete(STUDENT_COOKIE);
  redirect("/staff");
}

export async function chooseStudentRole(formData: FormData) {
  const studentDbId = String(formData.get("studentDbId") ?? "");
  if (!studentDbId) return;
  const store = await cookies();
  store.set(ROLE_COOKIE, "student", COOKIE_OPTS);
  store.set(STUDENT_COOKIE, studentDbId, COOKIE_OPTS);
  redirect("/student");
}

export async function switchRole() {
  const store = await cookies();
  store.delete(ROLE_COOKIE);
  store.delete(STUDENT_COOKIE);
  redirect("/");
}
