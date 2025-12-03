import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PERMISSIONS, canManageUser } from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import { UserRole } from "@prisma/client";

// GET /api/admin/permissions/users - Get users with their permissions
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.PERMISSIONS_READ);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const userId = searchParams.get("userId");

    // If specific user ID is provided, get that user's permissions
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }

      return NextResponse.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          customPermissions: user.permissions.map((p) => ({
            id: p.id,
            permissionId: p.permissionId,
            permissionName: p.permission.name,
            granted: p.granted,
          })),
        },
      });
    }

    // Search users
    const users = await prisma.user.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {},
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        _count: {
          select: {
            permissions: true,
          },
        },
      },
      take: 20,
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        customPermissionsCount: u._count.permissions,
      })),
    });
  } catch (error) {
    console.error("Error fetching user permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch user permissions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/permissions/users - Grant/revoke permission for a user
export async function POST(request: Request) {
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
    const { userId, permissionName, action } = body as {
      userId: string;
      permissionName: string;
      action: "grant" | "revoke" | "deny";
    };

    if (!userId || !permissionName || !action) {
      return NextResponse.json(
        { error: "userId, permissionName, and action are required" },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if can manage this user
    if (!canManageUser(session.user.role as UserRole, targetUser.role)) {
      return NextResponse.json(
        { error: "Cannot manage permissions for users with equal or higher role" },
        { status: 403 }
      );
    }

    // Get permission record
    const permission = await prisma.permission.findUnique({
      where: { name: permissionName },
    });

    if (!permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 }
      );
    }

    const { ipAddress, userAgent } = getRequestInfo(request);

    if (action === "revoke") {
      // Remove the user permission
      await prisma.userPermission.deleteMany({
        where: {
          userId,
          permissionId: permission.id,
        },
      });

      await createAuditLog({
        userId: session.user.id,
        action: "permission.revoke",
        resource: "UserPermission",
        resourceId: userId,
        details: { targetUser: targetUser.email, permission: permissionName },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        message: "Permission revoked successfully",
      });
    } else {
      // Grant or deny permission
      await prisma.userPermission.upsert({
        where: {
          userId_permissionId: {
            userId,
            permissionId: permission.id,
          },
        },
        update: { granted: action === "grant" },
        create: {
          userId,
          permissionId: permission.id,
          granted: action === "grant",
        },
      });

      await createAuditLog({
        userId: session.user.id,
        action: action === "grant" ? "permission.grant" : "permission.revoke",
        resource: "UserPermission",
        resourceId: userId,
        details: {
          targetUser: targetUser.email,
          permission: permissionName,
          granted: action === "grant",
        },
        ipAddress,
        userAgent,
      });

      return NextResponse.json({
        message: `Permission ${action === "grant" ? "granted" : "denied"} successfully`,
      });
    }
  } catch (error) {
    console.error("Error managing user permission:", error);
    return NextResponse.json(
      { error: "Failed to manage user permission" },
      { status: 500 }
    );
  }
}
