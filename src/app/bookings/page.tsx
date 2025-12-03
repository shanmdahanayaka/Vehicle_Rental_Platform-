import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import BookingsClient from "@/components/BookingsClient";

// Helper function to parse images string to array
function parseImages(images: string | null): string[] {
  if (!images) return [];
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // If not valid JSON, check if it's a URL string
    if (images.startsWith("http") || images.startsWith("/")) {
      return images.split(",").map((url) => url.trim()).filter(Boolean);
    }
    return [];
  }
}

async function getUserBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: { userId },
    include: {
      vehicle: true,
      payment: true,
      invoice: {
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          totalAmount: true,
          balanceDue: true,
        },
      },
      documents: {
        select: {
          id: true,
        },
      },
      // Package booking data
      primaryPackage: {
        select: {
          id: true,
          name: true,
          type: true,
          images: true,
        },
      },
      customCosts: {
        select: {
          id: true,
          name: true,
          price: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return bookings.map((booking) => ({
    id: booking.id,
    vehicleId: booking.vehicleId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    totalPrice: Number(booking.totalPrice),
    status: booking.status,
    pickupLocation: booking.pickupLocation,
    dropoffLocation: booking.dropoffLocation,
    createdAt: booking.createdAt.toISOString(),
    isPackageBooking: booking.isPackageBooking,
    packageBasePrice: booking.packageBasePrice ? Number(booking.packageBasePrice) : null,
    vehiclePackagePrice: booking.vehiclePackagePrice ? Number(booking.vehiclePackagePrice) : null,
    customCostsTotal: booking.customCostsTotal ? Number(booking.customCostsTotal) : null,
    vehicle: {
      id: booking.vehicle.id,
      name: booking.vehicle.name,
      brand: booking.vehicle.brand,
      model: booking.vehicle.model,
      year: booking.vehicle.year,
      pricePerDay: Number(booking.vehicle.pricePerDay),
      images: parseImages(booking.vehicle.images),
    },
    payment: booking.payment ? {
      status: booking.payment.status,
    } : null,
    invoice: booking.invoice ? {
      id: booking.invoice.id,
      invoiceNumber: booking.invoice.invoiceNumber,
      status: booking.invoice.status,
      totalAmount: Number(booking.invoice.totalAmount),
      balanceDue: Number(booking.invoice.balanceDue),
    } : null,
    documentCount: booking.documents.length,
    primaryPackage: booking.primaryPackage ? {
      id: booking.primaryPackage.id,
      name: booking.primaryPackage.name,
      type: booking.primaryPackage.type,
      images: parseImages(booking.primaryPackage.images),
    } : null,
    customCosts: booking.customCosts.map((cc) => ({
      id: cc.id,
      name: cc.name,
      price: Number(cc.price),
    })),
  }));
}

async function getBookingStats(userId: string) {
  const total = await prisma.booking.count({ where: { userId } });
  const active = await prisma.booking.count({
    where: { userId, status: { in: ["CONFIRMED", "COLLECTED"] } },
  });
  const completed = await prisma.booking.count({
    where: { userId, status: { in: ["COMPLETED", "INVOICED", "PAID"] } },
  });
  return { total, active, completed };
}

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const params = await searchParams;
  const showSuccess = params.success === "true";

  const bookings = await getUserBookings(session.user.id);
  const stats = await getBookingStats(session.user.id);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              My
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Bookings
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Manage your vehicle rentals and track your booking history
            </p>

            {/* Stats */}
            <div className="flex flex-wrap justify-center gap-6 text-white">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-3 rounded-full">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="font-bold">{stats.total}</span>
                <span className="text-slate-300">Total Bookings</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-3 rounded-full">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="font-bold">{stats.active}</span>
                <span className="text-slate-300">Active</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-3 rounded-full">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-bold">{stats.completed}</span>
                <span className="text-slate-300">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content with Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <BookingsClient bookings={bookings} showSuccess={showSuccess} />
      </div>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Need Help With Your Booking?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Our support team is available 24/7 to assist you with any questions or concerns.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Contact Support
            </Link>
            <Link
              href="/faq"
              className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/20 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View FAQ
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
