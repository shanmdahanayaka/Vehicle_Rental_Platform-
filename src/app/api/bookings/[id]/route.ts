import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, notifyAdmins } from "@/lib/notifications";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";

// GET /api/bookings/[id] - Get a specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
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
          include: { package: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Users can only view their own bookings, admins can view all
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);
    if (!isAdmin && booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/bookings/[id] - Update booking (cancel)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Users can only modify their own bookings
    const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);
    if (!isAdmin && booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Handle cancel action
    if (action === "cancel") {
      // Users can only cancel PENDING or CONFIRMED bookings
      const userCancellableStatuses = ["PENDING", "CONFIRMED"];

      if (!isAdmin && !userCancellableStatuses.includes(booking.status)) {
        return NextResponse.json(
          { error: "This booking cannot be cancelled. Please contact support." },
          { status: 400 }
        );
      }

      // Admins can cancel more statuses but not completed/paid ones
      if (isAdmin && ["COMPLETED", "INVOICED", "PAID"].includes(booking.status)) {
        return NextResponse.json(
          { error: "Cannot cancel a completed or invoiced booking" },
          { status: 400 }
        );
      }

      const updatedBooking = await prisma.booking.update({
        where: { id },
        data: {
          status: "CANCELLED",
        },
        include: { vehicle: true, user: true },
      });

      // If vehicle was collected, make it available again
      if (booking.status === "COLLECTED") {
        await prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { available: true },
        });
      }

      // Send notification to user
      const vehicleName = `${booking.vehicle.brand} ${booking.vehicle.model}`;
      await sendNotification({
        userId: booking.userId,
        type: "BOOKING_CANCELLED",
        title: "Booking Cancelled",
        message: `Your booking for ${vehicleName} has been cancelled.`,
        data: { bookingId: booking.id },
      });

      // Notify admins if user cancelled
      if (!isAdmin) {
        await notifyAdmins({
          type: "BOOKING_CANCELLED",
          title: "Booking Cancelled by User",
          message: `${booking.user.name || booking.user.email} cancelled their booking for ${vehicleName}.`,
          data: { bookingId: booking.id, userId: booking.userId },
        });
      }

      // Real-time sync for admin dashboard
      await pusherServer.trigger(
        CHANNELS.adminBookings,
        EVENTS.BOOKING_UPDATED,
        {
          bookingId: booking.id,
          status: "CANCELLED",
          message: "Booking cancelled",
        }
      );

      return NextResponse.json({
        success: true,
        message: "Booking cancelled successfully",
        booking: updatedBooking,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/bookings/[id] - Delete booking (admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    await prisma.booking.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Booking deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
