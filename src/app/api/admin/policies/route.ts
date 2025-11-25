import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/policies - List all policies
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get("includeInactive") === "true";
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (category) {
      where.category = category;
    }

    const policies = await prisma.policy.findMany({
      where,
      include: {
        _count: {
          select: {
            packagePolicies: true,
            vehiclePolicies: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(policies);
  } catch (error) {
    console.error("Error fetching policies:", error);
    return NextResponse.json(
      { error: "Failed to fetch policies" },
      { status: 500 }
    );
  }
}

// POST /api/admin/policies - Create a new policy
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      title,
      content,
      summary,
      category,
      isActive,
      isRequired,
      sortOrder,
    } = body;

    if (!name || !title || !content || !category) {
      return NextResponse.json(
        { error: "Name, title, content, and category are required" },
        { status: 400 }
      );
    }

    const policy = await prisma.policy.create({
      data: {
        name,
        title,
        content,
        summary,
        category,
        isActive: isActive ?? true,
        isRequired: isRequired ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(policy, { status: 201 });
  } catch (error) {
    console.error("Error creating policy:", error);
    return NextResponse.json(
      { error: "Failed to create policy" },
      { status: 500 }
    );
  }
}
