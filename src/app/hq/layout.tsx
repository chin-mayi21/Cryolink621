import { HqSidebar } from "@/components/layout/hq-sidebar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function HqLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session || session.role !== "OPERATIONS_OFFICIAL") {
    redirect("/");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg md:flex-row">
      <HqSidebar />
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
