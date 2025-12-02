import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BookingForm from "./BookingForm";
import { formatCurrency } from "@/config/site";
import FavoriteButton from "@/components/FavoriteButton";
import AddToCartButton from "@/components/AddToCartButton";

const POLICY_CATEGORY_ICONS: Record<string, string> = {
  cancellation: "🚫",
  insurance: "🛡️",
  fuel: "⛽",
  damage: "🔧",
  general: "📋",
  payment: "💳",
  mileage: "📏",
};

const PACKAGE_TYPE_LABELS: Record<string, string> = {
  DAILY: "Daily Rental",
  WEEKLY: "Weekly Rental",
  MONTHLY: "Monthly Rental",
  AIRPORT_PICKUP: "Airport Pickup",
  AIRPORT_DROP: "Airport Drop",
  AIRPORT_ROUND: "Airport Round Trip",
  HOURLY: "Hourly Rental",
  CUSTOM: "Custom Package",
};

const PACKAGE_TYPE_COLORS: Record<string, string> = {
  DAILY: "bg-blue-100 text-blue-700",
  WEEKLY: "bg-green-100 text-green-700",
  MONTHLY: "bg-purple-100 text-purple-700",
  AIRPORT_PICKUP: "bg-orange-100 text-orange-700",
  AIRPORT_DROP: "bg-amber-100 text-amber-700",
  AIRPORT_ROUND: "bg-red-100 text-red-700",
  HOURLY: "bg-cyan-100 text-cyan-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

const TYPE_COLORS: Record<string, string> = {
  CAR: "from-blue-500 to-blue-600",
  SUV: "from-green-500 to-green-600",
  VAN: "from-orange-500 to-orange-600",
  LUXURY: "from-purple-500 to-purple-600",
  MOTORCYCLE: "from-red-500 to-red-600",
  TRUCK: "from-slate-500 to-slate-600",
};

async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      reviews: {
        include: {
          user: {
            select: { name: true, image: true },
          },
        },
        orderBy: { createdAt: "desc" },
      },
      policies: {
        include: {
          policy: true,
        },
      },
    },
  });

  if (!vehicle) return null;

  const avgRating =
    vehicle.reviews.length > 0
      ? vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
        vehicle.reviews.length
      : 0;

  return {
    ...vehicle,
    pricePerDay: Number(vehicle.pricePerDay),
    avgRating,
  };
}

