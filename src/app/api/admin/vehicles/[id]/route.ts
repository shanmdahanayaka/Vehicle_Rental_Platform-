import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    // Check if trying to change availability
    if (data.available !== undefined) {
      // Check for active bookings (PENDING, CONFIRMED, or COLLECTED)
      const activeBookings = await prisma.booking.findMany({
        where: {
          vehicleId: id,
          status: {
            in: ["PENDING", "CONFIRMED", "COLLECTED"],
          },
        },
        select: {
          id: true,
          status: true,
          startDate: true,
          endDate: true,
        },
      });

      if (activeBookings.length > 0) {
        const bookingDetails = activeBookings.map((b) => ({
          id: b.id,
          status: b.status,
          dates: `${new Date(b.startDate).toLocaleDateString()} - ${new Date(b.endDate).toLocaleDateString()}`,
        }));

        return NextResponse.json(
          {
            error: "Cannot change availability",
            message: `This vehicle has ${activeBookings.length} active booking(s). Please complete or cancel them first.`,
            activeBookings: bookingDetails,
          },
          { status: 400 }
        );
      }
    }

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data,
    });

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error("Error updating vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await prisma.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
