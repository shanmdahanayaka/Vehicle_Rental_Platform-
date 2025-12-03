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
                pricePerDay: true,
              },
            },
          },
        },
        customCosts: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
        _count: {
          select: {
            vehiclePackages: true,
            bookings: true,
            customCosts: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    });

    // Format decimal values
    const formattedPackages = packages.map((pkg) => ({
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
    }));

    return NextResponse.json(formattedPackages);
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
      images,
      videoUrl,
      policyIds,
      vehicleIds,
      customCosts,
      vehiclePackages: vehiclePackagesData,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: "Name and type are required" },
        { status: 400 }
      );
    }

    // Build vehicle packages data - support both old format (vehicleIds) and new format (vehiclePackages with customPrice)
    let vehiclePackagesCreate;
    if (vehiclePackagesData?.length) {
      // New format: array of { vehicleId, customPrice }
      vehiclePackagesCreate = vehiclePackagesData.map((vp: { vehicleId: string; customPrice?: number | string }) => ({
        vehicleId: vp.vehicleId,
        customPrice: vp.customPrice ? parseFloat(String(vp.customPrice)) : null,
      }));
    } else if (!isGlobal && vehicleIds?.length) {
      // Old format: array of vehicle IDs (backwards compatible)
      vehiclePackagesCreate = vehicleIds.map((vehicleId: string) => ({
        vehicleId,
        customPrice: null,
      }));
    }

    const pkg = await prisma.package.create({
      data: {
        name,
        description,
        type,
        basePrice: basePrice ? parseFloat(String(basePrice)) : null,
        pricePerDay: pricePerDay ? parseFloat(String(pricePerDay)) : null,
        pricePerHour: pricePerHour ? parseFloat(String(pricePerHour)) : null,
        discount: discount ? parseFloat(String(discount)) : null,
        minDuration: minDuration ? parseInt(String(minDuration)) : null,
        maxDuration: maxDuration ? parseInt(String(maxDuration)) : null,
        isActive: isActive ?? true,
        isGlobal: isGlobal ?? true,
        sortOrder: sortOrder ? parseInt(String(sortOrder)) : 0,
        icon,
        images: images ? JSON.stringify(images) : null,
        videoUrl: videoUrl || null,
        policies: policyIds?.length
          ? {
              create: policyIds.map((policyId: string) => ({
                policyId,
              })),
            }
          : undefined,
        vehiclePackages: vehiclePackagesCreate?.length
          ? {
              create: vehiclePackagesCreate,
            }
          : undefined,
        customCosts: customCosts?.length
          ? {
              create: customCosts.map((cost: { name: string; description?: string; price: number | string; isOptional?: boolean; sortOrder?: number }, index: number) => ({
                name: cost.name,
                description: cost.description || null,
                price: parseFloat(String(cost.price)),
                isOptional: cost.isOptional ?? false,
                sortOrder: cost.sortOrder ?? index,
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

    // Format response
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

    return NextResponse.json(formattedPkg, { status: 201 });
  } catch (error) {
    console.error("Error creating package:", error);
    return NextResponse.json(
      { error: "Failed to create package" },
      { status: 500 }
    );
  }
}
