import { prisma } from "@/lib/prisma";
import PackageCard from "@/components/PackageCard";
import Link from "next/link";

interface SearchParams {
  type?: string;
}

const packageTypes = [
  { value: "all", label: "All Packages", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
  { value: "DAILY", label: "Daily", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { value: "WEEKLY", label: "Weekly", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { value: "MONTHLY", label: "Monthly", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5" },
  { value: "AIRPORT_PICKUP", label: "Airport Pickup", icon: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" },
  { value: "AIRPORT_DROP", label: "Airport Drop", icon: "M19 14l-7 7m0 0l-7-7m7 7V3" },
  { value: "AIRPORT_ROUND", label: "Airport Round", icon: "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" },
  { value: "HOURLY", label: "Hourly", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" },
];

async function getPackages(type?: string) {
  const where: Record<string, unknown> = { isActive: true };

  if (type && type !== "all") {
    where.type = type;
  }

  const packages = await prisma.package.findMany({
    where,
    include: {
      vehiclePackages: {
        include: {
          vehicle: {
            select: { id: true, available: true },
          },
        },
      },
      policies: {
        include: {
          policy: {
            select: { id: true, name: true, title: true },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  // Count available vehicles for each package
  // Global packages are available for all vehicles
  const totalAvailableVehicles = await prisma.vehicle.count({
    where: { available: true },
  });

  return packages.map((pkg) => ({
    id: pkg.id,
    name: pkg.name,
    description: pkg.description,
    type: pkg.type,
    basePrice: pkg.basePrice ? Number(pkg.basePrice) : null,
    pricePerDay: pkg.pricePerDay ? Number(pkg.pricePerDay) : null,
    pricePerHour: pkg.pricePerHour ? Number(pkg.pricePerHour) : null,
    discount: pkg.discount ? Number(pkg.discount) : null,
    minDuration: pkg.minDuration,
    maxDuration: pkg.maxDuration,
    icon: pkg.icon,
    isGlobal: pkg.isGlobal,
    // If global, count all available vehicles; otherwise count linked vehicles
    vehicleCount: pkg.isGlobal
      ? totalAvailableVehicles
      : pkg.vehiclePackages.filter((vp) => vp.vehicle.available).length,
  }));
}

async function getPackageStats() {
  const totalPackages = await prisma.package.count({ where: { isActive: true } });
  const types = await prisma.package.groupBy({
    by: ["type"],
    where: { isActive: true },
    _count: true,
  });
  return { totalPackages, types };
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const packages = await getPackages(params.type);
  const stats = await getPackageStats();

  const hasFilters = params.type && params.type !== "all";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="relative py-16 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Rental
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                Packages & Services
              </span>
            </h1>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-8">
              Choose from {stats.totalPackages}+ rental packages. Daily rentals, weekly deals,
              airport services, and more.
            </p>

            {/* Quick Stats */}
            <div className="flex flex-wrap justify-center gap-4 text-white">
              {stats.types.slice(0, 5).map((t) => (
                <Link
                  key={t.type}
                  href={`/packages?type=${t.type}`}
                  className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full hover:bg-white/20 transition-colors"
                >
                  <span className="font-bold">{t._count}</span>
                  <span className="text-slate-300">
                    {t.type.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Package Type Quick Filters */}
        <div className="mb-8 overflow-x-auto pb-2">
          <div className="flex gap-3 min-w-max">
            {packageTypes.map((type) => (
              <Link
                key={type.value}
                href={type.value === "all" ? "/packages" : `/packages?type=${type.value}`}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all duration-300 ${
                  (type.value === "all" && !params.type) || params.type === type.value
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25"
                    : "bg-white text-slate-700 hover:bg-slate-100 shadow-sm"
                }`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={type.icon} />
                </svg>
                <span>{type.label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Results Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {hasFilters ? `${params.type?.replace(/_/g, " ")} Packages` : "All Packages"}
            </h2>
            <p className="text-slate-600">
              {packages.length} package{packages.length !== 1 ? "s" : ""} available
            </p>
          </div>

          {/* View Toggle */}
          <Link
            href="/vehicles"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 font-medium transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
            Browse by Vehicle
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-slate-600">Active filters:</span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-sm">
              Type: {params.type?.replace(/_/g, " ")}
              <Link href="/packages" className="hover:text-purple-900">
                ×
              </Link>
            </span>
            <Link
              href="/packages"
              className="text-sm text-red-600 hover:text-red-700 font-medium ml-2"
            >
              Clear all
            </Link>
          </div>
        )}

        {/* Package Grid */}
        {packages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {packages.map((pkg) => (
              <PackageCard
                key={pkg.id}
                id={pkg.id}
                name={pkg.name}
                description={pkg.description}
                type={pkg.type}
                basePrice={pkg.basePrice}
                pricePerDay={pkg.pricePerDay}
                pricePerHour={pkg.pricePerHour}
                discount={pkg.discount}
                minDuration={pkg.minDuration}
                maxDuration={pkg.maxDuration}
                icon={pkg.icon}
                vehicleCount={pkg.vehicleCount}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
            <div className="w-24 h-24 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-6">
              <svg className="w-12 h-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-2">No packages found</h3>
            <p className="text-slate-600 mb-6 max-w-md mx-auto">
              We couldn&apos;t find any packages matching your criteria. Try adjusting your filters.
            </p>
            <Link
              href="/packages"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300"
            >
              View All Packages
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}

        {/* Popular Packages Info Section */}
        <section className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Best Value</h3>
            <p className="text-slate-600 text-sm">
              Weekly and monthly packages offer significant discounts for longer rentals. Save up to 20% on extended trips.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Airport Services</h3>
            <p className="text-slate-600 text-sm">
              Convenient airport pickup and drop services at Bandaranaike (CMB) and Mattala (HRI) airports.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Flexible Options</h3>
            <p className="text-slate-600 text-sm">
              Choose from hourly, daily, or long-term rentals. All packages include insurance and roadside assistance.
            </p>
          </div>
        </section>
      </div>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need a Custom Package?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Contact us for custom rental packages tailored to your specific needs.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Contact Us
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
