import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { UserRole } from "@prisma/client";
import { sendNotification, notifyAdmins, NotificationTemplates } from "@/lib/notifications";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";

// Roles that can view all bookings
const ADMIN_ROLES: UserRole[] = ["ADMIN", "SUPER_ADMIN", "MANAGER"];

export async function GET() {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check user status from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true, role: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is not active" },
        { status: 403 }
      );
    }

    const where = ADMIN_ROLES.includes(user.role)
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
        packages: {
          include: {
            package: true,
          },
        },
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

    // Check user status from database
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { status: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Your account is not active. Cannot create bookings." },
        { status: 403 }
      );
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
        status: { in: ["PENDING", "CONFIRMED", "COLLECTED"] },
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

    let basePrice = Number(vehicle.pricePerDay) * days;
    let packagesPrice = 0;
    let maxDiscount = 0;

    // Get selected packages and calculate their prices
    const packageIds: string[] = data.packageIds || [];
    const selectedPackages = packageIds.length > 0
      ? await prisma.package.findMany({
          where: {
            id: { in: packageIds },
            isActive: true,
          },
        })
      : [];

    // Calculate package prices and max discount
    const bookingPackagesData: { packageId: string; price: number; quantity: number }[] = [];

    for (const pkg of selectedPackages) {
      let pkgPrice = 0;

      if (pkg.basePrice) {
        pkgPrice = Number(pkg.basePrice);
      } else if (pkg.pricePerDay) {
        pkgPrice = Number(pkg.pricePerDay) * days;
      }

      if (pkgPrice > 0) {
        packagesPrice += pkgPrice;
        bookingPackagesData.push({
          packageId: pkg.id,
          price: pkgPrice,
          quantity: 1,
        });
      } else {
        // Package with no price (e.g., discount only)
        bookingPackagesData.push({
          packageId: pkg.id,
          price: 0,
          quantity: 1,
        });
      }

      // Track max discount
      if (pkg.discount && Number(pkg.discount) > maxDiscount) {
        maxDiscount = Number(pkg.discount);
      }
    }

    // Apply discount to base price
    if (maxDiscount > 0) {
      basePrice = basePrice * (1 - maxDiscount / 100);
    }

    const totalPrice = basePrice + packagesPrice;

    // Create booking with packages
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        vehicleId: data.vehicleId,
        startDate,
        endDate,
        totalPrice,
        pickupLocation: data.pickupLocation,
        dropoffLocation: data.dropoffLocation,
        packages: {
          create: bookingPackagesData,
        },
      },
      include: {
        vehicle: true,
        packages: {
          include: {
            package: true,
          },
        },
      },
    });

    // Send notification to the user who created the booking
    const vehicleName = `${vehicle.brand} ${vehicle.model}`;
    const userNotification = NotificationTemplates.bookingCreated(booking.id, vehicleName);
    await sendNotification({
      userId: session.user.id,
      ...userNotification,
    });

    // Notify all admins about the new booking
    await notifyAdmins({
      type: "BOOKING_CREATED",
      title: "New Booking Created",
      message: `A new booking for ${vehicleName} has been created by ${session.user.name || session.user.email}.`,
      data: { bookingId: booking.id, userId: session.user.id },
    });

    // Real-time sync for admin dashboard
    await pusherServer.trigger(
      CHANNELS.adminBookings,
      EVENTS.NEW_BOOKING,
      {
        bookingId: booking.id,
        message: "New booking created",
      }
    );

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error("Error creating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
