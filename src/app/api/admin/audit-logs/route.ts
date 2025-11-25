import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkPermission, PERMISSIONS } from "@/lib/permissions";
import { getAuditLogs, AuditAction, AuditResource } from "@/lib/audit";
import { UserRole } from "@prisma/client";

// GET /api/admin/audit-logs - Get audit logs with filters
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.AUDIT_LOGS_READ);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || undefined;
    const action = (searchParams.get("action") as AuditAction) || undefined;
    const resource = (searchParams.get("resource") as AuditResource) || undefined;
    const resourceId = searchParams.get("resourceId") || undefined;
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    const { logs, total } = await getAuditLogs({
      userId,
      action,
      resource,
      resourceId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    return NextResponse.json({
      logs,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
