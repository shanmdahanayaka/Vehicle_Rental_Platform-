import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  const adminRoles = ["MANAGER", "ADMIN", "SUPER_ADMIN"];
  if (!session || !adminRoles.includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="bg-slate-50">
      <AdminSidebar />
      <div className="ml-64 min-h-[calc(100vh-4rem)]">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
