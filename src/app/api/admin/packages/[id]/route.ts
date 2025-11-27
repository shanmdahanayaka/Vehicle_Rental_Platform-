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

// GET /api/admin/packages/[id] - Get single package
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

    const pkg = await prisma.package.findUnique({
      where: { id },
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
            bookings: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    return NextResponse.json(pkg);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/packages/[id] - Update package
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

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (basePrice !== undefined) updateData.basePrice = basePrice ? parseFloat(basePrice) : null;
    if (pricePerDay !== undefined) updateData.pricePerDay = pricePerDay ? parseFloat(pricePerDay) : null;
    if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour ? parseFloat(pricePerHour) : null;
    if (discount !== undefined) updateData.discount = discount ? parseFloat(discount) : null;
    if (minDuration !== undefined) updateData.minDuration = minDuration ? parseInt(minDuration) : null;
    if (maxDuration !== undefined) updateData.maxDuration = maxDuration ? parseInt(maxDuration) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder ? parseInt(sortOrder) : 0;
    if (icon !== undefined) updateData.icon = icon;

    // Update policies if provided
    if (policyIds !== undefined) {
      // Delete existing policies
      await prisma.packagePolicy.deleteMany({
        where: { packageId: id },
      });

      // Create new policies
      if (policyIds.length > 0) {
        await prisma.packagePolicy.createMany({
          data: policyIds.map((policyId: string) => ({
            packageId: id,
            policyId,
          })),
        });
      }
    }

    // Update vehicle assignments if provided
    if (vehicleIds !== undefined) {
      // Delete existing vehicle assignments
      await prisma.vehiclePackage.deleteMany({
        where: { packageId: id },
      });

      // Create new vehicle assignments (only if not global)
      const finalIsGlobal = isGlobal !== undefined ? isGlobal : (await prisma.package.findUnique({ where: { id }, select: { isGlobal: true } }))?.isGlobal;

      if (!finalIsGlobal && vehicleIds.length > 0) {
        await prisma.vehiclePackage.createMany({
          data: vehicleIds.map((vehicleId: string) => ({
            packageId: id,
            vehicleId,
          })),
        });
      }
    }

    const pkg = await prisma.package.update({
      where: { id },
      data: updateData,
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

    return NextResponse.json(pkg);
  } catch (error) {
    console.error("Error updating package:", error);
    return NextResponse.json(
      { error: "Failed to update package" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/packages/[id] - Delete package
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

    // Check if package has bookings
    const bookingsCount = await prisma.bookingPackage.count({
      where: { packageId: id },
    });

    if (bookingsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete package with existing bookings. Deactivate it instead." },
        { status: 400 }
      );
    }

    await prisma.package.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Package deleted successfully" });
  } catch (error) {
    console.error("Error deleting package:", error);
    return NextResponse.json(
      { error: "Failed to delete package" },
      { status: 500 }
    );
  }
}
