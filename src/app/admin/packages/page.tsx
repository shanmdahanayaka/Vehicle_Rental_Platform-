import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PackageTable from "./PackageTable";

export default async function PackagesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Packages</h1>
          <p className="text-slate-600 mt-1">
            Manage rental packages and options (Airport pickup, Long-term rental, etc.)
          </p>
        </div>
      </div>

      <PackageTable />
    </div>
  );
}
