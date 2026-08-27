import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "staff") redirect("/");
  return <>{children}</>;
}
