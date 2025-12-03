import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PERMISSIONS } from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import { UserRole } from "@prisma/client";

// PATCH /api/admin/permissions/roles - Update role permissions
export async function PATCH(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.PERMISSIONS_MANAGE);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const body = await request.json();
    const { role, permissions } = body as { role: UserRole; permissions: string[] };

    if (!role || !Array.isArray(permissions)) {
      return NextResponse.json(
        { error: "Role and permissions array are required" },
        { status: 400 }
      );
    }

    // Cannot modify SUPER_ADMIN permissions
    if (role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot modify Super Admin permissions" },
        { status: 403 }
      );
    }

    // Get all permission records
    const dbPermissions = await prisma.permission.findMany();
    const permissionMap = new Map(dbPermissions.map((p) => [p.name, p.id]));

    // Delete existing role permissions
    await prisma.rolePermission.deleteMany({
      where: { role },
    });

    // Create new role permissions
    const rolePermissions = [];
    for (const permName of permissions) {
      const permId = permissionMap.get(permName);
      if (permId) {
        rolePermissions.push({
          role,
          permissionId: permId,
        });
      }
    }

    if (rolePermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: rolePermissions,
      });
    }

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "permission.grant",
      resource: "RolePermission",
      details: { role, permissionsCount: permissions.length },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: "Role permissions updated successfully",
      role,
      permissionsCount: permissions.length,
    });
  } catch (error) {
    console.error("Error updating role permissions:", error);
    return NextResponse.json(
      { error: "Failed to update role permissions" },
      { status: 500 }
    );
  }
}
