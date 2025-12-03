"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/config/site";
import CancelBookingButton from "@/components/CancelBookingButton";

interface Booking {
  id: string;
  vehicleId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  createdAt: string;
  isPackageBooking: boolean;
  packageBasePrice: number | null;
  vehiclePackagePrice: number | null;
  customCostsTotal: number | null;
  vehicle: {
    id: string;
    name: string;
    brand: string;
    model: string;
    year: number;
    pricePerDay: number;
    images: string[];
  };
  payment: {
    status: string;
  } | null;
  invoice: {
    id: string;
    invoiceNumber: string;
    status: string;
    totalAmount: number;
    balanceDue: number;
  } | null;
  documentCount: number;
  primaryPackage: {
    id: string;
    name: string;
    type: string;
    images: string[];
  } | null;
  customCosts: {
    id: string;
    name: string;
    price: number;
  }[];
}

interface BookingsClientProps {
  bookings: Booking[];
  showSuccess: boolean;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  CONFIRMED: { bg: "bg-blue-100", text: "text-blue-700", label: "Confirmed" },
  COLLECTED: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Collected" },
  COMPLETED: { bg: "bg-purple-100", text: "text-purple-700", label: "Completed" },
  INVOICED: { bg: "bg-orange-100", text: "text-orange-700", label: "Invoiced" },
  PAID: { bg: "bg-green-100", text: "text-green-700", label: "Paid" },
  CANCELLED: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

const packageTypeLabels: Record<string, string> = {
  WEDDING: "Wedding",
  AIRPORT: "Airport Transfer",
  TOURISM: "Tourism",
  CORPORATE: "Corporate",
  SELF_DRIVE: "Self Drive",
  WITH_DRIVER: "With Driver",
  LONG_TERM: "Long Term",
  EVENT: "Event",
  HONEYMOON: "Honeymoon",
  PILGRIMAGE: "Pilgrimage",
  ADVENTURE: "Adventure",
  CUSTOM: "Custom",
};

export default function BookingsClient({ bookings, showSuccess }: BookingsClientProps) {
  const [bookingType, setBookingType] = useState<"all" | "vehicle" | "package">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "price-high" | "price-low">("newest");

  // Get unique statuses from bookings
  const availableStatuses = useMemo(() => {
    const statuses = new Set(bookings.map((b) => b.status));
    return Array.from(statuses);
  }, [bookings]);

  // Count bookings by type
  const counts = useMemo(() => {
    const vehicle = bookings.filter((b) => !b.isPackageBooking).length;
    const pkg = bookings.filter((b) => b.isPackageBooking).length;
    return { all: bookings.length, vehicle, package: pkg };
  }, [bookings]);

  // Filter and sort bookings
  const filteredBookings = useMemo(() => {
    let result = [...bookings];

    // Filter by booking type
    if (bookingType === "vehicle") {
      result = result.filter((b) => !b.isPackageBooking);
    } else if (bookingType === "package") {
      result = result.filter((b) => b.isPackageBooking);
    }

    // Filter by status
    if (statusFilter !== "all") {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Sort
    switch (sortBy) {
      case "oldest":
        result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        break;
      case "price-high":
        result.sort((a, b) => b.totalPrice - a.totalPrice);
        break;
      case "price-low":
        result.sort((a, b) => a.totalPrice - b.totalPrice);
        break;
      default: // newest
        result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return result;
  }, [bookings, bookingType, statusFilter, sortBy]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PENDING":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "CONFIRMED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "COLLECTED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        );
      case "COMPLETED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case "INVOICED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case "PAID":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case "CANCELLED":
        return (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex gap-8">
      {/* Vertical Filters Sidebar */}
      <aside className="w-72 flex-shrink-0">
        <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-24">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h3>

          {/* Booking Type Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Booking Type</h4>
            <div className="space-y-2">
              <button
                onClick={() => setBookingType("all")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  bookingType === "all"
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span className="font-medium">All Bookings</span>
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  bookingType === "all" ? "bg-white/20" : "bg-slate-200"
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setBookingType("vehicle")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  bookingType === "vehicle"
                    ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/25"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <span className="font-medium">Vehicle Bookings</span>
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  bookingType === "vehicle" ? "bg-white/20" : "bg-slate-200"
                }`}>
                  {counts.vehicle}
                </span>
              </button>

              <button
                onClick={() => setBookingType("package")}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-all ${
                  bookingType === "package"
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25"
                    : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span className="font-medium">Package Bookings</span>
                </div>
                <span className={`text-sm px-2 py-0.5 rounded-full ${
                  bookingType === "package" ? "bg-white/20" : "bg-slate-200"
                }`}>
                  {counts.package}
                </span>
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Status</h4>
            <div className="space-y-1.5">
              <button
                onClick={() => setStatusFilter("all")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-all ${
                  statusFilter === "all"
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>All Statuses</span>
              </button>
              {availableStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-all ${
                    statusFilter === status
                      ? `${statusConfig[status]?.bg || "bg-slate-100"} ${statusConfig[status]?.text || "text-slate-700"}`
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {getStatusIcon(status)}
                  <span>{statusConfig[status]?.label || status}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort By */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">Sort By</h4>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="price-high">Price: High to Low</option>
              <option value="price-low">Price: Low to High</option>
            </select>
          </div>

          {/* Clear Filters */}
          {(bookingType !== "all" || statusFilter !== "all" || sortBy !== "newest") && (
            <button
              onClick={() => {
                setBookingType("all");
                setStatusFilter("all");
                setSortBy("newest");
              }}
              className="w-full px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
            >
              Clear All Filters
            </button>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Booking Created Successfully!</h3>
              <p className="text-sm text-green-600">Your booking has been submitted and is pending confirmation. We&apos;ll notify you once it&apos;s confirmed.</p>
            </div>
          </div>
        )}

        {/* Results Count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing <span className="font-semibold text-slate-900">{filteredBookings.length}</span> booking{filteredBookings.length !== 1 ? "s" : ""}
          </p>
        </div>

        {filteredBookings.length > 0 ? (
          <div className="space-y-6">
            {filteredBookings.map((booking) => {
              const status = statusConfig[booking.status] || { bg: "bg-slate-100", text: "text-slate-700", label: booking.status };
              const days = Math.ceil(
                (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              const isPackageBooking = booking.isPackageBooking && booking.primaryPackage;

              return (
                <div
                  key={booking.id}
                  className={`rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-300 ${
                    isPackageBooking ? "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100" : "bg-white"
                  }`}
                >
                  {/* Package Booking Header */}
                  {isPackageBooking && booking.primaryPackage && (
                    <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <p className="text-white font-bold">{booking.primaryPackage.name}</p>
                          <p className="text-purple-200 text-sm">
                            {packageTypeLabels[booking.primaryPackage.type] || booking.primaryPackage.type} Package
                          </p>
                        </div>
                      </div>
                      <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg} ${status.text} text-sm font-medium`}>
                        {getStatusIcon(booking.status)}
                        {status.label}
                      </span>
                    </div>
                  )}

                  <div className="flex flex-col lg:flex-row">
                    {/* Image Section */}
                    <div className="lg:w-72 h-48 lg:h-auto relative bg-slate-100 flex-shrink-0">
                      {isPackageBooking && booking.primaryPackage?.images?.[0] ? (
                        <Image
                          src={booking.primaryPackage.images[0]}
                          alt={booking.primaryPackage.name}
                          fill
                          className="object-cover"
                        />
                      ) : booking.vehicle.images && booking.vehicle.images[0] ? (
                        <Image
                          src={booking.vehicle.images[0]}
                          alt={booking.vehicle.name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-16 h-16 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge on Image (only for non-package bookings) */}
                      {!isPackageBooking && (
                        <div className={`absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full ${status.bg} ${status.text} text-sm font-medium`}>
                          {getStatusIcon(booking.status)}
                          {status.label}
                        </div>
                      )}
                      {/* Vehicle info overlay for package bookings */}
                      {isPackageBooking && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                          <p className="text-white font-semibold">{booking.vehicle.name}</p>
                          <p className="text-white/80 text-sm">{booking.vehicle.brand} {booking.vehicle.model}</p>
                        </div>
                      )}
                    </div>

                    {/* Booking Details */}
                    <div className="flex-1 p-6">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                        <div>
                          {!isPackageBooking && (
                            <>
                              <Link
                                href={`/vehicles/${booking.vehicleId}`}
                                className="text-xl font-bold text-slate-900 hover:text-blue-600 transition-colors"
                              >
                                {booking.vehicle.name}
                              </Link>
                              <p className="text-slate-500">
                                {booking.vehicle.brand} {booking.vehicle.model} &bull; {booking.vehicle.year}
                              </p>
                            </>
                          )}
                          {isPackageBooking && (
                            <div className="text-slate-600 text-sm">
                              <span className="font-medium">Vehicle:</span> {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-slate-500">Total Price</p>
                          <p className={`text-2xl font-bold text-transparent bg-clip-text ${
                            isPackageBooking
                              ? "bg-gradient-to-r from-purple-600 to-pink-600"
                              : "bg-gradient-to-r from-blue-600 to-purple-600"
                          }`}>
                            {formatCurrency(booking.totalPrice)}
                          </p>
                          <p className="text-xs text-slate-400">{days} day{days !== 1 ? "s" : ""}</p>
                        </div>
                      </div>

                      {/* Package Pricing Breakdown */}
                      {isPackageBooking && (booking.packageBasePrice || booking.customCostsTotal) && (
                        <div className="mb-4 p-3 bg-white/80 rounded-xl border border-purple-100">
                          <p className="text-xs font-semibold text-purple-700 mb-2">Price Breakdown</p>
                          <div className="space-y-1 text-sm">
                            {booking.packageBasePrice && booking.packageBasePrice > 0 && (
                              <div className="flex justify-between text-slate-600">
                                <span>Package Base</span>
                                <span>{formatCurrency(booking.packageBasePrice)}</span>
                              </div>
                            )}
                            {booking.vehiclePackagePrice && (
                              <div className="flex justify-between text-slate-600">
                                <span>Vehicle ({days} days &times; {formatCurrency(booking.vehiclePackagePrice)})</span>
                                <span>{formatCurrency(booking.vehiclePackagePrice * days)}</span>
                              </div>
                            )}
                            {booking.customCostsTotal && booking.customCostsTotal > 0 && (
                              <div className="flex justify-between text-slate-600">
                                <span>Additional Services</span>
                                <span>{formatCurrency(booking.customCostsTotal)}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Included Services for Package Bookings */}
                      {isPackageBooking && booking.customCosts && booking.customCosts.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-semibold text-purple-700 mb-2">Included Services</p>
                          <div className="flex flex-wrap gap-2">
                            {booking.customCosts.map((cost) => (
                              <span
                                key={cost.id}
                                className="inline-flex items-center gap-1 text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {cost.name}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Booking Info Grid */}
                      <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-b ${
                        isPackageBooking ? "border-purple-100" : "border-slate-100"
                      }`}>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium">Pickup</span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {new Date(booking.startDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="text-xs font-medium">Return</span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {new Date(booking.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="text-xs font-medium">Location</span>
                          </div>
                          <p className="font-semibold text-slate-900 text-sm truncate">{booking.pickupLocation}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 text-slate-400 mb-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            <span className="text-xs font-medium">Payment</span>
                          </div>
                          <p className="font-semibold text-slate-900">
                            {booking.payment ? (
                              <span className={booking.payment.status === "COMPLETED" ? "text-green-600" : "text-amber-600"}>
                                {booking.payment.status}
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <p className="text-sm text-slate-400">
                            Booked on{" "}
                            {new Date(booking.createdAt).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </p>
                          {booking.documentCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              {booking.documentCount} doc{booking.documentCount !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          {isPackageBooking && booking.primaryPackage && (
                            <Link
                              href={`/packages/${booking.primaryPackage.id}`}
                              className="text-sm font-medium text-purple-600 hover:text-purple-700 transition-colors"
                            >
                              View Package
                            </Link>
                          )}
                          <Link
                            href={`/vehicles/${booking.vehicleId}`}
                            className={`text-sm font-medium transition-colors ${
                              isPackageBooking
                                ? "text-slate-500 hover:text-slate-700"
                                : "text-blue-600 hover:text-blue-700"
                            }`}
                          >
                            View Vehicle
                          </Link>
                          {booking.invoice && (
                            <Link
                              href={`/invoices/${booking.invoice.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 text-sm font-medium rounded-lg hover:bg-orange-100 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              View Invoice
                              {booking.invoice.balanceDue > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-orange-200 text-orange-800 text-xs rounded">
                                  Due
                                </span>
                              )}
                            </Link>
                          )}
                          {(booking.status === "PENDING" || booking.status === "CONFIRMED") && (
                            <CancelBookingButton
                              bookingId={booking.id}
                              vehicleName={isPackageBooking ? booking.primaryPackage?.name || booking.vehicle.name : booking.vehicle.name}
                            />
                          )}
                          {booking.status === "COMPLETED" && !booking.invoice && (
                            <Link
                              href={`/vehicles/${booking.vehicleId}#reviews`}
                              className={`inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm font-medium rounded-lg transition-all ${
                                isPackageBooking
                                  ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                                  : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                              }`}>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                              </svg>
                              Leave Review
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-12 h-12 text-blue-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">
              {bookingType !== "all" || statusFilter !== "all"
                ? "No bookings match your filters"
                : "No bookings yet"}
            </h3>
            <p className="text-slate-600 mb-8 max-w-md mx-auto">
              {bookingType !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters to see more results."
                : "Start your journey by exploring our wide selection of vehicles. From economy cars to luxury SUVs, we have the perfect ride for you."}
            </p>
            {bookingType !== "all" || statusFilter !== "all" ? (
              <button
                onClick={() => {
                  setBookingType("all");
                  setStatusFilter("all");
                }}
                className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                Clear Filters
              </button>
            ) : (
              <Link
                href="/vehicles"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg shadow-blue-500/25"
              >
                Browse Vehicles
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
