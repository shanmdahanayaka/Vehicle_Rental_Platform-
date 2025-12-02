import { prisma } from "@/lib/prisma";
import BookingTable from "./BookingTable";

async function getBookings() {
  const bookings = await prisma.booking.findMany({
    include: {
      user: { select: { id: true, name: true, email: true, phone: true } },
      vehicle: {
        select: {
          id: true,
          name: true,
          brand: true,
          model: true,
          pricePerDay: true,
        }
      },
      payment: true,
      packages: {
        include: { package: true },
      },
      documents: {
        orderBy: { createdAt: "desc" },
      },
      invoice: {
        include: {
          payments: {
            orderBy: { paidAt: "desc" },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((booking) => ({
    ...booking,
    totalPrice: Number(booking.totalPrice),
    advanceAmount: booking.advanceAmount ? Number(booking.advanceAmount) : null,
    extraMileageRate: booking.extraMileageRate ? Number(booking.extraMileageRate) : null,
    extraMileageCost: booking.extraMileageCost ? Number(booking.extraMileageCost) : null,
    fuelCharge: booking.fuelCharge ? Number(booking.fuelCharge) : null,
    damageCharge: booking.damageCharge ? Number(booking.damageCharge) : null,
    lateReturnCharge: booking.lateReturnCharge ? Number(booking.lateReturnCharge) : null,
    otherCharges: booking.otherCharges ? Number(booking.otherCharges) : null,
    discountAmount: booking.discountAmount ? Number(booking.discountAmount) : null,
    finalAmount: booking.finalAmount ? Number(booking.finalAmount) : null,
    balanceDue: booking.balanceDue ? Number(booking.balanceDue) : null,
    payment: booking.payment
      ? { ...booking.payment, amount: Number(booking.payment.amount) }
      : null,
    vehicle: {
      ...booking.vehicle,
      pricePerDay: Number(booking.vehicle.pricePerDay),
    },
    packages: booking.packages.map((bp) => ({
      ...bp,
      price: Number(bp.price),
      package: {
        ...bp.package,
        basePrice: bp.package.basePrice ? Number(bp.package.basePrice) : null,
        pricePerDay: bp.package.pricePerDay ? Number(bp.package.pricePerDay) : null,
      },
    })),
    invoice: booking.invoice
      ? {
          ...booking.invoice,
          dailyRate: Number(booking.invoice.dailyRate),
          rentalAmount: Number(booking.invoice.rentalAmount),
          extraMileageRate: booking.invoice.extraMileageRate ? Number(booking.invoice.extraMileageRate) : null,
          extraMileageCost: booking.invoice.extraMileageCost ? Number(booking.invoice.extraMileageCost) : null,
          packageCharges: booking.invoice.packageCharges ? Number(booking.invoice.packageCharges) : null,
          fuelCharge: booking.invoice.fuelCharge ? Number(booking.invoice.fuelCharge) : null,
          damageCharge: booking.invoice.damageCharge ? Number(booking.invoice.damageCharge) : null,
          lateReturnCharge: booking.invoice.lateReturnCharge ? Number(booking.invoice.lateReturnCharge) : null,
          otherCharges: booking.invoice.otherCharges ? Number(booking.invoice.otherCharges) : null,
          subtotal: Number(booking.invoice.subtotal),
          discountAmount: booking.invoice.discountAmount ? Number(booking.invoice.discountAmount) : null,
          taxRate: booking.invoice.taxRate ? Number(booking.invoice.taxRate) : null,
          taxAmount: booking.invoice.taxAmount ? Number(booking.invoice.taxAmount) : null,
          totalAmount: Number(booking.invoice.totalAmount),
          advancePaid: booking.invoice.advancePaid ? Number(booking.invoice.advancePaid) : null,
          amountPaid: Number(booking.invoice.amountPaid),
          balanceDue: Number(booking.invoice.balanceDue),
          payments: booking.invoice.payments.map((p) => ({
            ...p,
            amount: Number(p.amount),
          })),
        }
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
