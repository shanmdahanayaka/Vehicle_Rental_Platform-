import { prisma } from "@/lib/prisma";
import BookingTable from "./BookingTable";

async function getBookings() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      vehicle: { select: { id: true, name: true, brand: true, model: true } },
      payment: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((booking) => ({
    ...booking,
    totalPrice: Number(booking.totalPrice),
    payment: booking.payment
      ? { ...booking.payment, amount: Number(booking.payment.amount) }
      : null,
  }));
}

export default async function AdminBookingsPage() {
  const bookings = await getBookings();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
        <p className="text-slate-500">Manage all customer reservations</p>
      </div>

      {/* Booking Table */}
      <BookingTable initialBookings={bookings} />
    </div>
  );
}
