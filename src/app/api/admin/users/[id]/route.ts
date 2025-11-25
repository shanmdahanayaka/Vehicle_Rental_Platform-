import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermission, PERMISSIONS, canManageUser, canAssignRole } from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/admin/users/[id] - Get a single user
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.USERS_READ);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        image: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            bookings: true,
            reviews: true,
          },
        },
        bookings: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            status: true,
            totalPrice: true,
            startDate: true,
            endDate: true,
            vehicle: {
              select: {
                name: true,
                brand: true,
              },
            },
          },
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            vehicle: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/users/[id] - Update a user
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.USERS_UPDATE);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, status: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can manage this user
    if (!canManageUser(session.user.role as UserRole, targetUser.role)) {
      return NextResponse.json(
        { error: "You cannot modify users with equal or higher role" },
        { status: 403 }
      );
    }

    // Prevent self-demotion for admins
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot modify your own account through this endpoint" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, phone, role, status, password } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    const changes: Record<string, unknown> = {};

    if (name !== undefined) {
      updateData.name = name;
      changes.name = { from: null, to: name };
    }

    if (email !== undefined && email !== targetUser.email) {
      // Check if email is already in use
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
      updateData.email = email;
      changes.email = { from: targetUser.email, to: email };
    }

    if (phone !== undefined) {
      updateData.phone = phone;
      changes.phone = true;
    }

    if (role !== undefined && role !== targetUser.role) {
      // Check if user can assign this role
      if (!canAssignRole(session.user.role as UserRole, role as UserRole)) {
        return NextResponse.json(
          { error: "You cannot assign this role" },
          { status: 403 }
        );
      }
      updateData.role = role;
      changes.role = { from: targetUser.role, to: role };
    }

    if (status !== undefined && status !== targetUser.status) {
      updateData.status = status;
      changes.status = { from: targetUser.status, to: status };
    }

    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
      changes.password = "changed";
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        image: true,
        updatedAt: true,
      },
    });

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);

    // Determine specific action based on status change
    let action: "user.update" | "user.suspend" | "user.activate" | "user.ban" | "user.role_change" = "user.update";
    if (changes.status) {
      const newStatus = (changes.status as { to: string }).to;
      if (newStatus === "SUSPENDED") action = "user.suspend";
      else if (newStatus === "BANNED") action = "user.ban";
      else if (newStatus === "ACTIVE") action = "user.activate";
    } else if (changes.role) {
      action = "user.role_change";
    }

    await createAuditLog({
      userId: session.user.id,
      action,
      resource: "User",
      resourceId: id,
      details: changes,
      ipAddress,
      userAgent,
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id] - Delete a user
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permCheck = checkPermission(session.user.role as UserRole, PERMISSIONS.USERS_DELETE);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    // Get the target user
    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user can manage this user
    if (!canManageUser(session.user.role as UserRole, targetUser.role)) {
      return NextResponse.json(
        { error: "You cannot delete users with equal or higher role" },
        { status: 403 }
      );
    }

    // Prevent self-deletion
    if (session.user.id === id) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 403 }
      );
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "user.delete",
      resource: "User",
      resourceId: id,
      details: { email: targetUser.email, role: targetUser.role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    );
  }
}
