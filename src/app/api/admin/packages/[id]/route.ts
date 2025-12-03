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
                pricePerDay: true,
              },
            },
          },
        },
        customCosts: {
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            bookings: true,
            customCosts: true,
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // Format decimal values
    const formattedPkg = {
      ...pkg,
      basePrice: pkg.basePrice ? Number(pkg.basePrice) : null,
      pricePerDay: pkg.pricePerDay ? Number(pkg.pricePerDay) : null,
      pricePerHour: pkg.pricePerHour ? Number(pkg.pricePerHour) : null,
      discount: pkg.discount ? Number(pkg.discount) : null,
      customCosts: pkg.customCosts.map((cost) => ({
        ...cost,
        price: Number(cost.price),
      })),
      vehiclePackages: pkg.vehiclePackages.map((vp) => ({
        ...vp,
        customPrice: vp.customPrice ? Number(vp.customPrice) : null,
        vehicle: {
          ...vp.vehicle,
          pricePerDay: Number(vp.vehicle.pricePerDay),
        },
      })),
    };

    return NextResponse.json(formattedPkg);
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
      images,
      videoUrl,
      policyIds,
      vehicleIds,
      customCosts,
      vehiclePackages: vehiclePackagesData,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (basePrice !== undefined) updateData.basePrice = basePrice ? parseFloat(String(basePrice)) : null;
    if (pricePerDay !== undefined) updateData.pricePerDay = pricePerDay ? parseFloat(String(pricePerDay)) : null;
    if (pricePerHour !== undefined) updateData.pricePerHour = pricePerHour ? parseFloat(String(pricePerHour)) : null;
    if (discount !== undefined) updateData.discount = discount ? parseFloat(String(discount)) : null;
    if (minDuration !== undefined) updateData.minDuration = minDuration ? parseInt(String(minDuration)) : null;
    if (maxDuration !== undefined) updateData.maxDuration = maxDuration ? parseInt(String(maxDuration)) : null;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (isGlobal !== undefined) updateData.isGlobal = isGlobal;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder ? parseInt(String(sortOrder)) : 0;
    if (icon !== undefined) updateData.icon = icon;
    if (images !== undefined) updateData.images = images ? JSON.stringify(images) : null;
    if (videoUrl !== undefined) updateData.videoUrl = videoUrl || null;

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

    // Update vehicle packages if provided (new format with customPrice support)
    if (vehiclePackagesData !== undefined) {
      // Delete existing vehicle assignments
      await prisma.vehiclePackage.deleteMany({
        where: { packageId: id },
      });

      // Create new vehicle assignments with custom prices
      const finalIsGlobal = isGlobal !== undefined ? isGlobal : (await prisma.package.findUnique({ where: { id }, select: { isGlobal: true } }))?.isGlobal;

      if (!finalIsGlobal && vehiclePackagesData.length > 0) {
        await prisma.vehiclePackage.createMany({
          data: vehiclePackagesData.map((vp: { vehicleId: string; customPrice?: number | string }) => ({
            packageId: id,
            vehicleId: vp.vehicleId,
            customPrice: vp.customPrice ? parseFloat(String(vp.customPrice)) : null,
          })),
        });
      }
    } else if (vehicleIds !== undefined) {
      // Old format: array of vehicle IDs (backwards compatible)
      await prisma.vehiclePackage.deleteMany({
        where: { packageId: id },
      });

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

    // Update custom costs if provided
    if (customCosts !== undefined) {
      // Get existing custom costs to determine which to update/delete/create
      const existingCosts = await prisma.packageCustomCost.findMany({
        where: { packageId: id },
      });
      const existingIds = existingCosts.map((c) => c.id);

      // Separate into update, create, and delete operations
      const costsToUpdate: { id: string; name: string; description?: string; price: number; isOptional?: boolean; sortOrder?: number }[] = [];
      const costsToCreate: { name: string; description?: string; price: number; isOptional?: boolean; sortOrder?: number }[] = [];
      const updatedIds: string[] = [];

      customCosts.forEach((cost: { id?: string; name: string; description?: string; price: number | string; isOptional?: boolean; sortOrder?: number }, index: number) => {
        if (cost.id && existingIds.includes(cost.id)) {
          // Update existing
          costsToUpdate.push({
            id: cost.id,
            name: cost.name,
            description: cost.description,
            price: parseFloat(String(cost.price)),
            isOptional: cost.isOptional,
            sortOrder: cost.sortOrder ?? index,
          });
          updatedIds.push(cost.id);
        } else if (!cost.id) {
          // Create new
          costsToCreate.push({
            name: cost.name,
            description: cost.description,
            price: parseFloat(String(cost.price)),
            isOptional: cost.isOptional ?? false,
            sortOrder: cost.sortOrder ?? index,
          });
        }
      });

      // Delete costs that are no longer in the list
      const idsToDelete = existingIds.filter((id) => !updatedIds.includes(id));
      if (idsToDelete.length > 0) {
        await prisma.packageCustomCost.deleteMany({
          where: { id: { in: idsToDelete } },
        });
      }

      // Update existing costs
      for (const cost of costsToUpdate) {
        await prisma.packageCustomCost.update({
          where: { id: cost.id },
          data: {
            name: cost.name,
            description: cost.description || null,
            price: cost.price,
            isOptional: cost.isOptional ?? false,
            sortOrder: cost.sortOrder ?? 0,
          },
        });
      }

      // Create new costs
      if (costsToCreate.length > 0) {
        await prisma.packageCustomCost.createMany({
          data: costsToCreate.map((cost) => ({
            packageId: id,
            name: cost.name,
            description: cost.description || null,
            price: cost.price,
            isOptional: cost.isOptional ?? false,
            sortOrder: cost.sortOrder ?? 0,
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
                pricePerDay: true,
              },
            },
          },
        },
        customCosts: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    // Format decimal values
    const formattedPkg = {
      ...pkg,
      basePrice: pkg.basePrice ? Number(pkg.basePrice) : null,
      pricePerDay: pkg.pricePerDay ? Number(pkg.pricePerDay) : null,
      pricePerHour: pkg.pricePerHour ? Number(pkg.pricePerHour) : null,
      discount: pkg.discount ? Number(pkg.discount) : null,
      customCosts: pkg.customCosts.map((cost) => ({
        ...cost,
        price: Number(cost.price),
      })),
      vehiclePackages: pkg.vehiclePackages.map((vp) => ({
        ...vp,
        customPrice: vp.customPrice ? Number(vp.customPrice) : null,
        vehicle: {
          ...vp.vehicle,
          pricePerDay: Number(vp.vehicle.pricePerDay),
        },
      })),
    };

    return NextResponse.json(formattedPkg);
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
