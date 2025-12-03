import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

// POST /api/admin/bookings - Create a new booking (admin)
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (!adminUser || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(adminUser.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      vehicleId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      packageIds,
      notes,
    } = body;

    // Validate required fields
    if (!userId || !vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "User, vehicle, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if vehicle exists and is available
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (!vehicle.available) {
      return NextResponse.json(
        { error: "Vehicle is not available" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Validate dates
    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check for overlapping bookings
    const overlappingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId,
        status: { notIn: ["CANCELLED", "COMPLETED", "INVOICED", "PAID"] },
        OR: [
          {
            AND: [
              { startDate: { lte: start } },
              { endDate: { gte: start } },
            ],
          },
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: end } },
            ],
          },
          {
            AND: [
              { startDate: { gte: start } },
              { endDate: { lte: end } },
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

    // Calculate rental days and price
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    let totalPrice = Number(vehicle.pricePerDay) * days;

    // Get packages if provided
    let packageData: { packageId: string; price: number }[] = [];
    if (packageIds && packageIds.length > 0) {
      const packages = await prisma.package.findMany({
        where: { id: { in: packageIds } },
      });

      packageData = packages.map((pkg) => {
        let price = 0;
        if (pkg.basePrice) {
          price = Number(pkg.basePrice);
        } else if (pkg.pricePerDay) {
          price = Number(pkg.pricePerDay) * days;
        } else if (pkg.pricePerHour) {
          price = Number(pkg.pricePerHour) * days * 24; // Rough estimate
        }

        // Apply discount if any
        if (pkg.discount && Number(pkg.discount) > 0) {
          price = price * (1 - Number(pkg.discount) / 100);
        }

        return { packageId: pkg.id, price };
      });

      // Add package prices to total
      totalPrice += packageData.reduce((sum, p) => sum + p.price, 0);
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice,
        status: "PENDING",
        pickupLocation: pickupLocation || vehicle.location,
        dropoffLocation: dropoffLocation || vehicle.location,
        confirmationNotes: notes || null,
        packages: {
          create: packageData.map((p) => ({
            packageId: p.packageId,
            price: p.price,
          })),
        },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        vehicle: {
          select: { id: true, name: true, brand: true, model: true, pricePerDay: true },
        },
        packages: {
          include: {
            package: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    });

    // Send notification to user
    await sendNotification({
      userId: user.id,
      ...NotificationTemplates.bookingCreated(booking.id, vehicle.name),
    });

    return NextResponse.json(
      {
        success: true,
        booking: {
          ...booking,
          totalPrice: Number(booking.totalPrice),
          vehicle: {
            ...booking.vehicle,
            pricePerDay: Number(booking.vehicle.pricePerDay),
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Failed to create booking" },
      { status: 500 }
    );
  }
}
