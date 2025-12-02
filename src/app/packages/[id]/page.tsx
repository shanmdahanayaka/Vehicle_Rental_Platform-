import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import VehicleCard from "@/components/VehicleCard";

const typeLabels: Record<string, string> = {
  DAILY: "Daily Rental",
  WEEKLY: "Weekly Rental",
  MONTHLY: "Monthly Rental",
  AIRPORT_PICKUP: "Airport Pickup",
  AIRPORT_DROP: "Airport Drop",
  AIRPORT_ROUND: "Airport Round Trip",
  HOURLY: "Hourly Rental",
  CUSTOM: "Custom Package",
};

const packageIcons: Record<string, string> = {
  DAILY: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  WEEKLY: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
  MONTHLY: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  AIRPORT_PICKUP: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01",
  AIRPORT_DROP: "M19 14l-7 7m0 0l-7-7m7 7V3",
  AIRPORT_ROUND: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4",
  HOURLY: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  CUSTOM: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
};

async function getPackage(id: string) {
  const pkg = await prisma.package.findUnique({
    where: { id, isActive: true },
    include: {
      policies: {
        include: {
          policy: true,
        },
      },
      vehiclePackages: {
        include: {
          vehicle: {
            include: {
              reviews: {
                select: { rating: true },
              },
            },
          },
        },
      },
    },
  });

  return pkg;
}

async function getAvailableVehicles(packageId: string, isGlobal: boolean) {
  if (isGlobal) {
    // For global packages, get all available vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: { available: true },
      include: {
        reviews: {
          select: { rating: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return vehicles.map((v) => ({
      ...v,
      pricePerDay: Number(v.pricePerDay),
      avgRating:
        v.reviews.length > 0
          ? v.reviews.reduce((sum, r) => sum + r.rating, 0) / v.reviews.length
          : 0,
      reviewCount: v.reviews.length,
    }));
  }

  // For non-global packages, get linked vehicles
  const vehiclePackages = await prisma.vehiclePackage.findMany({
    where: {
      packageId,
      vehicle: { available: true },
    },
    include: {
      vehicle: {
        include: {
          reviews: {
            select: { rating: true },
          },
        },
      },
    },
  });

  return vehiclePackages.map((vp) => ({
    ...vp.vehicle,
    pricePerDay: Number(vp.customPrice || vp.vehicle.pricePerDay),
    avgRating:
      vp.vehicle.reviews.length > 0
        ? vp.vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) / vp.vehicle.reviews.length
        : 0,
    reviewCount: vp.vehicle.reviews.length,
  }));
}

export default async function PackageDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pkg = await getPackage(id);

  if (!pkg) {
    notFound();
  }

  const vehicles = await getAvailableVehicles(id, pkg.isGlobal);
  const iconPath = packageIcons[pkg.type] || packageIcons.CUSTOM;

  // Pricing display
  const getPriceInfo = () => {
    if (pkg.basePrice) {
      return { price: Number(pkg.basePrice), suffix: "flat rate", type: "base" };
    }
    if (pkg.pricePerDay) {
      return { price: Number(pkg.pricePerDay), suffix: "per day", type: "daily" };
    }
    if (pkg.pricePerHour) {
      return { price: Number(pkg.pricePerHour), suffix: "per hour", type: "hourly" };
    }
    return null;
  };

  const priceInfo = getPriceInfo();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-purple-200 mb-8">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/packages" className="hover:text-white transition-colors">
              Packages
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-white">{pkg.name}</span>
          </nav>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Package Info */}
            <div>
              {/* Icon & Type Badge */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                  </svg>
                </div>
                <span className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-semibold">
                  {typeLabels[pkg.type] || pkg.type}
                </span>
                {pkg.discount && Number(pkg.discount) > 0 && (
                  <span className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                    {Number(pkg.discount)}% OFF
                  </span>
                )}
              </div>

              <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{pkg.name}</h1>

              {pkg.description && (
                <p className="text-xl text-purple-200 mb-8">{pkg.description}</p>
              )}

              {/* Key Features */}
              <div className="flex flex-wrap gap-4">
                {pkg.minDuration && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                    <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white">
                      Min: {pkg.minDuration} {pkg.type === "HOURLY" ? "hours" : "days"}
                    </span>
                  </div>
                )}
                {pkg.maxDuration && (
                  <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                    <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-white">
                      Max: {pkg.maxDuration} {pkg.type === "HOURLY" ? "hours" : "days"}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-xl">
                  <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                  </svg>
                  <span className="text-white">{vehicles.length} vehicles available</span>
                </div>
              </div>
            </div>

            {/* Pricing Card */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-600 mb-2">Package Price</h3>
              {priceInfo ? (
                <>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      Rs.{priceInfo.price.toLocaleString()}
                    </span>
                    <span className="text-slate-500 text-lg">{priceInfo.suffix}</span>
                  </div>
                  {pkg.discount && Number(pkg.discount) > 0 && (
                    <p className="text-green-600 font-semibold mb-6">
                      Save {Number(pkg.discount)}% compared to daily rates!
                    </p>
                  )}
                </>
              ) : (
                <p className="text-2xl font-semibold text-slate-700 mb-6">Custom pricing available</p>
              )}

              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Free cancellation up to 24 hours</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Insurance included</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>24/7 roadside assistance</span>
                </div>
              </div>

              <Link
                href="#vehicles"
                className="block w-full text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                View Available Vehicles
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Policies Section */}
      {pkg.policies.length > 0 && (
        <section className="py-12 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Package Policies</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pkg.policies.map((pp) => (
                <div
                  key={pp.id}
                  className="p-5 bg-slate-50 rounded-xl border border-slate-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900">{pp.policy.title}</h3>
                      {pp.policy.summary && (
                        <p className="text-sm text-slate-600 mt-1">{pp.policy.summary}</p>
                      )}
                      {pp.policy.isRequired && (
                        <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                          Required
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Available Vehicles Section */}
      <section id="vehicles" className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Available Vehicles</h2>
              <p className="text-slate-600 mt-1">
                {vehicles.length} vehicle{vehicles.length !== 1 ? "s" : ""} available with this package
              </p>
            </div>
            <Link
              href="/vehicles"
              className="text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1"
            >
              View all vehicles
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>

          {vehicles.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
            <div className="text-center py-12 bg-white rounded-2xl">
              <svg className="w-16 h-16 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No vehicles available</h3>
              <p className="text-slate-600">Check back later for available vehicles with this package.</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Book?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Select a vehicle above to start your booking with the {pkg.name} package.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="#vehicles"
              className="inline-flex items-center justify-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
            >
              Choose a Vehicle
            </Link>
            <Link
              href="/contact"
              className="inline-flex items-center justify-center gap-2 bg-transparent border-2 border-white text-white px-8 py-4 rounded-xl font-semibold hover:bg-white/10 transition-colors"
            >
              Need Help?
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
