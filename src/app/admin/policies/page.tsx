import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PolicyTable from "./PolicyTable";

export default async function PoliciesPage() {
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
          <h1 className="text-3xl font-bold text-slate-900">Policies</h1>
          <p className="text-slate-600 mt-1">
            Manage rental policies (Cancellation, Insurance, Fuel, etc.) and attach them to packages or vehicles
          </p>
        </div>
      </div>

      <PolicyTable />
    </div>
  );
}
