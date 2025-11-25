import { prisma } from "@/lib/prisma";
import VehicleCard from "@/components/VehicleCard";

interface SearchParams {
  type?: string;
  location?: string;
  minPrice?: string;
  maxPrice?: string;
}

async function getVehicles(searchParams: SearchParams) {
  const where: Record<string, unknown> = { available: true };

  if (searchParams.type) where.type = searchParams.type;
  if (searchParams.location) {
    where.location = { contains: searchParams.location };
  }
  if (searchParams.minPrice || searchParams.maxPrice) {
    where.pricePerDay = {};
    if (searchParams.minPrice) {
      (where.pricePerDay as Record<string, unknown>).gte = parseFloat(searchParams.minPrice);
    }
    if (searchParams.maxPrice) {
      (where.pricePerDay as Record<string, unknown>).lte = parseFloat(searchParams.maxPrice);
    }
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    include: {
      reviews: {
        select: { rating: true },
      },
    },
    orderBy: { createdAt: "desc" },
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

export default async function VehiclesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const vehicles = await getVehicles(params);

  const vehicleTypes = [
    "CAR",
    "SUV",
    "VAN",
    "TRUCK",
    "MOTORCYCLE",
    "LUXURY",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Browse Vehicles</h1>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-md mb-8">
        <form className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Vehicle Type
            </label>
            <select
              name="type"
              defaultValue={params.type || ""}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {vehicleTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <input
              type="text"
              name="location"
              defaultValue={params.location || ""}
              placeholder="Enter location"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Min Price
            </label>
            <input
              type="number"
              name="minPrice"
              defaultValue={params.minPrice || ""}
              placeholder="$0"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Price
            </label>
            <input
              type="number"
              name="maxPrice"
              defaultValue={params.maxPrice || ""}
              placeholder="$500"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-4">
            <button
              type="submit"
              className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
            >
              Apply Filters
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
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
              avgRating={vehicle.avgRating}
              reviewCount={vehicle.reviewCount}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <svg
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1}
              d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            No vehicles found
          </h3>
          <p className="text-gray-500">
            Try adjusting your filters or check back later
          </p>
        </div>
      )}
    </div>
  );
}
