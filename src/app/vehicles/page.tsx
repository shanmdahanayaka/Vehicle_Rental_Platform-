import { prisma } from "@/lib/prisma";
import VehicleCard from "@/components/VehicleCard";
import VehicleFilters from "@/components/VehicleFilters";
import VehicleSortDropdown from "@/components/VehicleSortDropdown";
import Link from "next/link";

interface SearchParams {
  type?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
  transmission?: string;
  fuelType?: string;
  seats?: string;
  sort?: string;
}

const sriLankanLocations = [
  "Colombo",
  "Kandy",
  "Galle",
  "Negombo",
  "Ella",
  "Nuwara Eliya",
  "Sigiriya",
  "Anuradhapura",
  "Trincomalee",
  "Jaffna",
  "Mirissa",
  "Hikkaduwa",
  "Bentota",
  "Dambulla",
  "Polonnaruwa",
  "Bandaranaike Airport (CMB)",
  "Mattala Airport (HRI)",
];

async function getVehicles(searchParams: SearchParams) {
  const where: Record<string, unknown> = { available: true };

  if (searchParams.type && searchParams.type !== "all") {
    where.type = searchParams.type;
  }
  if (searchParams.location) {
    where.location = { contains: searchParams.location, mode: "insensitive" };
  }
  if (searchParams.transmission && searchParams.transmission !== "all") {
    where.transmission = searchParams.transmission;
  }
  if (searchParams.fuelType && searchParams.fuelType !== "all") {
    where.fuelType = searchParams.fuelType;
  }
  if (searchParams.seats) {
    where.seats = { gte: parseInt(searchParams.seats) };
  }
  if (searchParams.minPrice || searchParams.maxPrice) {
    where.pricePerDay = {};
    if (searchParams.minPrice) {
      (where.pricePerDay as Record<string, unknown>).gte = parseFloat(
        searchParams.minPrice
      );
    }
    if (searchParams.maxPrice) {
      (where.pricePerDay as Record<string, unknown>).lte = parseFloat(
        searchParams.maxPrice
      );
    }
  }

  // Sorting
  let orderBy: Record<string, string> = { createdAt: "desc" };
  if (searchParams.sort === "price_asc") {
    orderBy = { pricePerDay: "asc" };
  } else if (searchParams.sort === "price_desc") {
    orderBy = { pricePerDay: "desc" };
  } else if (searchParams.sort === "newest") {
    orderBy = { createdAt: "desc" };
  } else if (searchParams.sort === "popular") {
    orderBy = { createdAt: "desc" }; // Would need a views/bookings count for true popularity
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      reviews: {
        select: { rating: true },
      },
    },
    orderBy,
  });

  return vehicles.map((vehicle) => ({
    ...vehicle,
    pricePerDay: Number(vehicle.pricePerDay),
    avgRating:
      vehicle.reviews.length > 0
        ? vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
          vehicle.reviews.length
        : 0,
    reviewCount: vehicle.reviews.length,
  }));
}

