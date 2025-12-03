import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { formatCurrency } from "@/config/site";
import AnalyticsDashboard from "./components/AnalyticsDashboard";

async function getQuickStats() {
  const [
    totalVehicles,
    availableVehicles,
    totalBookings,
    pendingBookings,
    activeBookings,
    totalUsers,
    recentBookings,
    invoiceRevenue,
    advancePayments,
    outstandingBalance,
    paidInvoicesCount,
  ] = await Promise.all([
    prisma.vehicle.count(),
    prisma.vehicle.count({ where: { available: true } }),
    prisma.booking.count(),
    prisma.booking.count({ where: { status: "PENDING" } }),
    prisma.booking.count({ where: { status: "COLLECTED" } }),
    prisma.user.count(),
    prisma.booking.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        vehicle: { select: { name: true, brand: true } },
        invoice: {
          select: {
            totalAmount: true,
            amountPaid: true,
            balanceDue: true,
            status: true,
          },
        },
      },
    }),
    prisma.invoice.aggregate({
      _sum: { amountPaid: true },
    }),
    prisma.booking.aggregate({
      where: {
        advancePaid: true,
        invoice: null,
      },
      _sum: { advanceAmount: true },
    }),
    prisma.invoice.aggregate({
      where: {
        status: { notIn: ["PAID", "CANCELLED"] },
      },
      _sum: { balanceDue: true },
    }),
    prisma.invoice.count({
      where: { status: "PAID" },
    }),
  ]);

  const totalRevenue =
    Number(invoiceRevenue._sum.amountPaid || 0) +
    Number(advancePayments._sum.advanceAmount || 0);

  const outstanding = Number(outstandingBalance._sum.balanceDue || 0);

  return {
    totalVehicles,
    availableVehicles,
    totalBookings,
    pendingBookings,
    activeBookings,
    totalUsers,
    totalRevenue,
    outstanding,
    paidInvoicesCount,
    recentBookings: recentBookings.map((b) => ({
      ...b,
      totalPrice: Number(b.totalPrice),
      displayAmount: b.invoice
        ? Number(b.invoice.totalAmount)
        : Number(b.totalPrice),
      paidAmount: b.invoice ? Number(b.invoice.amountPaid) : 0,
      invoiceStatus: b.invoice?.status || null,
    })),
  };
}

export default async function AdminDashboard() {
  const stats = await getQuickStats();

  const statCards = [
    {
      title: "Total Revenue",
      value: formatCurrency(stats.totalRevenue),
      change: stats.outstanding > 0 ? `${formatCurrency(stats.outstanding)} outstanding` : `${stats.paidInvoicesCount} invoices paid`,
      changeType: stats.outstanding > 0 ? "warning" : "positive",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      title: "Total Bookings",
      value: stats.totalBookings.toString(),
      change: `${stats.pendingBookings} pending`,
      changeType: stats.pendingBookings > 0 ? "warning" : "neutral",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      gradient: "from-blue-500 to-indigo-600",
    },
    {
      title: "Total Vehicles",
      value: stats.totalVehicles.toString(),
      change: `${stats.availableVehicles} available`,
      changeType: "neutral",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h8m-8 5h8m-8 5h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z" />
        </svg>
      ),
      gradient: "from-purple-500 to-pink-600",
    },
    {
      title: "Total Users",
      value: stats.totalUsers.toString(),
      change: `${stats.activeBookings} active rentals`,
      changeType: stats.activeBookings > 0 ? "positive" : "neutral",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      gradient: "from-orange-500 to-red-600",
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-100 text-yellow-700",
      CONFIRMED: "bg-blue-100 text-blue-700",
      COLLECTED: "bg-emerald-100 text-emerald-700",
      COMPLETED: "bg-purple-100 text-purple-700",
      INVOICED: "bg-orange-100 text-orange-700",
      PAID: "bg-green-100 text-green-700",
      CANCELLED: "bg-red-100 text-red-700",
    };
    return styles[status] || styles.PENDING;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/admin/invoices"
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Invoices
          </Link>
          <Link
            href="/admin/vehicles"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Vehicle
          </Link>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="group relative overflow-hidden rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 transition hover:shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{stat.value}</p>
                <p
                  className={`mt-2 text-sm font-medium ${
                    stat.changeType === "positive"
                      ? "text-emerald-600"
                      : stat.changeType === "negative"
                      ? "text-red-600"
                      : stat.changeType === "warning"
                      ? "text-amber-600"
                      : "text-slate-500"
                  }`}
                >
                  {stat.change}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${stat.gradient} text-white shadow-lg`}
              >
                {stat.icon}
              </div>
            </div>
            <div
              className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${stat.gradient} opacity-10 blur-2xl transition group-hover:opacity-20`}
            />
          </div>
        ))}
      </div>

      {/* Analytics Dashboard */}
      <AnalyticsDashboard />

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Recent Bookings</h2>
            <Link
              href="/admin/bookings"
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Customer
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Vehicle
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="pb-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recentBookings.length > 0 ? (
                  stats.recentBookings.map((booking) => (
                    <tr key={booking.id} className="group">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                            {booking.user.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {booking.user.name || "Unknown"}
                            </p>
                            <p className="text-xs text-slate-500">{booking.user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <p className="font-medium text-slate-700">{booking.vehicle.name}</p>
                        <p className="text-xs text-slate-500">{booking.vehicle.brand}</p>
                      </td>
                      <td className="py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadge(
                            booking.status
                          )}`}
                        >
                          {booking.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {formatCurrency(booking.displayAmount)}
                          </p>
                          {booking.paidAmount > 0 && (
                            <p className="text-xs text-emerald-600">
                              Paid: {formatCurrency(booking.paidAmount)}
                            </p>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-500">
                      No bookings yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          {/* Active Rentals Card */}
          <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-purple-700 p-6 text-white shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-100">Active Rentals</p>
                <p className="mt-1 text-4xl font-bold">{stats.activeBookings}</p>
              </div>
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="h-2 w-full rounded-full bg-white/20">
                <div
                  className="h-2 rounded-full bg-white"
                  style={{
                    width: `${
                      stats.totalBookings > 0
                        ? (stats.activeBookings / stats.totalBookings) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
              <p className="mt-2 text-sm text-blue-100">
                {stats.totalBookings > 0
                  ? `${((stats.activeBookings / stats.totalBookings) * 100).toFixed(1)}% of total bookings`
                  : "No bookings yet"}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 className="font-semibold text-slate-900">Quick Actions</h3>
            <div className="mt-4 space-y-3">
              <Link
                href="/admin/bookings"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Manage Bookings</p>
                  <p className="text-xs text-slate-500">View all reservations</p>
                </div>
              </Link>
              <Link
                href="/admin/vehicles"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Add New Vehicle</p>
                  <p className="text-xs text-slate-500">List a new vehicle</p>
                </div>
              </Link>
              <Link
                href="/admin/users"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Manage Users</p>
                  <p className="text-xs text-slate-500">View customer list</p>
                </div>
              </Link>
              <Link
                href="/admin/invoices"
                className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 transition hover:bg-slate-100"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100 text-orange-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-slate-700">View Invoices</p>
                  <p className="text-xs text-slate-500">Manage all invoices</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
