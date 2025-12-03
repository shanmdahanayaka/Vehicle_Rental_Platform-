"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/config/site";

interface CustomCost {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isOptional: boolean;
}

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  pricePerDay: number;
  packagePrice: number | null;
  images: string[];
  transmission: string;
  fuelType: string;
  seats: number;
  available?: boolean;
}

interface PackageBookingFormProps {
  packageId: string;
  packageName: string;
  packageType: string;
  basePrice: number | null;
  pricePerDay: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  customCosts: CustomCost[];
  vehicles: Vehicle[];
  isGlobal: boolean;
}

export default function PackageBookingForm({
  packageId,
  packageName,
  packageType,
  basePrice,
  pricePerDay,
  minDuration,
  maxDuration,
  customCosts,
  vehicles: initialVehicles,
  isGlobal,
}: PackageBookingFormProps) {
  const router = useRouter();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [selectedOptionalCosts, setSelectedOptionalCosts] = useState<Set<string>>(new Set());
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState("");

  // Calculate duration
  const getDays = () => {
    if (!startDate || !endDate) return 0;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  };

  const days = getDays();

  // Check availability when dates change
  useEffect(() => {
    if (startDate && endDate && days > 0) {
      checkAvailability();
    }
  }, [startDate, endDate]);

  const checkAvailability = async () => {
    if (!startDate || !endDate) return;

    setCheckingAvailability(true);
    try {
      const res = await fetch(
        `/api/packages/${packageId}/availability?startDate=${startDate}&endDate=${endDate}`
      );
      if (res.ok) {
        const data = await res.json();
        setVehicles(data.vehicles);
        // Reset selection if selected vehicle is no longer available
        if (selectedVehicle) {
          const stillAvailable = data.vehicles.find(
            (v: Vehicle) => v.id === selectedVehicle && v.available
          );
          if (!stillAvailable) {
            setSelectedVehicle(null);
          }
        }
      }
    } catch (err) {
      console.error("Error checking availability:", err);
    }
    setCheckingAvailability(false);
  };

  // Get selected vehicle details
  const selectedVehicleData = vehicles.find((v) => v.id === selectedVehicle);

  // Calculate pricing
  const calculatePricing = () => {
    const packageBase = basePrice || 0;

    // Required custom costs
    const requiredCostsTotal = customCosts
      .filter((c) => !c.isOptional)
      .reduce((sum, c) => sum + c.price, 0);

    // Selected optional costs
    const optionalCostsTotal = customCosts
      .filter((c) => c.isOptional && selectedOptionalCosts.has(c.id))
      .reduce((sum, c) => sum + c.price, 0);

    const customCostsTotal = requiredCostsTotal + optionalCostsTotal;

    // Vehicle price per day (custom price or default)
    const vehicleDailyRate = selectedVehicleData
      ? (selectedVehicleData.packagePrice ?? selectedVehicleData.pricePerDay)
      : 0;

    const vehicleRentalTotal = vehicleDailyRate * days;

    const total = packageBase + customCostsTotal + vehicleRentalTotal;

    return {
      packageBase,
      requiredCostsTotal,
      optionalCostsTotal,
      customCostsTotal,
      vehicleDailyRate,
      vehicleRentalTotal,
      total,
      days,
    };
  };

  const pricing = calculatePricing();

  // Handle optional cost toggle
  const toggleOptionalCost = (costId: string) => {
    setSelectedOptionalCosts((prev) => {
      const next = new Set(prev);
      if (next.has(costId)) {
        next.delete(costId);
      } else {
        next.add(costId);
      }
      return next;
    });
  };

  // Validate form
  const isValid = () => {
    if (!startDate || !endDate) return false;
    if (days < 1) return false;
    if (minDuration && days < minDuration) return false;
    if (maxDuration && days > maxDuration) return false;
    if (!selectedVehicle) return false;
    if (!selectedVehicleData?.available) return false;
    return true;
  };

  // Submit booking
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/bookings/package", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          vehicleId: selectedVehicle,
          startDate,
          endDate,
          pickupLocation: pickupLocation || null,
          dropoffLocation: dropoffLocation || null,
          selectedCustomCostIds: Array.from(selectedOptionalCosts),
          notes: notes || null,
        }),
      });

      if (res.ok) {
        router.push(`/bookings?success=true`);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create booking");
      }
    } catch (err) {
      console.error("Error creating booking:", err);
      setError("Failed to create booking. Please try again.");
    }
    setLoading(false);
  };

  // Get min date (today)
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-8">
      {/* Date Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">1. Select Dates</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>
        {days > 0 && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-slate-600">Duration:</span>
            <span className="font-semibold text-purple-600">{days} day{days !== 1 ? "s" : ""}</span>
            {minDuration && days < minDuration && (
              <span className="text-red-600 ml-2">(Minimum: {minDuration} days)</span>
            )}
            {maxDuration && days > maxDuration && (
              <span className="text-red-600 ml-2">(Maximum: {maxDuration} days)</span>
            )}
          </div>
        )}
      </div>

      {/* Vehicle Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-900">2. Select Vehicle</h3>
          {checkingAvailability && (
            <span className="text-sm text-slate-500 flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Checking availability...
            </span>
          )}
        </div>

        {!startDate || !endDate ? (
          <p className="text-slate-500 text-center py-8">Please select dates first to see available vehicles</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
            {vehicles.map((vehicle) => {
              const isAvailable = vehicle.available !== false;
              const isSelected = selectedVehicle === vehicle.id;
              const displayPrice = vehicle.packagePrice ?? vehicle.pricePerDay;

              return (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => isAvailable && setSelectedVehicle(vehicle.id)}
                  disabled={!isAvailable}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : isAvailable
                      ? "border-slate-200 hover:border-purple-300 hover:bg-slate-50"
                      : "border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex gap-3">
                    {vehicle.images?.[0] && (
                      <img
                        src={vehicle.images[0]}
                        alt={vehicle.name}
                        className="w-20 h-14 object-cover rounded-lg"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{vehicle.name}</p>
                      <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="font-bold text-purple-600">{formatCurrency(displayPrice)}</span>
                        <span className="text-xs text-slate-500">/day</span>
                      </div>
                    </div>
                  </div>
                  {!isAvailable && (
                    <span className="mt-2 inline-block text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                      Not available
                    </span>
                  )}
                  {isSelected && (
                    <div className="mt-2 flex items-center gap-1 text-purple-600 text-sm">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Selected
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Custom Costs */}
      {customCosts.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">3. Additional Services</h3>
          <div className="space-y-3">
            {/* Required costs */}
            {customCosts.filter((c) => !c.isOptional).map((cost) => (
              <div key={cost.id} className="flex items-center justify-between p-4 bg-purple-50 rounded-xl border border-purple-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{cost.name}</p>
                    {cost.description && <p className="text-sm text-slate-500">{cost.description}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-purple-600">{formatCurrency(cost.price)}</p>
                  <p className="text-xs text-purple-500">Included</p>
                </div>
              </div>
            ))}

            {/* Optional costs */}
            {customCosts.filter((c) => c.isOptional).map((cost) => {
              const isSelected = selectedOptionalCosts.has(cost.id);
              return (
                <button
                  key={cost.id}
                  type="button"
                  onClick={() => toggleOptionalCost(cost.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-purple-500 bg-purple-50"
                      : "border-slate-200 hover:border-purple-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                      isSelected ? "border-purple-500 bg-purple-500" : "border-slate-300"
                    }`}>
                      {isSelected && (
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-slate-900">{cost.name}</p>
                      {cost.description && <p className="text-sm text-slate-500">{cost.description}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(cost.price)}</p>
                    <p className="text-xs text-slate-500">Optional</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Location & Notes */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">4. Pickup & Dropoff</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Pickup Location</label>
            <input
              type="text"
              value={pickupLocation}
              onChange={(e) => setPickupLocation(e.target.value)}
              placeholder="Enter pickup address"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Dropoff Location</label>
            <input
              type="text"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              placeholder="Enter dropoff address"
              className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
          </div>
        </div>
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700 mb-1">Special Requests (Optional)</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special requests or notes..."
            className="w-full rounded-lg border border-slate-300 px-4 py-3 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-gradient-to-br from-purple-900 to-blue-900 rounded-2xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Price Summary</h3>
        <div className="space-y-3">
          {pricing.packageBase > 0 && (
            <div className="flex justify-between text-purple-200">
              <span>Package Base ({packageName})</span>
              <span>{formatCurrency(pricing.packageBase)}</span>
            </div>
          )}
          {pricing.customCostsTotal > 0 && (
            <div className="flex justify-between text-purple-200">
              <span>Additional Services</span>
              <span>{formatCurrency(pricing.customCostsTotal)}</span>
            </div>
          )}
          {selectedVehicleData && days > 0 && (
            <div className="flex justify-between text-purple-200">
              <span>
                {selectedVehicleData.name} ({days} day{days !== 1 ? "s" : ""} x {formatCurrency(pricing.vehicleDailyRate)})
              </span>
              <span>{formatCurrency(pricing.vehicleRentalTotal)}</span>
            </div>
          )}
          <div className="border-t border-purple-700 pt-3 mt-3">
            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatCurrency(pricing.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!isValid() || loading}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all ${
          isValid() && !loading
            ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl"
            : "bg-slate-300 text-slate-500 cursor-not-allowed"
        }`}
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Creating Booking...
          </span>
        ) : (
          `Book ${packageName} - ${formatCurrency(pricing.total)}`
        )}
      </button>
    </div>
  );
}