async function getVehicleStats() {
  const totalVehicles = await prisma.vehicle.count({ where: { available: true } });
  const types = await prisma.vehicle.groupBy({
    by: ["type"],
    where: { available: true },
    _count: true,
  });
  return { totalVehicles, types };
}

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const vehicles = await getVehicles(params);
  const stats = await getVehicleStats();

  const vehicleTypes = [
    { value: "all", label: "All Types", icon: "🚗" },
    { value: "CAR", label: "Cars", icon: "🚗" },
    { value: "SUV", label: "SUVs", icon: "🚙" },
    { value: "VAN", label: "Vans", icon: "🚐" },
    { value: "LUXURY", label: "Luxury", icon: "✨" },
    { value: "MOTORCYCLE", label: "Motorcycles", icon: "🏍️" },
    { value: "TRUCK", label: "Trucks", icon: "🛻" },
  ];

  const hasFilters =
    params.type ||
    params.location ||
    params.minPrice ||
    params.maxPrice ||
    params.transmission ||
    params.fuelType ||
    params.seats;

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
              Find Your Perfect
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                Rental Vehicle
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Choose from {stats.totalVehicles}+ vehicles available across Sri
              Lanka. From economy cars to luxury SUVs.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-6 text-white">
              {stats.types.slice(0, 5).map((t) => (
                <div
                  key={t.type}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full"
                >
                  <span className="font-bold">{t._count}</span>
                  <span className="text-slate-300">{t.type}s</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Vehicle Type Quick Filters */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {vehicleTypes.map((type) => (
              <Link
                key={type.value}
                href={
                  type.value === "all"
                    ? "/vehicles"
                    : `/vehicles?type=${type.value}`
                }
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  (type.value === "all" && !params.type) ||
                  params.type === type.value
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25"
                    : "bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <span className="text-xl">{type.icon}</span>
                <span>{type.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1">
            <VehicleFilters
              params={params}
              locations={sriLankanLocations}
              vehicleCount={vehicles.length}
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            {/* Results Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {hasFilters ? "Filtered Results" : "All Vehicles"}
                </h2>
                <p className="text-slate-600">
                  {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""}{" "}
                  available
                </p>
              </div>

              {/* Sort Dropdown */}
              <VehicleSortDropdown currentSort={params.sort || "newest"} />
            </div>

            {/* Active Filters */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="text-sm text-slate-600">Active filters:</span>
                {params.type && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm">
                    Type: {params.type}
                    <Link
                      href={`/vehicles?${new URLSearchParams(
                        Object.fromEntries(
                          Object.entries(params).filter(([k]) => k !== "type")
                        )
                      ).toString()}`}
                      className="hover:text-blue-900"
                    >
                      ×
                    </Link>
                  </span>
                )}
                {params.location && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
                    Location: {params.location}
                    <Link
                      href={`/vehicles?${new URLSearchParams(
                        Object.fromEntries(
                          Object.entries(params).filter(
                            ([k]) => k !== "location"
                          )
                        )
                      ).toString()}`}
                      className="hover:text-purple-900"
                    >
                      ×
                    </Link>
                  </span>
                )}
                {(params.minPrice || params.maxPrice) && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                    Price: Rs.{params.minPrice || "0"} - Rs.
                    {params.maxPrice || "∞"}
                    <Link
                      href={`/vehicles?${new URLSearchParams(
                        Object.fromEntries(
                          Object.entries(params).filter(
                            ([k]) => k !== "minPrice" && k !== "maxPrice"
                          )
                        )
                      ).toString()}`}
                      className="hover:text-green-900"
                    >
                      ×
                    </Link>
                  </span>
                )}
                <Link
                  href="/vehicles"
                  className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
                >
                  Clear all
                </Link>
              </div>
            )}

            {/* Vehicle Grid */}
            {vehicles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {vehicles.map((vehicle) => (
                  <VehicleCard
                    key={vehicle.id}
                    id={vehicle.id}
                    name={vehicle.name}
                    brand={vehicle.brand}
                    model={vehicle.model}
                    year={vehicle.year}
                    type={vehicle.type}
                    transmission={vehicle.transmission}
                    fuelType={vehicle.fuelType}
                    seats={vehicle.seats}
                    pricePerDay={vehicle.pricePerDay}
                    images={vehicle.images}
                    location={vehicle.location}
                    avgRating={vehicle.avgRating}
                    reviewCount={vehicle.reviewCount}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
                <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
                  <svg
                    className="w-12 h-12 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">
                  No vehicles found
                </h3>
                <p className="text-slate-600 mb-6 max-w-md mx-auto">
                  We couldn&apos;t find any vehicles matching your criteria. Try
                  adjusting your filters or browse all available vehicles.
                </p>
                <Link
                  href="/vehicles"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300"
                >
                  View All Vehicles
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
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-blue-600 to-purple-600 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Can&apos;t Find What You&apos;re Looking For?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Contact us and we&apos;ll help you find the perfect vehicle for your
            needs.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Contact Us
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
        </div>
      </section>
    </div>
  );
}