async function getAvailablePackages(vehicleId: string) {
  const globalPackages = await prisma.package.findMany({
    where: {
      isActive: true,
      isGlobal: true,
    },
    include: {
      policies: {
        include: {
          policy: {
            select: { id: true, title: true, summary: true },
          },
        },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  const vehiclePackages = await prisma.vehiclePackage.findMany({
    where: {
      vehicleId,
      package: {
        isActive: true,
        isGlobal: false,
      },
    },
    include: {
      package: {
        include: {
          policies: {
            include: {
              policy: {
                select: { id: true, title: true, summary: true },
              },
            },
          },
        },
      },
    },
  });

  const allPackages = [
    ...globalPackages.map((pkg) => ({
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
      policies: pkg.policies.map((pp) => pp.policy),
    })),
    ...vehiclePackages.map((vp) => ({
      id: vp.package.id,
      name: vp.package.name,
      description: vp.package.description,
      type: vp.package.type,
      basePrice: vp.customPrice ? Number(vp.customPrice) : vp.package.basePrice ? Number(vp.package.basePrice) : null,
      pricePerDay: vp.package.pricePerDay ? Number(vp.package.pricePerDay) : null,
      pricePerHour: vp.package.pricePerHour ? Number(vp.package.pricePerHour) : null,
      discount: vp.package.discount ? Number(vp.package.discount) : null,
      minDuration: vp.package.minDuration,
      maxDuration: vp.package.maxDuration,
      icon: vp.package.icon,
      policies: vp.package.policies.map((pp) => pp.policy),
    })),
  ];

  return allPackages;
}

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [vehicle, packages] = await Promise.all([
    getVehicle(id),
    getAvailablePackages(id),
  ]);

  if (!vehicle) {
    notFound();
  }

  // Safely parse images
  let images: string[] = [];
  try {
    const parsed = JSON.parse(vehicle.images || "[]");
    images = Array.isArray(parsed) ? parsed : [];
  } catch {
    if (vehicle.images && vehicle.images.startsWith("http")) {
      images = vehicle.images.split(",").map((url) => url.trim()).filter(Boolean);
    }
  }

  const policies = vehicle.policies
    .map((vp) => vp.policy)
    .filter((p) => p.isActive);

  const policiesByCategory = policies.reduce((acc, policy) => {
    if (!acc[policy.category]) {
      acc[policy.category] = [];
    }
    acc[policy.category].push(policy);
    return acc;
  }, {} as Record<string, typeof policies>);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link href="/" className="text-slate-500 hover:text-blue-600 transition">
            Home
          </Link>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <Link href="/vehicles" className="text-slate-500 hover:text-blue-600 transition">
            Vehicles
          </Link>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-slate-900 font-medium">{vehicle.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Vehicle Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
              <div className="relative h-[400px] md:h-[500px] bg-slate-100">
                {images.length > 0 ? (
                  <Image
                    src={images[0]}
                    alt={vehicle.name}
                    fill
                    className="object-cover"
                    priority
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <svg
                        className="w-24 h-24 text-slate-300 mx-auto"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1}
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-slate-400 mt-2">No image available</p>
                    </div>
                  </div>
                )}

                {/* Type Badge */}
                <div className={`absolute top-4 left-4 bg-gradient-to-r ${TYPE_COLORS[vehicle.type] || "from-slate-500 to-slate-600"} text-white px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg`}>
                  {vehicle.type}
                </div>

                {/* Actions */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <FavoriteButton vehicleId={vehicle.id} size="md" />
                </div>

                {/* Rating Badge */}
                {vehicle.reviews.length > 0 && (
                  <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/95 backdrop-blur px-4 py-2 rounded-xl shadow-lg">
                    <div className="flex items-center gap-1">
                      <svg className="w-5 h-5 text-yellow-500 fill-current" viewBox="0 0 20 20">
                        <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                      </svg>
                      <span className="text-lg font-bold text-slate-900">
                        {vehicle.avgRating.toFixed(1)}
                      </span>
                    </div>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">{vehicle.reviews.length} reviews</span>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="p-4 bg-slate-50 border-t border-slate-100">
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 ${
                          idx === 0 ? "border-blue-500" : "border-transparent hover:border-slate-300"
                        } transition cursor-pointer`}
                      >
                        <Image src={img} alt={`${vehicle.name} ${idx + 1}`} fill className="object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Vehicle Info Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-blue-600 font-semibold mb-1">{vehicle.brand}</p>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {vehicle.name}
                  </h1>
                  <p className="text-slate-500">
                    {vehicle.model} • {vehicle.year}
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <div className="inline-flex flex-col items-start md:items-end bg-gradient-to-r from-blue-50 to-purple-50 px-5 py-3 rounded-2xl">
                    <span className="text-sm text-slate-500">Starting from</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                        {formatCurrency(vehicle.pricePerDay)}
                      </span>
                      <span className="text-slate-500">/day</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Features Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded-xl text-center group hover:bg-blue-50 transition">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition">
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Type</p>
                  <p className="font-semibold text-slate-900">{vehicle.type}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center group hover:bg-blue-50 transition">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition">
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Transmission</p>
                  <p className="font-semibold text-slate-900">
                    {vehicle.transmission === "AUTOMATIC" ? "Auto" : "Manual"}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center group hover:bg-blue-50 transition">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition">
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Fuel Type</p>
                  <p className="font-semibold text-slate-900">
                    {vehicle.fuelType.charAt(0) + vehicle.fuelType.slice(1).toLowerCase()}
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl text-center group hover:bg-blue-50 transition">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-white shadow-sm flex items-center justify-center group-hover:shadow-md transition">
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-500 mb-1">Seats</p>
                  <p className="font-semibold text-slate-900">{vehicle.seats} People</p>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl mb-6">
                <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Pickup Location</p>
                  <p className="font-semibold text-slate-900">{vehicle.location}</p>
                </div>
              </div>

              {/* Description */}
              {vehicle.description && (
                <div>
                  <h3 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                    </svg>
                    About This Vehicle
                  </h3>
                  <p className="text-slate-600 leading-relaxed">{vehicle.description}</p>
                </div>
              )}
            </div>

            {/* Available Packages */}
            {packages.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <svg className="w-6 h-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    Available Packages
                  </h2>
                  <Link
                    href="/packages"
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 group"
                  >
                    View all
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {packages.map((pkg) => (
                    <Link
                      key={pkg.id}
                      href={`/packages/${pkg.id}`}
                      className="group block p-4 bg-slate-50 rounded-xl hover:bg-gradient-to-br hover:from-blue-50 hover:to-purple-50 border-2 border-transparent hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className={`inline-block px-2.5 py-1 text-xs font-semibold rounded-full mb-2 ${PACKAGE_TYPE_COLORS[pkg.type] || "bg-slate-100 text-slate-700"}`}>
                            {PACKAGE_TYPE_LABELS[pkg.type] || pkg.type}
                          </span>
                          <h3 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {pkg.name}
                          </h3>
                        </div>
                        {pkg.discount && pkg.discount > 0 && (
                          <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2.5 py-1 text-xs font-bold rounded-full shadow-sm">
                            {pkg.discount}% OFF
                          </span>
                        )}
                      </div>
                      {pkg.description && (
                        <p className="text-sm text-slate-500 mb-3 line-clamp-2">{pkg.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div>
                          {pkg.basePrice ? (
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                              {formatCurrency(pkg.basePrice)}
                            </span>
                          ) : pkg.pricePerDay ? (
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                              {formatCurrency(pkg.pricePerDay)}<span className="text-sm font-normal text-slate-500">/day</span>
                            </span>
                          ) : pkg.pricePerHour ? (
                            <span className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                              {formatCurrency(pkg.pricePerHour)}<span className="text-sm font-normal text-slate-500">/hour</span>
                            </span>
                          ) : (
                            <span className="text-sm text-slate-500">Custom pricing</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-slate-400 group-hover:text-blue-500 transition-colors">
                          <span className="text-sm font-medium">Details</span>
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Rental Policies */}
            {policies.length > 0 && (
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
                <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Rental Policies
                </h2>
                <div className="space-y-6">
                  {Object.entries(policiesByCategory).map(([category, categoryPolicies]) => (
                    <div key={category}>
                      <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <span className="text-lg">{POLICY_CATEGORY_ICONS[category] || "📄"}</span>
                        {category.charAt(0).toUpperCase() + category.slice(1)} Policies
                      </h3>
                      <div className="space-y-2">
                        {categoryPolicies.map((policy) => (
                          <details
                            key={policy.id}
                            className="group bg-slate-50 rounded-xl overflow-hidden"
                          >
                            <summary className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-100 transition">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-slate-900">
                                  {policy.title}
                                </span>
                                {policy.isRequired && (
                                  <span className="inline-flex px-2.5 py-1 text-xs bg-red-100 text-red-700 rounded-full font-semibold">
                                    Required
                                  </span>
                                )}
                              </div>
                              <svg
                                className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </summary>
                            <div className="px-4 pb-4">
                              {policy.summary && (
                                <p className="text-sm text-slate-600 mb-3 font-medium bg-white p-3 rounded-lg">
                                  {policy.summary}
                                </p>
                              )}
                              <div
                                className="prose prose-sm max-w-none text-slate-600"
                                dangerouslySetInnerHTML={{ __html: policy.content }}
                              />
                            </div>
                          </details>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <svg className="w-6 h-6 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                  Reviews
                </h2>
                {vehicle.reviews.length > 0 && (
                  <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
                    <span className="font-bold text-slate-900">{vehicle.avgRating.toFixed(1)}</span>
                    <span className="text-slate-500">({vehicle.reviews.length})</span>
                  </div>
                )}
              </div>

              {vehicle.reviews.length > 0 ? (
                <div className="space-y-4">
                  {vehicle.reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-slate-50 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                          {review.user.name?.charAt(0) || "A"}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-slate-900">
                              {review.user.name || "Anonymous"}
                            </span>
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <svg
                                  key={i}
                                  className={`w-4 h-4 ${i < review.rating ? "text-yellow-500" : "text-slate-300"}`}
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                                </svg>
                              ))}
                            </div>
                          </div>
                          {review.comment && (
                            <p className="text-slate-600">{review.comment}</p>
                          )}
                          <p className="text-sm text-slate-400 mt-2">
                            {new Date(review.createdAt).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-slate-500">No reviews yet. Be the first to review!</p>
                </div>
              )}
            </div>
          </div>

          {/* Booking Form Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-4">
              <BookingForm
                vehicleId={vehicle.id}
                pricePerDay={vehicle.pricePerDay}
                vehicleName={vehicle.name}
                location={vehicle.location}
              />

              {/* Quick Add to Cart */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <p className="text-sm text-slate-500 mb-3">Want to compare or book later?</p>
                <AddToCartButton
                  vehicleId={vehicle.id}
                  vehicleName={vehicle.name}
                  location={vehicle.location}
                  variant="full"
                  className="w-full justify-center"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
