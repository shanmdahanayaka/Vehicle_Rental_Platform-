import Hero from "@/components/Hero";
import VehicleCard from "@/components/VehicleCard";
import { prisma } from "@/lib/prisma";

async function getFeaturedVehicles() {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { featured: true, available: true },
      take: 6,
      include: {
        reviews: {
          select: { rating: true },
        },
      },
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
  } catch {
    return [];
  }
}

export default async function Home() {
  const featuredVehicles = await getFeaturedVehicles();

  return (
    <div>
      <Hero />

      {/* Featured Vehicles Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Vehicles
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our handpicked selection of top-rated vehicles available for
            rent
          </p>
        </div>

        {featuredVehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredVehicles.map((vehicle) => (
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
          <div className="text-center py-12 bg-white rounded-xl shadow">
            <p className="text-gray-500 text-lg">
              No featured vehicles available at the moment.
            </p>
            <p className="text-gray-400 mt-2">
              Check back soon or browse all vehicles.
            </p>
          </div>
        )}
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose RentWheels?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Best Prices
              </h3>
              <p className="text-gray-600">
                Competitive rates with no hidden fees. Get the best value for your
                money.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Safe & Reliable
              </h3>
              <p className="text-gray-600">
                All vehicles are regularly maintained and inspected for your
                safety.
              </p>
            </div>
            <div className="text-center p-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                24/7 Support
              </h3>
              <p className="text-gray-600">
                Round-the-clock customer support to assist you anytime, anywhere.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
