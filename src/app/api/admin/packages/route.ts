import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole, PackageType } from "@prisma/client";

// Roles that can manage packages
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN"];

// Helper to get user's actual role from database
async function getUserRoleFromDb(userId: string): Promise<UserRole | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role || null;
}

// GET /api/admin/packages - List all packages
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
    const type = searchParams.get("type") as PackageType | null;

    const where: Record<string, unknown> = {};
    if (!includeInactive) {
      where.isActive = true;
    }
    if (type) {
      where.type = type;
    }

    const packages = await prisma.package.findMany({
      where,
      include: {
        policies: {
          include: {
            policy: true,
          },
        },
        vehiclePackages: {
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
        _count: {
          select: {
            vehiclePackages: true,
            bookings: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}

// POST /api/admin/packages - Create a new package
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
      description,
      type,
      basePrice,
      pricePerDay,
      pricePerHour,
      discount,
      minDuration,
      maxDuration,
      isActive,
      isGlobal,
      sortOrder,
      icon,
      policyIds,
      vehicleIds,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    const pkg = await prisma.package.create({
      data: {
        name,
        description,
        type,
        basePrice: basePrice ? parseFloat(basePrice) : null,
        pricePerDay: pricePerDay ? parseFloat(pricePerDay) : null,
        pricePerHour: pricePerHour ? parseFloat(pricePerHour) : null,
        discount: discount ? parseFloat(discount) : null,
        minDuration: minDuration ? parseInt(minDuration) : null,
        maxDuration: maxDuration ? parseInt(maxDuration) : null,
        isActive: isActive ?? true,
        isGlobal: isGlobal ?? true,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        icon,
        policies: policyIds?.length
          ? {
              create: policyIds.map((policyId: string) => ({
                policyId,
              })),
            }
          : undefined,
        vehiclePackages: !isGlobal && vehicleIds?.length
          ? {
              create: vehicleIds.map((vehicleId: string) => ({
                vehicleId,
              })),
            }
          : undefined,
      },
      include: {
        policies: {
          include: {
            policy: true,
          },
        },
        vehiclePackages: {
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

    return NextResponse.json(pkg, { status: 201 });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
}
