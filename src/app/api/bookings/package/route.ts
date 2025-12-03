import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNotification, notifyAdmins, NotificationTemplates } from "@/lib/notifications";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";

// POST /api/bookings/package - Create a package booking
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      packageId,
      vehicleId,
      startDate,
      endDate,
      pickupLocation,
      dropoffLocation,
      selectedCustomCostIds, // Array of custom cost IDs to include
      notes,
    } = body;

    // Validate required fields
    if (!packageId || !vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Package, vehicle, start date and end date are required" },
        { status: 400 }
      );
    }

    // Get the package with custom costs
    const pkg = await prisma.package.findUnique({
      where: {
        id: packageId,
        isActive: true,
      },
      include: {
        customCosts: {
          where: { isActive: true },
        },
        vehiclePackages: {
          where: { vehicleId },
        },
      },
    });

    if (!pkg) {
      return NextResponse.json({ error: "Package not found or inactive" }, { status: 404 });
    }

    // Get the vehicle
    const vehicle = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        available: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found or inactive" }, { status: 404 });
    }

    // For non-global packages, verify vehicle is assigned to this package
    if (!pkg.isGlobal) {
      const vehiclePackage = pkg.vehiclePackages.find((vp) => vp.vehicleId === vehicleId);
      if (!vehiclePackage) {
        return NextResponse.json(
          { error: "Vehicle is not available for this package" },
          { status: 400 }
        );
      }
    }

    // Parse dates and calculate duration
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    if (days < 1) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Check duration constraints
    if (pkg.minDuration && days < pkg.minDuration) {
      return NextResponse.json(
        { error: `Minimum duration for this package is ${pkg.minDuration} days` },
        { status: 400 }
      );
    }
    if (pkg.maxDuration && days > pkg.maxDuration) {
      return NextResponse.json(
        { error: `Maximum duration for this package is ${pkg.maxDuration} days` },
        { status: 400 }
      );
    }

    // Check vehicle availability for the date range
    const conflictingBooking = await prisma.booking.findFirst({
      where: {
        vehicleId,
        status: { in: ["PENDING", "CONFIRMED", "COLLECTED"] },
        startDate: { lt: end },
        endDate: { gt: start },
      },
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: "Vehicle is not available for the selected dates" },
        { status: 400 }
      );
    }

    // Calculate pricing
    const packageBasePrice = pkg.basePrice ? Number(pkg.basePrice) : 0;

    // Get vehicle package price (custom price or default)
    const vehiclePackage = pkg.vehiclePackages.find((vp) => vp.vehicleId === vehicleId);
    const vehiclePackagePrice = vehiclePackage?.customPrice
      ? Number(vehiclePackage.customPrice)
      : Number(vehicle.pricePerDay);

    // Calculate custom costs
    // Required costs are always included, optional costs only if selected
    const selectedCostIdSet = new Set(selectedCustomCostIds || []);
    const applicableCosts = pkg.customCosts.filter(
      (cost) => !cost.isOptional || selectedCostIdSet.has(cost.id)
    );
    const customCostsTotal = applicableCosts.reduce(
      (sum, cost) => sum + Number(cost.price),
      0
    );

    // Calculate total: Base Price + Custom Costs + (Vehicle Price × Days)
    const vehicleRentalTotal = vehiclePackagePrice * days;
    const totalAmount = packageBasePrice + customCostsTotal + vehicleRentalTotal;

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Create the booking with package details
    const booking = await prisma.booking.create({
      data: {
        userId: session.user.id,
        vehicleId,
        startDate: start,
        endDate: end,
        totalPrice: totalAmount,
        status: "PENDING",
        pickupLocation: pickupLocation || "To be confirmed",
        dropoffLocation: dropoffLocation || "To be confirmed",
        confirmationNotes: notes || null,
        // Package booking specific fields
        isPackageBooking: true,
        primaryPackageId: packageId,
        packageBasePrice,
        vehiclePackagePrice,
        customCostsTotal,
        // Create booking package record (for backwards compatibility with existing package selection)
        packages: {
          create: {
            packageId,
            price: packageBasePrice,
          },
        },
        // Create custom cost records
        customCosts: {
          create: applicableCosts.map((cost) => ({
            packageCustomCostId: cost.id,
            name: cost.name, // Snapshot the name
            price: Number(cost.price), // Snapshot the price
          })),
        },
      },
      include: {
        vehicle: {
          select: {
            id: true,
            name: true,
            brand: true,
            model: true,
            images: true,
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        packages: {
          include: {
            package: true,
          },
        },
        customCosts: true,
        primaryPackage: true,
      },
    });

    // Format start date for notifications
    const formattedStartDate = start.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Send notification to user with package-specific template
    const userTemplate = NotificationTemplates.packageBookingCreated(
      booking.id,
      pkg.name,
      `${vehicle.brand} ${vehicle.model}`,
      formattedStartDate
    );
    await sendNotification({
      userId: session.user.id,
      title: userTemplate.title,
      message: userTemplate.message,
      type: userTemplate.type,
      data: userTemplate.data,
    });

    // Notify all admins about the new package booking
    const adminTemplate = NotificationTemplates.adminNewPackageBooking(
      booking.id,
      user.name || user.email || "Customer",
      pkg.name,
      `${vehicle.brand} ${vehicle.model}`,
      totalAmount
    );
    await notifyAdmins({
      title: adminTemplate.title,
      message: adminTemplate.message,
      type: adminTemplate.type,
      data: adminTemplate.data,
    });

    // Notify admin dashboard of new booking (real-time sync)
    await pusherServer.trigger(
      CHANNELS.adminBookings,
      EVENTS.NEW_BOOKING,
      {
        bookingId: booking.id,
        message: `New package booking: ${pkg.name}`,
        isPackageBooking: true,
        packageName: pkg.name,
        customerName: user.name || user.email,
      }
    );

    // Format response
    const response = {
      ...booking,
      totalPrice: Number(booking.totalPrice),
      packageBasePrice: Number(booking.packageBasePrice),
      vehiclePackagePrice: Number(booking.vehiclePackagePrice),
      customCostsTotal: Number(booking.customCostsTotal),
      customCosts: booking.customCosts.map((cc) => ({
        ...cc,
        price: Number(cc.price),
      })),
      pricing: {
        packageBase: packageBasePrice,
        customCosts: customCostsTotal,
        vehicleRental: vehicleRentalTotal,
        days,
        dailyRate: vehiclePackagePrice,
        total: totalAmount,
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Error creating package booking:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to create booking", details: errorMessage },
      { status: 500 }
    );
  }
}
