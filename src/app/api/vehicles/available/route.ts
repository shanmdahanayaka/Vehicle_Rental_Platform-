import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/vehicles/available - Get vehicles available for a date range
export async function GET(request: NextRequest) {
  try {
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

    // Get all active vehicles
    const allVehicles = await prisma.vehicle.findMany({
      where: {
        status: "ACTIVE",
      },
      select: {
        id: true,
        name: true,
        brand: true,
        model: true,
        pricePerDay: true,
        location: true,
        available: true,
        images: true,
      },
      orderBy: { name: "asc" },
    });

    // Get bookings that overlap with the requested date range
    // A booking overlaps if: booking.startDate < requestedEnd AND booking.endDate > requestedStart
    const conflictingBookings = await prisma.booking.findMany({
      where: {
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

    // Get set of vehicle IDs that are booked during this period
    const bookedVehicleIds = new Set(conflictingBookings.map((b) => b.vehicleId));

    // Filter to only available vehicles
    const availableVehicles = allVehicles.filter(
      (v) => !bookedVehicleIds.has(v.id)
    );

    // Format response
    const formattedVehicles = availableVehicles.map((v) => ({
      ...v,
      pricePerDay: Number(v.pricePerDay),
      available: true, // All returned vehicles are available for this period
    }));

    return NextResponse.json(formattedVehicles);
  } catch (error) {
    console.error("Error fetching available vehicles:", error);
    return NextResponse.json(
      { error: "Failed to fetch available vehicles" },
      { status: 500 }
    );
  }
}
