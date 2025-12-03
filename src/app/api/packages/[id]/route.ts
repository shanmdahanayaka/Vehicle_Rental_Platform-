import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/packages/[id] - Get package detail with vehicles
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;

    const pkg = await prisma.package.findUnique({
      where: {
        id,
        isActive: true,
      },
      include: {
        policies: {
          include: {
            policy: {
              select: {
                id: true,
                name: true,
                title: true,
                summary: true,
                content: true,
                category: true,
                isRequired: true,
              },
            },
          },
        },
        customCosts: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            isOptional: true,
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
                year: true,
                pricePerDay: true,
                images: true,
                transmission: true,
                fuelType: true,
                seats: true,
                available: true,
              },
            },
          },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // If package is global, get all available vehicles
    let vehicles;
    if (pkg.isGlobal) {
      const allVehicles = await prisma.vehicle.findMany({
        where: { available: true },
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          year: true,
          pricePerDay: true,
          images: true,
          transmission: true,
          fuelType: true,
          seats: true,
          available: true,
        },
        orderBy: { name: "asc" },
      });

      vehicles = allVehicles.map((v) => ({
        ...v,
        pricePerDay: Number(v.pricePerDay),
        packagePrice: null, // No custom price for global packages
      }));
    } else {
      // Get vehicles assigned to this package with their custom prices
      vehicles = pkg.vehiclePackages
        .filter((vp) => vp.vehicle.available === true)
        .map((vp) => ({
          ...vp.vehicle,
          pricePerDay: Number(vp.vehicle.pricePerDay),
          packagePrice: vp.customPrice ? Number(vp.customPrice) : null,
        }));
    }

    // Calculate total required custom costs
    const requiredCostsTotal = pkg.customCosts
      .filter((cost) => !cost.isOptional)
      .reduce((sum, cost) => sum + Number(cost.price), 0);

    // Build response
    const response = {
      id: pkg.id,
      name: pkg.name,
      description: pkg.description,
      type: pkg.type,
      basePrice: pkg.basePrice ? Number(pkg.basePrice) : null,
      pricePerDay: pkg.pricePerDay ? Number(pkg.pricePerDay) : null,
      pricePerHour: pkg.pricePerHour ? Number(pkg.pricePerHour) : null,
      discount: pkg.discount ? Number(pkg.discount) : null,
      minDuration: pkg.minDuration,
      maxDuration: pkg.maxDuration,
      icon: pkg.icon,
      isGlobal: pkg.isGlobal,
      policies: pkg.policies.map((pp) => pp.policy),
      customCosts: pkg.customCosts.map((cost) => ({
        id: cost.id,
        name: cost.name,
        description: cost.description,
        price: Number(cost.price),
        isOptional: cost.isOptional,
      })),
      vehicles,
      requiredCostsTotal,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching package:", error);
    return NextResponse.json(
      { error: "Failed to fetch package" },
      { status: 500 }
    );
  }
}
