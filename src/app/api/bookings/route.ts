import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const where = session.user.role === "ADMIN"
      ? {}
      : { userId: session.user.id };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        vehicle: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(bookings);
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    // Check vehicle availability
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: data.vehicleId },
    });

    if (!vehicle || !vehicle.available) {
      return NextResponse.json(
        { error: "Vehicle not available" },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId: data.vehicleId,
        status: { in: ["PENDING", "CONFIRMED", "ACTIVE"] },
        OR: [
          {
            AND: [
              { startDate: { lte: new Date(data.startDate) } },
              { endDate: { gte: new Date(data.startDate) } },
            ],
          },
          {
            AND: [
              { startDate: { lte: new Date(data.endDate) } },
              { endDate: { gte: new Date(data.endDate) } },
            ],
          },
          {
            AND: [
              { startDate: { gte: new Date(data.startDate) } },
              { endDate: { lte: new Date(data.endDate) } },
            ],
          },
        ],
      },
    });

    if (overlappingBooking) {
      return NextResponse.json(
        { error: "Vehicle is already booked for these dates" },
        { status: 400 }
      );
    }

    // Calculate total price
    const startDate = new Date(data.startDate);
    const endDate = new Date(data.endDate);
    const days = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = Number(vehicle.pricePerDay) * days;

    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        vehicleId: data.vehicleId,
        startDate,
        endDate,
        totalPrice,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
      },
      include: {
        vehicle: true,
      },
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
