import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/policies/[id] - Get single policy
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const policy = await prisma.policy.findUnique({
      where: { id },
      include: {
        packagePolicies: {
          include: {
            package: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        vehiclePolicies: {
          include: {
            vehicle: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
    });

    if (!policy) {
      return NextResponse.json({ error: "Policy not found" }, { status: 404 });
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error fetching policy:", error);
    return NextResponse.json(
      { error: "Failed to fetch policy" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/policies/[id] - Update policy
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

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

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const policy = await prisma.policy.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json(policy);
  } catch (error) {
    console.error("Error updating policy:", error);
    return NextResponse.json(
      { error: "Failed to update policy" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/policies/[id] - Delete policy
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    const { id } = await params;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actualRole = await getUserRoleFromDb(session.user.id);
    if (!actualRole || !ADMIN_ROLES.includes(actualRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.policy.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Policy deleted successfully" });
  } catch (error) {
    console.error("Error deleting policy:", error);
    return NextResponse.json(
      { error: "Failed to delete policy" },
      { status: 500 }
    );
  }
}
