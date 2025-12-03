import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get date ranges
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // Fetch all analytics data in parallel
    const [
      // Monthly revenue for last 6 months
      monthlyInvoices,
      // Booking status counts
      bookingsByStatus,
      // Vehicle type breakdown
      vehiclesByType,
      // Top performing vehicles
      topVehicles,
      // Recent bookings trend (last 30 days)
      recentBookings,
      // This month vs last month comparison
      thisMonthRevenue,
      lastMonthRevenue,
      thisMonthBookings,
      lastMonthBookings,
      // Payment method breakdown
      paymentMethods,
      // Customer metrics
      totalCustomers,
      newCustomersThisMonth,
      // Average booking value
      avgBookingValue,
      // Overdue invoices
      overdueInvoices,
      // Pending actions
      pendingBookings,
      collectedBookings,
      completedBookings,
    ] = await Promise.all([
      // Monthly revenue
      prisma.invoice.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: { gte: sixMonthsAgo },
        },
        _sum: { amountPaid: true, totalAmount: true },
      }),
      // Booking status
      prisma.booking.groupBy({
        by: ["status"],
        _count: { id: true },
      }),
      // Vehicle types
      prisma.vehicle.groupBy({
        by: ["type"],
        _count: { id: true },
      }),
      // Top vehicles by bookings
      prisma.booking.groupBy({
        by: ["vehicleId"],
        _count: { id: true },
        _sum: { totalPrice: true },
        orderBy: { _count: { id: "desc" } },
        take: 5,
      }),
      // Recent bookings (last 30 days)
      prisma.booking.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
        },
        _count: { id: true },
      }),
      // This month revenue
      prisma.invoice.aggregate({
        where: { createdAt: { gte: startOfMonth } },
        _sum: { amountPaid: true, totalAmount: true },
      }),
      // Last month revenue
      prisma.invoice.aggregate({
        where: {
          createdAt: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amountPaid: true, totalAmount: true },
      }),
      // This month bookings
      prisma.booking.count({
        where: { createdAt: { gte: startOfMonth } },
      }),
      // Last month bookings
      prisma.booking.count({
        where: { createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      }),
      // Payment methods
      prisma.invoicePayment.groupBy({
        by: ["method"],
        _sum: { amount: true },
        _count: { id: true },
      }),
      // Total customers
      prisma.user.count({ where: { role: "USER" } }),
      // New customers this month
      prisma.user.count({
        where: { role: "USER", createdAt: { gte: startOfMonth } },
      }),
      // Average booking value
      prisma.booking.aggregate({
        where: { status: { in: ["COMPLETED", "INVOICED", "PAID"] } },
        _avg: { totalPrice: true },
      }),
      // Overdue invoices
      prisma.invoice.count({
        where: {
          status: { notIn: ["PAID", "CANCELLED"] },
          dueDate: { lt: now },
        },
      }),
      // Pending bookings
      prisma.booking.count({ where: { status: "PENDING" } }),
      // Collected (active rentals)
      prisma.booking.count({ where: { status: "COLLECTED" } }),
      // Completed awaiting invoice
      prisma.booking.count({ where: { status: "COMPLETED" } }),
    ]);

    // Get vehicle names for top vehicles
    const vehicleIds = topVehicles.map((v) => v.vehicleId);
    const vehicles = await prisma.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, name: true, brand: true, model: true },
    });
    const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));

    // Process monthly revenue data
    const monthlyRevenueMap = new Map<string, { revenue: number; invoiced: number }>();

    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      monthlyRevenueMap.set(key, { revenue: 0, invoiced: 0 });
    }

    // Aggregate invoice data by month
    monthlyInvoices.forEach((inv) => {
      const date = new Date(inv.createdAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      if (monthlyRevenueMap.has(key)) {
        const current = monthlyRevenueMap.get(key)!;
        current.revenue += Number(inv._sum.amountPaid || 0);
        current.invoiced += Number(inv._sum.totalAmount || 0);
      }
    });

    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyRevenue = Array.from(monthlyRevenueMap.entries()).map(([key, data]) => {
      const [year, month] = key.split("-");
      return {
        month: `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`,
        revenue: data.revenue,
        invoiced: data.invoiced,
      };
    });

    // Process daily bookings for last 30 days
    const dailyBookingsMap = new Map<string, number>();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const key = date.toISOString().split("T")[0];
      dailyBookingsMap.set(key, 0);
    }

    recentBookings.forEach((booking) => {
      const key = new Date(booking.createdAt).toISOString().split("T")[0];
      if (dailyBookingsMap.has(key)) {
        dailyBookingsMap.set(key, (dailyBookingsMap.get(key) || 0) + booking._count.id);
      }
    });

    const dailyBookings = Array.from(dailyBookingsMap.entries()).map(([date, count]) => ({
      date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      bookings: count,
    }));

    // Calculate growth percentages
    const thisMonthRev = Number(thisMonthRevenue._sum.amountPaid || 0);
    const lastMonthRev = Number(lastMonthRevenue._sum.amountPaid || 0);
    const revenueGrowth = lastMonthRev > 0 ? ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100 : 0;
    const bookingsGrowth = lastMonthBookings > 0 ? ((thisMonthBookings - lastMonthBookings) / lastMonthBookings) * 100 : 0;

    // Format booking status data
    const bookingStatusData = bookingsByStatus.map((status) => ({
      name: status.status,
      value: status._count.id,
    }));

    // Format vehicle type data
    const vehicleTypeData = vehiclesByType.map((type) => ({
      name: type.type,
      value: type._count.id,
    }));

    // Format top vehicles
    const topVehiclesData = topVehicles.map((v) => {
      const vehicle = vehicleMap.get(v.vehicleId);
      return {
        name: vehicle?.name || "Unknown",
        brand: vehicle?.brand || "",
        bookings: v._count.id,
        revenue: Number(v._sum.totalPrice || 0),
      };
    });

    // Format payment methods
    const paymentMethodData = paymentMethods.map((pm) => ({
      method: pm.method,
      amount: Number(pm._sum.amount || 0),
      count: pm._count.id,
    }));

    return NextResponse.json({
      // Revenue trends
      monthlyRevenue,
      thisMonthRevenue: thisMonthRev,
      lastMonthRevenue: lastMonthRev,
      revenueGrowth: Math.round(revenueGrowth * 10) / 10,

      // Booking trends
      dailyBookings,
      thisMonthBookings,
      lastMonthBookings,
      bookingsGrowth: Math.round(bookingsGrowth * 10) / 10,
      bookingStatusData,

      // Vehicle metrics
      vehicleTypeData,
      topVehicles: topVehiclesData,

      // Payment metrics
      paymentMethodData,

      // Customer metrics
      totalCustomers,
      newCustomersThisMonth,
      customerGrowth: totalCustomers > 0 ? Math.round((newCustomersThisMonth / totalCustomers) * 100 * 10) / 10 : 0,

      // KPIs
      avgBookingValue: Number(avgBookingValue._avg.totalPrice || 0),
      overdueInvoices,

      // Action items
      pendingActions: {
        pendingBookings,
        activeRentals: collectedBookings,
        awaitingInvoice: completedBookings,
        overdueInvoices,
      },
    });
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
