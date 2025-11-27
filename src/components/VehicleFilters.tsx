"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface VehicleFiltersProps {
  params: {
    type?: string;
    location?: string;
    minPrice?: string;
    maxPrice?: string;
    transmission?: string;
    fuelType?: string;
    seats?: string;
  };
  locations: string[];
  vehicleCount: number;
}

export default function VehicleFilters({
  params,
  locations,
  vehicleCount,
}: VehicleFiltersProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const [filters, setFilters] = useState({
    location: params.location || "",
    minPrice: params.minPrice || "",
    maxPrice: params.maxPrice || "",
    transmission: params.transmission || "all",
    fuelType: params.fuelType || "all",
    seats: params.seats || "",
  });

  // Sync filters state when URL params change
  useEffect(() => {
    setFilters({
      location: params.location || "",
      minPrice: params.minPrice || "",
      maxPrice: params.maxPrice || "",
      transmission: params.transmission || "all",
      fuelType: params.fuelType || "all",
      seats: params.seats || "",
    });
  }, [params.location, params.minPrice, params.maxPrice, params.transmission, params.fuelType, params.seats]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const searchParams = new URLSearchParams();

    if (params.type) searchParams.set("type", params.type);
    if (filters.location) searchParams.set("location", filters.location);
    if (filters.minPrice) searchParams.set("minPrice", filters.minPrice);
    if (filters.maxPrice) searchParams.set("maxPrice", filters.maxPrice);
    if (filters.transmission && filters.transmission !== "all")
      searchParams.set("transmission", filters.transmission);
    if (filters.fuelType && filters.fuelType !== "all")
      searchParams.set("fuelType", filters.fuelType);
    if (filters.seats) searchParams.set("seats", filters.seats);

    router.push(`/vehicles?${searchParams.toString()}`);
  };

  const handleReset = () => {
    setFilters({
      location: "",
      minPrice: "",
      maxPrice: "",
      transmission: "all",
      fuelType: "all",
      seats: "",
    });
    router.push("/vehicles");
  };

  return (
    <>
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden w-full flex items-center justify-center gap-2 bg-white rounded-xl px-4 py-3 shadow-sm mb-4"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
        <span className="font-medium text-slate-700">Filters</span>
        <span className="text-sm text-slate-500">({vehicleCount} results)</span>
      </button>

      {/* Filter Panel */}
      <div
        className={`${
          isOpen ? "block" : "hidden"
        } lg:block bg-white rounded-2xl shadow-sm p-6 sticky top-24`}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-slate-900">Filters</h3>
          <button
            onClick={handleReset}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Reset All
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Location */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Location
            </label>
            <div className="relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <select
                name="location"
                value={filters.location}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white text-slate-700"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Price Range */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Price Range (Rs/day)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  Rs.
                </span>
                <input
                  type="number"
                  name="minPrice"
                  value={filters.minPrice}
                  onChange={handleChange}
                  placeholder="Min"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
                  Rs.
                </span>
                <input
                  type="number"
                  name="maxPrice"
                  value={filters.maxPrice}
                  onChange={handleChange}
                  placeholder="Max"
                  className="w-full pl-10 pr-3 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          {/* Transmission */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Transmission
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["all", "AUTOMATIC", "MANUAL"].map((option) => (
                <label
                  key={option}
                  className={`flex items-center justify-center px-4 py-2 rounded-xl border cursor-pointer transition ${
                    filters.transmission === option
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    name="transmission"
                    value={option}
                    checked={filters.transmission === option}
                    onChange={handleChange}
                    className="sr-only"
                  />
                  <span className="text-sm font-medium">
                    {option === "all" ? "All" : option.charAt(0) + option.slice(1).toLowerCase()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fuel Type */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Fuel Type
            </label>
            <select
              name="fuelType"
              value={filters.fuelType}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-white text-slate-700"
            >
              <option value="all">All Fuel Types</option>
              <option value="PETROL">Petrol</option>
              <option value="DIESEL">Diesel</option>
              <option value="HYBRID">Hybrid</option>
              <option value="ELECTRIC">Electric</option>
            </select>
          </div>

          {/* Seats */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Minimum Seats
            </label>
            <div className="flex gap-2">
              {["", "2", "4", "5", "7"].map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFilters({ ...filters, seats: option })}
                  className={`flex-1 px-3 py-2 rounded-xl border text-sm font-medium transition ${
                    filters.seats === option
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-200 hover:border-slate-300 text-slate-600"
                  }`}
                >
                  {option === "" ? "Any" : `${option}+`}
                </button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
          >
            Apply Filters
          </button>
        </form>

        {/* Quick Tips */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <h4 className="text-sm font-semibold text-slate-700 mb-2">
            Quick Tips
          </h4>
          <ul className="text-xs text-slate-500 space-y-1">
            <li>• Book early for better rates</li>
            <li>• SUVs are great for hill country</li>
            <li>• Auto transmission is easier for tourists</li>
          </ul>
        </div>
      </div>
    </>
  );
}
