"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/config/site";

interface AnalyticsData {
  monthlyRevenue: { month: string; revenue: number; invoiced: number }[];
  thisMonthRevenue: number;
  lastMonthRevenue: number;
  revenueGrowth: number;
  dailyBookings: { date: string; bookings: number }[];
  thisMonthBookings: number;
  lastMonthBookings: number;
  bookingsGrowth: number;
  bookingStatusData: { name: string; value: number }[];
  vehicleTypeData: { name: string; value: number }[];
  topVehicles: { name: string; brand: string; bookings: number; revenue: number }[];
  paymentMethodData: { method: string; amount: number; count: number }[];
  totalCustomers: number;
  newCustomersThisMonth: number;
  customerGrowth: number;
  avgBookingValue: number;
  overdueInvoices: number;
  pendingActions: {
    pendingBookings: number;
    activeRentals: number;
    awaitingInvoice: number;
    overdueInvoices: number;
  };
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4"];
const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  CONFIRMED: "#3B82F6",
  COLLECTED: "#10B981",
  COMPLETED: "#8B5CF6",
  INVOICED: "#F97316",
  PAID: "#059669",
  CANCELLED: "#EF4444",
};

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/analytics");
      if (!response.ok) throw new Error("Failed to fetch analytics");
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60 animate-pulse">
            <div className="h-4 bg-slate-200 rounded w-1/3 mb-4"></div>
            <div className="h-48 bg-slate-100 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl bg-red-50 p-6 text-center">
        <p className="text-red-600">{error || "Failed to load analytics"}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Revenue Growth */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">This Month Revenue</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.thisMonthRevenue)}</p>
              <div className={`flex items-center gap-1 text-sm ${data.revenueGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                <svg className={`w-4 h-4 ${data.revenueGrowth >= 0 ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {Math.abs(data.revenueGrowth)}% vs last month
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Bookings Growth */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">This Month Bookings</p>
              <p className="text-2xl font-bold text-slate-900">{data.thisMonthBookings}</p>
              <div className={`flex items-center gap-1 text-sm ${data.bookingsGrowth >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                <svg className={`w-4 h-4 ${data.bookingsGrowth >= 0 ? "" : "rotate-180"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
                {Math.abs(data.bookingsGrowth)}% vs last month
              </div>
            </div>
            <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        {/* Avg Booking Value */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Avg Booking Value</p>
              <p className="text-2xl font-bold text-slate-900">{formatCurrency(data.avgBookingValue)}</p>
              <p className="text-sm text-slate-500">Per completed booking</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* New Customers */}
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">New Customers</p>
              <p className="text-2xl font-bold text-slate-900">{data.newCustomersThisMonth}</p>
              <p className="text-sm text-slate-500">{data.customerGrowth}% of total ({data.totalCustomers})</p>
            </div>
            <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Action Items Alert */}
      {(data.pendingActions.pendingBookings > 0 || data.pendingActions.overdueInvoices > 0) && (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 ring-1 ring-amber-200">
          <h3 className="font-semibold text-amber-800 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Action Required
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            {data.pendingActions.pendingBookings > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-amber-600 font-medium">{data.pendingActions.pendingBookings}</p>
                <p className="text-slate-600">Pending Bookings</p>
              </div>
            )}
            {data.pendingActions.activeRentals > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-blue-600 font-medium">{data.pendingActions.activeRentals}</p>
                <p className="text-slate-600">Active Rentals</p>
              </div>
            )}
            {data.pendingActions.awaitingInvoice > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-purple-600 font-medium">{data.pendingActions.awaitingInvoice}</p>
                <p className="text-slate-600">Awaiting Invoice</p>
              </div>
            )}
            {data.pendingActions.overdueInvoices > 0 && (
              <div className="bg-white rounded-xl p-3">
                <p className="text-red-600 font-medium">{data.pendingActions.overdueInvoices}</p>
                <p className="text-slate-600">Overdue Invoices</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Revenue Trend (6 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlyRevenue}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorInvoiced" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [formatCurrency(value), ""]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="invoiced"
                  name="Invoiced"
                  stroke="#3B82F6"
                  fillOpacity={1}
                  fill="url(#colorInvoiced)"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Collected"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Bookings */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Daily Bookings (30 Days)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dailyBookings}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#94A3B8" interval={4} />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
                <Bar dataKey="bookings" name="Bookings" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Booking Status */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Booking Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.bookingStatusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {data.bookingStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {data.bookingStatusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1 text-xs">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: STATUS_COLORS[entry.name] || COLORS[index % COLORS.length] }}
                />
                <span className="text-slate-600">{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vehicle Types */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Fleet by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.vehicleTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name || ''} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {data.vehicleTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Payment Methods</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.paymentMethodData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis dataKey="method" type="category" tick={{ fontSize: 12 }} stroke="#94A3B8" width={80} />
                <Tooltip
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  formatter={(value: number) => [formatCurrency(value), "Amount"]}
                />
                <Bar dataKey="amount" name="Amount" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Vehicles */}
      <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200/60">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Top Performing Vehicles</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Rank</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Vehicle</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Bookings</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Revenue</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Performance</th>
              </tr>
            </thead>
            <tbody>
              {data.topVehicles.map((vehicle, index) => {
                const maxRevenue = Math.max(...data.topVehicles.map((v) => v.revenue));
                const percentage = maxRevenue > 0 ? (vehicle.revenue / maxRevenue) * 100 : 0;
                return (
                  <tr key={vehicle.name} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? "bg-yellow-100 text-yellow-700" :
                        index === 1 ? "bg-slate-100 text-slate-700" :
                        index === 2 ? "bg-orange-100 text-orange-700" :
                        "bg-slate-50 text-slate-500"
                      }`}>
                        {index + 1}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-slate-900">{vehicle.name}</p>
                      <p className="text-xs text-slate-500">{vehicle.brand}</p>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-slate-900">{vehicle.bookings}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-semibold text-emerald-600">{formatCurrency(vehicle.revenue)}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {data.topVehicles.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    No booking data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
