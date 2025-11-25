import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PERMISSIONS, ROLE_PERMISSIONS, ROLE_DISPLAY_NAMES, ROLE_DESCRIPTIONS } from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import { UserRole } from "@prisma/client";

// GET /api/admin/permissions - Get all permissions and role mappings
export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.PERMISSIONS_READ);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    // Get permissions from database
    const dbPermissions = await prisma.permission.findMany({
      orderBy: [{ resource: "asc" }, { action: "asc" }],
    });

    // Get role-permission mappings from database
    const rolePermissions = await prisma.rolePermission.findMany({
      include: { permission: true },
    });

    // Build the response
    const roles = Object.keys(ROLE_PERMISSIONS).map((role) => ({
      role,
      displayName: ROLE_DISPLAY_NAMES[role as UserRole],
      description: ROLE_DESCRIPTIONS[role as UserRole],
      permissions: ROLE_PERMISSIONS[role as UserRole],
    }));

    // Get all available permissions
    const allPermissions = Object.entries(PERMISSIONS).map(([key, value]) => {
      const [resource, action] = value.split(":");
      return {
        key,
        name: value,
        resource,
        action,
      };
    });

    return NextResponse.json({
      roles,
      permissions: allPermissions,
      dbPermissions,
      rolePermissions: rolePermissions.map((rp) => ({
        role: rp.role,
        permission: rp.permission.name,
      })),
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 }
    );
  }
}

// POST /api/admin/permissions - Initialize permissions in database
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

    // Initialize all permissions in the database
    const allPermissions = Object.entries(PERMISSIONS);

    for (const [, value] of allPermissions) {
      const [resource, action] = value.split(":");
      await prisma.permission.upsert({
        where: { name: value },
        update: { resource, action },
        create: {
          name: value,
          resource,
          action,
          description: `${action.charAt(0).toUpperCase() + action.slice(1)} ${resource}`,
        },
      });
    }

    // Initialize role permissions
    for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      for (const permission of permissions) {
        const dbPermission = await prisma.permission.findUnique({
          where: { name: permission },
        });

        if (dbPermission) {
          await prisma.rolePermission.upsert({
            where: {
              role_permissionId: {
                role: role as UserRole,
                permissionId: dbPermission.id,
              },
            },
            update: {},
            create: {
              role: role as UserRole,
              permissionId: dbPermission.id,
            },
          });
        }
      }
    }

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "permission.grant",
      resource: "Permission",
      details: { action: "initialized_permissions" },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: "Permissions initialized successfully" });
  } catch (error) {
    console.error("Error initializing permissions:", error);
    return NextResponse.json(
      { error: "Failed to initialize permissions" },
      { status: 500 }
    );
  }
}
