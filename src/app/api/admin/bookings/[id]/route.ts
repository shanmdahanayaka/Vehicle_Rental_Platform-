import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";
import { BookingStatus } from "@prisma/client";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Get the current booking to check status change
    const currentBooking = await prisma.booking.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!currentBooking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const booking = await prisma.booking.update({
      where: { id },
      data,
      include: { vehicle: true },
    });

    // Send notification if status changed
    if (data.status && data.status !== currentBooking.status) {
      const vehicleName = `${booking.vehicle.brand} ${booking.vehicle.model}`;
      const startDate = new Date(booking.startDate).toLocaleDateString();

      let notification;
      switch (data.status as BookingStatus) {
        case "CONFIRMED":
          notification = NotificationTemplates.bookingConfirmed(
            booking.id,
            vehicleName,
            startDate
          );
          break;
        case "CANCELLED":
          notification = NotificationTemplates.bookingCancelled(booking.id, vehicleName);
          break;
        case "COMPLETED":
          notification = {
            type: "BOOKING_CONFIRMED" as const,
            title: "Booking Completed",
            message: `Your rental of ${vehicleName} has been completed. Thank you for choosing us!`,
            data: { bookingId: booking.id },
          };
          break;
        default:
          notification = null;
      }

      if (notification) {
        await sendNotification({
          userId: booking.userId,
          ...notification,
        });
      }
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error("Error updating booking:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
