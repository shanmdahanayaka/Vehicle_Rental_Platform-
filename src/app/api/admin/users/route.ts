import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkPermissionDynamic, PERMISSIONS, canAssignRole } from "@/lib/permissions";
import { createAuditLog, getRequestInfo } from "@/lib/audit";
import bcrypt from "bcryptjs";
import { UserRole, UserStatus } from "@prisma/client";

// Helper to get user's actual role from database
async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/users - List all users with filters and pagination
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actual role from database (in case session is stale)
    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const permCheck = await checkPermissionDynamic(session.user.id, actualRole, PERMISSIONS.USERS_READ);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") as UserRole | null;
    const status = searchParams.get("status") as UserStatus | null;
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Get users and total count
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
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
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users - Create a new user
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get actual role from database (in case session is stale)
    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const permCheck = await checkPermissionDynamic(session.user.id, actualRole, PERMISSIONS.USERS_CREATE);
    if (!permCheck.allowed) {
      return NextResponse.json({ error: permCheck.reason }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, phone, role, status } = body;

    // For quick customer creation (from booking modal), only name and phone are required
    // Email and password are optional - we generate a temporary password if needed
    if (!name && !email) {
      return NextResponse.json(
        { error: "Name or email is required" },
        { status: 400 }
      );
    }

    // If email is provided, validate format
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: "Invalid email format" },
          { status: 400 }
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        return NextResponse.json(
          { error: "Email already registered" },
          { status: 400 }
        );
      }
    }

    // Check if phone already exists (if provided)
    if (phone) {
      const existingPhone = await prisma.user.findFirst({
        where: { phone },
      });

      if (existingPhone) {
        return NextResponse.json(
          { error: "Phone number already registered" },
          { status: 400 }
        );
      }
    }

    // Check if user can assign the requested role
    const requestedRole = (role as UserRole) || "USER";
    if (!canAssignRole(actualRole, requestedRole)) {
      return NextResponse.json(
        { error: "You cannot assign this role" },
        { status: 403 }
      );
    }

    // Use provided password, or phone number as initial password, or generate random
    const userPassword = password || phone || Math.random().toString(36).slice(-12);
    const hashedPassword = await bcrypt.hash(userPassword, 10);

    // Generate a placeholder email if not provided (required by schema)
    // Use phone number or random string to create unique placeholder
    const userEmail = email || `customer_${phone || Date.now()}@placeholder.local`;

    // Create user
    const user = await prisma.user.create({
      data: {
        name: name || "Customer",
        email: userEmail,
        password: hashedPassword,
        phone,
        role: requestedRole,
        status: (status as UserStatus) || "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
    });

    // Create audit log
    const { ipAddress, userAgent } = getRequestInfo(request);
    await createAuditLog({
      userId: session.user.id,
      action: "user.create",
      resource: "User",
      resourceId: user.id,
      details: { email: user.email, role: user.role },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ user, success: true }, { status: 201 });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}
