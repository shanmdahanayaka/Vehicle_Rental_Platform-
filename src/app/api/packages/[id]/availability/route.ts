import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/packages/[id]/availability?startDate=&endDate= - Check vehicle availability for package
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "startDate and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the package with its vehicles
    const pkg = await prisma.package.findUnique({
      where: {
        id,
        isActive: true,
      },
      include: {
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

    // Get vehicles for this package
    let packageVehicles;
    if (pkg.isGlobal) {
      // For global packages, get all available vehicles
      packageVehicles = await prisma.vehicle.findMany({
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
      });
    } else {
      // For non-global packages, get assigned available vehicles
      packageVehicles = pkg.vehiclePackages
        .filter((vp) => vp.vehicle.available === true)
        .map((vp) => vp.vehicle);
    }

    const vehicleIds = packageVehicles.map((v) => v.id);

    // Find bookings that conflict with the date range
    const conflictingBookings = await prisma.booking.findMany({
      where: {
        vehicleId: { in: vehicleIds },
        status: {
          in: ["PENDING", "CONFIRMED", "COLLECTED"],
        },
        startDate: { lt: end },
        endDate: { gt: start },
      },
      select: {
        vehicleId: true,
      },
    });

    const bookedVehicleIds = new Set(conflictingBookings.map((b) => b.vehicleId));

    // Build availability response with custom prices for non-global packages
    const vehiclePackagesMap = new Map(
      pkg.vehiclePackages.map((vp) => [vp.vehicleId, vp.customPrice])
    );

    const availableVehicles = packageVehicles
      .filter((v) => !bookedVehicleIds.has(v.id))
      .map((v) => ({
        ...v,
        pricePerDay: Number(v.pricePerDay),
        packagePrice: pkg.isGlobal ? null : (vehiclePackagesMap.get(v.id) ? Number(vehiclePackagesMap.get(v.id)) : null),
        available: true,
      }));

    const unavailableVehicles = packageVehicles
      .filter((v) => bookedVehicleIds.has(v.id))
      .map((v) => ({
        ...v,
        pricePerDay: Number(v.pricePerDay),
        packagePrice: pkg.isGlobal ? null : (vehiclePackagesMap.get(v.id) ? Number(vehiclePackagesMap.get(v.id)) : null),
        available: false,
      }));

    return NextResponse.json({
      packageId: pkg.id,
      packageName: pkg.name,
      startDate,
      endDate,
      availableCount: availableVehicles.length,
      unavailableCount: unavailableVehicles.length,
      vehicles: [...availableVehicles, ...unavailableVehicles].sort((a, b) => {
        // Sort by availability first, then by name
        if (a.available !== b.available) return a.available ? -1 : 1;
        return a.name.localeCompare(b.name);
      }),
    });
  } catch (error) {
    console.error("Error checking package availability:", error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
}
