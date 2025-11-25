import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  PERMISSIONS,
  PermissionString,
  grantUserPermission,
  revokeUserPermission,
  getUserEffectivePermissions,
  canManageUser
} from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper to get user's actual role from database
async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/users/[id]/permissions - Get user's permissions
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actual role from database
    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Only ADMIN and SUPER_ADMIN can view user permissions
    if (!["ADMIN", "SUPER_ADMIN"].includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get user's effective permissions
    const effectivePermissions = await getUserEffectivePermissions(id, targetUser.role);

    // Get user-specific permissions (granted individually)
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId: id },
      include: { permission: true },
    });

    // Get all available permissions
    const allPermissions = Object.entries(PERMISSIONS).map(([key, name]) => {
      const [resource, action] = name.split(":");
      return { key, name, resource, action };
    });

    return NextResponse.json({
      user: targetUser,
      effectivePermissions,
      userSpecificPermissions: userPermissions.map((up) => ({
        permission: up.permission.name,
        granted: up.granted,
      })),
      allPermissions,
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users/[id]/permissions - Grant permission to user
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actual role from database
    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Only SUPER_ADMIN can grant permissions
    if (actualRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Administrators can manage permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { permission } = body;

    if (!permission) {
      return NextResponse.json(
        { error: "Permission name is required" },
        { status: 400 }
      );
    }

    // Validate permission exists
    if (!Object.values(PERMISSIONS).includes(permission)) {
      return NextResponse.json(
        { error: "Invalid permission" },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if can manage this user
    if (!canManageUser(actualRole, targetUser.role)) {
      return NextResponse.json(
        { error: "Cannot manage permissions for users with equal or higher role" },
        { status: 403 }
      );
    }

    // Grant the permission
    const success = await grantUserPermission(id, permission as PermissionString);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to grant permission" },
        { status: 500 }
      );
    }

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "permission.grant",
      resource: "Permission",
      resourceId: id,
      details: {
        targetUser: targetUser.email,
        permission,
        action: "grant"
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: "Permission granted successfully" });
  } catch (error) {
    console.error("Error granting permission:", error);
    return NextResponse.json(
      { error: "Failed to grant permission" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]/permissions - Revoke permission from user
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actual role from database
    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Only SUPER_ADMIN can revoke permissions
    if (actualRole !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Only Super Administrators can manage permissions" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const permission = searchParams.get("permission");

    if (!permission) {
      return NextResponse.json(
        { error: "Permission name is required" },
        { status: 400 }
      );
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if can manage this user
    if (!canManageUser(actualRole, targetUser.role)) {
      return NextResponse.json(
        { error: "Cannot manage permissions for users with equal or higher role" },
        { status: 403 }
      );
    }

    // Revoke the permission
    const success = await revokeUserPermission(id, permission as PermissionString);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to revoke permission" },
        { status: 500 }
      );
    }

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "permission.revoke",
      resource: "Permission",
      resourceId: id,
      details: {
        targetUser: targetUser.email,
        permission,
        action: "revoke"
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: "Permission revoked successfully" });
  } catch (error) {
    console.error("Error revoking permission:", error);
    return NextResponse.json(
      { error: "Failed to revoke permission" },
      { status: 500 }
    );
  }
}
