import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/packages - Get active packages (public)
// Can optionally filter by vehicleId to get packages available for a specific vehicle
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    const type = searchParams.get("type");

    // Get all active global packages
    const whereGlobal: Record<string, unknown> = {
      isActive: true,
      isGlobal: true,
    };
    if (type) {
      whereGlobal.type = type;
    }

    const globalPackages = await prisma.package.findMany({
      where: whereGlobal,
      include: {
        policies: {
          include: {
            policy: {
              select: {
                id: true,
                name: true,
                title: true,
                summary: true,
                category: true,
                isRequired: true,
              },
            },
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });

    // If vehicleId provided, also get vehicle-specific packages
    let vehiclePackages: typeof globalPackages = [];
    if (vehicleId) {
      const vehicleSpecificPackages = await prisma.vehiclePackage.findMany({
        where: {
          vehicleId,
          package: {
            isActive: true,
            isGlobal: false,
          },
        },
        include: {
          package: {
            include: {
              policies: {
                include: {
                  policy: {
                    select: {
                      id: true,
                      name: true,
                      title: true,
                      summary: true,
                      category: true,
                      isRequired: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      vehiclePackages = vehicleSpecificPackages.map((vp) => ({
        ...vp.package,
        // Override with custom price if set
        basePrice: vp.customPrice || vp.package.basePrice,
      }));
    }

    // Combine and deduplicate
    const allPackages = [...globalPackages, ...vehiclePackages];

    // Transform to cleaner response
    const response = allPackages.map((pkg) => ({
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
      policies: pkg.policies.map((pp) => pp.policy),
    }));

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching packages:", error);
    return NextResponse.json(
      { error: "Failed to fetch packages" },
      { status: 500 }
    );
  }
}
