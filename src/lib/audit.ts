import { prisma } from "./prisma";

export type AuditAction =
  | "user.create"
  | "user.update"
  | "user.delete"
  | "user.suspend"
  | "user.activate"
  | "user.ban"
  | "user.role_change"
  | "user.login"
  | "user.logout"
  | "vehicle.create"
  | "vehicle.update"
  | "vehicle.delete"
  | "booking.create"
  | "booking.update"
  | "booking.cancel"
  | "booking.confirm"
  | "review.create"
  | "review.update"
  | "review.delete"
  | "payment.update"
  | "permission.grant"
  | "permission.revoke";

export type AuditResource = "User" | "Vehicle" | "Booking" | "Review" | "Payment" | "Permission";

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  resource: AuditResource;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export async function createAuditLog(params: AuditLogParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        resource: params.resource,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : null,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      },
    });
  } catch (error) {
    // Log error but don't throw - audit logging should not break main functionality
    console.error("Failed to create audit log:", error);
  }
}

// Helper to extract IP and User-Agent from request headers
export function getRequestInfo(request: Request): { ipAddress?: string; userAgent?: string } {
  const ipAddress =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    undefined;
  const userAgent = request.headers.get("user-agent") || undefined;
  return { ipAddress, userAgent };
}

// Helper to get audit logs with filters
export interface AuditLogFilters {
  userId?: string;
  action?: AuditAction;
  resource?: AuditResource;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export async function getAuditLogs(filters: AuditLogFilters) {
  const where: Record<string, unknown> = {};

  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.resource) where.resource = filters.resource;
  if (filters.resourceId) where.resourceId = filters.resourceId;

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate) (where.createdAt as Record<string, Date>).gte = filters.startDate;
    if (filters.endDate) (where.createdAt as Record<string, Date>).lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total };
}

// Format audit log for display
export function formatAuditAction(action: AuditAction): string {
  const actionMap: Record<AuditAction, string> = {
    "user.create": "Created user",
    "user.update": "Updated user",
    "user.delete": "Deleted user",
    "user.suspend": "Suspended user",
    "user.activate": "Activated user",
    "user.ban": "Banned user",
    "user.role_change": "Changed user role",
    "user.login": "User logged in",
    "user.logout": "User logged out",
    "vehicle.create": "Created vehicle",
    "vehicle.update": "Updated vehicle",
    "vehicle.delete": "Deleted vehicle",
    "booking.create": "Created booking",
    "booking.update": "Updated booking",
    "booking.cancel": "Cancelled booking",
    "booking.confirm": "Confirmed booking",
    "review.create": "Created review",
    "review.update": "Updated review",
    "review.delete": "Deleted review",
    "payment.update": "Updated payment",
    "permission.grant": "Granted permission",
    "permission.revoke": "Revoked permission",
  };
  return actionMap[action] || action;
}
