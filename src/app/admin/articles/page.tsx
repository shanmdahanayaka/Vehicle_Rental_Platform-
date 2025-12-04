import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import ArticleTable from "./ArticleTable";

export default async function ArticlesPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Articles</h1>
          <p className="text-slate-600 mt-1">
            Manage blog articles, news, travel tips, and promotions
          </p>
        </div>
      </div>

      <ArticleTable />
    </div>
  );
}
