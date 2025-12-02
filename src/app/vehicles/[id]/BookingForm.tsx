"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { formatCurrency, currency } from "@/config/site";

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
  const [endDate, setEndDate] = useState("");
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

  const calculateDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = Math.ceil(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    );
    return days > 0 ? days : 0;
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

    if (new Date(startDate) >= new Date(endDate)) {
      setError("Return date must be after pickup date");
      return;
    }

    if (new Date(startDate) < new Date()) {
      setError("Pickup date cannot be in the past");
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
          startDate,
          endDate,
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
    <div className="bg-white rounded-xl p-6 shadow-md sticky top-24">
      <h2 className="text-xl font-bold text-slate-900 mb-4">Book {vehicleName}</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pickup Date
          </label>
          <input
            type="date"
            min={today}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Return Date
          </label>
          <input
            type="date"
            min={startDate || today}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Pickup Location
          </label>
          <input
            type="text"
            value={pickupLocation}
            onChange={(e) => setPickupLocation(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Drop-off Location
          </label>
          <input
            type="text"
            value={dropoffLocation}
            onChange={(e) => setDropoffLocation(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
            required
          />
        </div>

        {/* Packages Section */}
        {!packagesLoading && packages.length > 0 && (
          <div className="border-t border-slate-200 pt-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">
              Add-ons & Packages
            </h3>
            <div className="space-y-2">
              {packages.map((pkg) => {
                const price = getPackagePrice(pkg);
                const isSelected = selectedPackages.includes(pkg.id);

                return (
                  <div key={pkg.id} className="relative">
                    <button
                      type="button"
                      onClick={() => togglePackage(pkg.id)}
                      className={`w-full text-left rounded-lg p-3 transition border-2 ${
                        isSelected
                          ? "border-blue-500 bg-blue-50"
                          : "border-slate-200 hover:border-slate-300"
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
                              <p className="text-xs text-slate-500">{pkg.description}</p>
                            )}
                            {pkg.discount && pkg.discount > 0 && (
                              <span className="inline-flex mt-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                                {pkg.discount}% off rental
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          {price > 0 ? (
                            <p className="font-semibold text-blue-600">
                              +{formatCurrency(price)}
                            </p>
                          ) : pkg.discount ? (
                            <p className="text-sm text-green-600">Discount only</p>
                          ) : (
                            <p className="text-sm text-slate-400">Included</p>
                          )}
                        </div>
                      </div>

                      {/* Show policies attached to this package */}
                      {pkg.policies.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowPolicies(showPolicies === pkg.id ? null : pkg.id);
                            }}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            {pkg.policies.length} policies attached{" "}
                            {showPolicies === pkg.id ? "▲" : "▼"}
                          </button>

                          {showPolicies === pkg.id && (
                            <div className="mt-2 space-y-1">
                              {pkg.policies.map((policy) => (
                                <div
                                  key={policy.id}
                                  className="text-xs p-2 bg-slate-50 rounded"
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
                    </button>

                    {/* Selection indicator */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-amber-800 mb-1">
              By booking, you agree to:
            </p>
            <ul className="text-xs text-amber-700 space-y-0.5">
              {requiredPolicies.map((policy) => (
                <li key={policy.id}>• {policy.title}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Price Breakdown */}
        <div className="border-t border-slate-200 pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              {formatCurrency(pricePerDay)} x {days} days
            </span>
            <span className="text-slate-900">{formatCurrency(pricePerDay * days)}</span>
          </div>

          {maxDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Package discount ({maxDiscount}%)</span>
              <span>-{formatCurrency((pricePerDay * days * maxDiscount) / 100)}</span>
            </div>
          )}

          {packagesPrice > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Add-ons</span>
              <span className="text-slate-900">+{formatCurrency(packagesPrice)}</span>
            </div>
          )}

          <div className="flex justify-between text-lg font-bold pt-2 border-t border-slate-200">
            <span className="text-slate-900">Total</span>
            <span className="text-blue-600">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !days}
          className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading
            ? "Processing..."
            : session
            ? "Book Now"
            : "Sign in to Book"}
        </button>
      </form>
    </div>
  );
}
