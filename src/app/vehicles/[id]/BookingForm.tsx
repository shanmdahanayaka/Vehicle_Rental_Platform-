"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/config/site";

interface Policy {
  id: string;
  name: string;
  title: string;
  summary: string | null;
  category: string;
  isRequired: boolean;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  type: string;
  basePrice: number | null;
  pricePerDay: number | null;
  pricePerHour: number | null;
  discount: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  icon: string | null;
  policies: Policy[];
}

interface BookingFormProps {
  vehicleId: string;
  pricePerDay: number;
  vehicleName: string;
  location: string;
}

const PACKAGE_TYPE_ICONS: Record<string, string> = {
  DAILY: "📅",
  WEEKLY: "📆",
  MONTHLY: "🗓️",
  AIRPORT_PICKUP: "✈️",
  AIRPORT_DROP: "🛫",
  AIRPORT_ROUND: "🔄",
  HOURLY: "⏰",
  CUSTOM: "⚙️",
};

export default function BookingForm({
  vehicleId,
  pricePerDay,
  vehicleName,
  location,
}: BookingFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("09:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("09:00");
  const [pickupLocation, setPickupLocation] = useState(location);
  const [dropoffLocation, setDropoffLocation] = useState(location);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Packages state
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [showPolicies, setShowPolicies] = useState<string | null>(null);

  // Fetch available packages
  useEffect(() => {
    fetchPackages();
  }, [vehicleId]);

  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const res = await fetch(`/api/packages?vehicleId=${vehicleId}`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (err) {
      console.error("Error fetching packages:", err);
    }
    setPackagesLoading(false);
  };

  // Get full datetime from date and time
  const getStartDateTime = () => {
    if (!startDate) return null;
    return new Date(`${startDate}T${startTime}`);
  };

  const getEndDateTime = () => {
    if (!endDate) return null;
    return new Date(`${endDate}T${endTime}`);
  };

  // Calculate rental duration in days (can be fractional)
  const calculateDays = () => {
    const start = getStartDateTime();
    const end = getEndDateTime();
    if (!start || !end) return 0;

    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Round up to nearest day (minimum 1 day)
    const days = Math.ceil(diffHours / 24);
    return days > 0 ? days : 0;
  };

  // Calculate exact hours for display
  const calculateHours = () => {
    const start = getStartDateTime();
    const end = getEndDateTime();
    if (!start || !end) return 0;

    const diffMs = end.getTime() - start.getTime();
    return Math.round(diffMs / (1000 * 60 * 60));
  };

  // Calculate package price based on type
  const getPackagePrice = (pkg: Package) => {
    const days = calculateDays();
    if (pkg.basePrice) return pkg.basePrice;
    if (pkg.pricePerDay && days > 0) return pkg.pricePerDay * days;
    return 0;
  };

  // Calculate base vehicle price (with any package discounts)
  const calculateBasePrice = () => {
    const days = calculateDays();
    let basePrice = pricePerDay * days;

    // Apply discount from selected packages (use highest discount)
    const maxDiscount = selectedPackages.reduce((max, pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      if (pkg?.discount && pkg.discount > max) return pkg.discount;
      return max;
    }, 0);

    if (maxDiscount > 0) {
      basePrice = basePrice * (1 - maxDiscount / 100);
    }

    return basePrice;
  };

  // Calculate total packages price
  const calculatePackagesPrice = () => {
    return selectedPackages.reduce((total, pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      if (pkg) return total + getPackagePrice(pkg);
      return total;
    }, 0);
  };

  const basePrice = calculateBasePrice();
  const packagesPrice = calculatePackagesPrice();
  const totalPrice = basePrice + packagesPrice;

  // Check if any selected package has required policies
  const getRequiredPolicies = () => {
    const required: Policy[] = [];
    selectedPackages.forEach((pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      pkg?.policies.forEach((policy) => {
        if (policy.isRequired && !required.find((p) => p.id === policy.id)) {
          required.push(policy);
        }
      });
    });
    return required;
  };

  const togglePackage = (pkgId: string) => {
    setSelectedPackages((prev) =>
      prev.includes(pkgId)
        ? prev.filter((id) => id !== pkgId)
        : [...prev, pkgId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!session) {
      router.push("/login");
      return;
    }

    if (!startDate || !endDate) {
      setError("Please select pickup and return dates");
      return;
    }

    const startDateTime = getStartDateTime();
    const endDateTime = getEndDateTime();

    if (!startDateTime || !endDateTime) {
      setError("Please select valid dates and times");
      return;
    }

    if (startDateTime >= endDateTime) {
      setError("Return date/time must be after pickup date/time");
      return;
    }

    if (startDateTime < new Date()) {
      setError("Pickup date/time cannot be in the past");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId,
          startDate: startDateTime.toISOString(),
          endDate: endDateTime.toISOString(),
          pickupLocation,
          dropoffLocation,
          packageIds: selectedPackages,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create booking");
      } else {
        router.push("/bookings");
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const days = calculateDays();
  const requiredPolicies = getRequiredPolicies();

  // Get discount info for display
  const maxDiscount = selectedPackages.reduce((max, pkgId) => {
    const pkg = packages.find((p) => p.id === pkgId);
    if (pkg?.discount && pkg.discount > max) return pkg.discount;
    return max;
  }, 0);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-5 text-white">
        <h2 className="text-xl font-bold mb-1">Book This Vehicle</h2>
        <p className="text-white/80 text-sm">{vehicleName}</p>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Date & Time Selection */}
        <div className="space-y-3">
          {/* Pickup Date & Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Pickup Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                min={today}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
                required
              />
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
                required
              />
            </div>
          </div>

          {/* Return Date & Time */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Return Date & Time
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                min={startDate || today}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
                required
              />
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
                required
              />
            </div>
          </div>

          {/* Duration Preview */}
          {days > 0 && (
            <div className="flex items-center justify-between px-3 py-2 bg-blue-50 rounded-xl text-sm">
              <span className="text-blue-700 font-medium">Duration:</span>
              <span className="text-blue-900 font-bold">
                {days} {days === 1 ? "day" : "days"} ({calculateHours()} hours)
              </span>
            </div>
          )}
        </div>

        {/* Location Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Pickup Location
          </label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Drop-off Location
          </label>
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-slate-900 text-sm transition"
              required
            />
          </div>
        </div>

        {/* Packages Section */}
        {!packagesLoading && packages.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              Add-ons & Packages
            </h3>
            <div className="space-y-2">
              {packages.map((pkg) => {
                const price = getPackagePrice(pkg);
                const isSelected = selectedPackages.includes(pkg.id);

                return (
                  <div key={pkg.id} className="relative">
                    {/* Package selection area */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => togglePackage(pkg.id)}
                      onKeyDown={(e) => e.key === 'Enter' && togglePackage(pkg.id)}
                      className={`w-full text-left rounded-xl p-3 transition border-2 cursor-pointer ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-100 bg-slate-50 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">
                            {PACKAGE_TYPE_ICONS[pkg.type] || "📦"}
                          </span>
                          <div>
                            <p className="font-medium text-sm text-slate-900">{pkg.name}</p>
                            {pkg.description && (
                              <p className="text-xs text-slate-500 line-clamp-1">{pkg.description}</p>
                            )}
                            {pkg.discount && pkg.discount > 0 && (
                              <span className="inline-flex mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                                {pkg.discount}% off rental
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {price > 0 ? (
                            <p className="font-semibold text-blue-600 text-sm">
                              +{formatCurrency(price)}
                            </p>
                          ) : pkg.discount ? (
                            <p className="text-xs text-green-600 font-medium">Discount only</p>
                          ) : (
                            <p className="text-xs text-slate-400">Included</p>
                          )}
                        </div>
                      </div>

                      {/* Show policies attached to this package */}
                      {pkg.policies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPolicies(showPolicies === pkg.id ? null : pkg.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                                setShowPolicies(showPolicies === pkg.id ? null : pkg.id);
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                          >
                            {pkg.policies.length} policies attached{" "}
                            {showPolicies === pkg.id ? "▲" : "▼"}
                          </span>

                          {showPolicies === pkg.id && (
                            <div className="mt-2 space-y-1">
                              {pkg.policies.map((policy) => (
                                <div
                                  key={policy.id}
                                  className="text-xs p-2 bg-white rounded-lg border border-slate-100"
                                >
                                  <p className="font-medium text-slate-900">
                                    {policy.title}
                                    {policy.isRequired && (
                                      <span className="ml-1 text-red-500">*</span>
                                    )}
                                  </p>
                                  {policy.summary && (
                                    <p className="text-slate-500 mt-0.5">{policy.summary}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Required Policies Notice */}
        {requiredPolicies.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1 flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              By booking, you agree to:
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5 ml-5">
              {requiredPolicies.map((policy) => (
                <li key={policy.id}>• {policy.title}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="border-t border-slate-100 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              {formatCurrency(pricePerDay)} x {days || 0} days
            </span>
            <span className="text-slate-900 font-medium">{formatCurrency(pricePerDay * (days || 0))}</span>
          </div>

          {maxDiscount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-green-600 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Package discount ({maxDiscount}%)
              </span>
              <span className="text-green-600 font-medium">-{formatCurrency((pricePerDay * (days || 0) * maxDiscount) / 100)}</span>
            </div>
          )}

          {packagesPrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Add-ons</span>
              <span className="text-slate-900 font-medium">+{formatCurrency(packagesPrice)}</span>
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-slate-900 font-bold">Total</span>
            <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              {formatCurrency(totalPrice)}
            </span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !days}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : session ? (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Book Now
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
              Sign in to Book
            </>
          )}
        </button>

        {!session && (
          <p className="text-center text-xs text-slate-500">
            You need to be logged in to make a booking
          </p>
        )}
      </form>
    </div>
  );
}
