import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import BookingForm from "./BookingForm";

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

async function getVehicle(id: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id },
    include: {
      reviews: {
        include: {
          user: {
            select: { name: true },
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
  // Get global packages
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

  // Get vehicle-specific packages
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

  // Combine and transform
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

  // Safely parse images - handle both JSON array and plain URL
  let images: string[] = [];
  try {
    const parsed = JSON.parse(vehicle.images || "[]");
    images = Array.isArray(parsed) ? parsed : [];
  } catch {
    // If not valid JSON, treat as single URL or comma-separated URLs
    if (vehicle.images && vehicle.images.startsWith("http")) {
      images = vehicle.images.split(",").map((url) => url.trim()).filter(Boolean);
    }
  }

  // Get active policies for this vehicle
  const policies = vehicle.policies
    .map((vp) => vp.policy)
    .filter((p) => p.isActive);

  // Group policies by category
  const policiesByCategory = policies.reduce((acc, policy) => {
    if (!acc[policy.category]) {
      acc[policy.category] = [];
    }
    acc[policy.category].push(policy);
    return acc;
  }, {} as Record<string, typeof policies>);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vehicle Details */}
        <div className="lg:col-span-2">
          {/* Image Gallery */}
          <div className="bg-white rounded-xl overflow-hidden shadow-md mb-6">
            <div className="relative h-96 bg-gray-200">
              {images.length > 0 ? (
                <Image
                  src={images[0]}
                  alt={vehicle.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  <svg
                    className="w-32 h-32"
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
                </div>
              )}
            </div>
          </div>

          {/* Vehicle Info */}
          <div className="bg-white rounded-xl p-6 shadow-md mb-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {vehicle.name}
                </h1>
                <p className="text-gray-500">
                  {vehicle.brand} {vehicle.model} - {vehicle.year}
                </p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-bold text-blue-600">
                  ${vehicle.pricePerDay}
                </span>
                <span className="text-gray-500">/day</span>
              </div>
            </div>

            {vehicle.reviews.length > 0 && (
              <div className="flex items-center mb-4">
                <span className="text-yellow-500 text-xl">★</span>
                <span className="ml-1 text-lg font-semibold">
                  {vehicle.avgRating.toFixed(1)}
                </span>
                <span className="text-gray-400 ml-2">
                  ({vehicle.reviews.length} reviews)
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500 text-sm">Type</p>
                <p className="font-semibold">{vehicle.type}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500 text-sm">Transmission</p>
                <p className="font-semibold">{vehicle.transmission}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500 text-sm">Fuel Type</p>
                <p className="font-semibold">{vehicle.fuelType}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-gray-500 text-sm">Seats</p>
                <p className="font-semibold">{vehicle.seats}</p>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Location</h3>
              <p className="text-gray-600">{vehicle.location}</p>
            </div>

            {vehicle.description && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Description</h3>
                <p className="text-gray-600">{vehicle.description}</p>
              </div>
            )}
          </div>

          {/* Available Packages */}
          {packages.length > 0 && (
            <div className="bg-white rounded-xl p-6 shadow-md mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Available Packages</h2>
                <Link
                  href="/packages"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                >
                  View all packages
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {packages.map((pkg) => (
                  <Link
                    key={pkg.id}
                    href={`/packages/${pkg.id}`}
                    className="group block p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded-full mb-2 ${PACKAGE_TYPE_COLORS[pkg.type] || "bg-gray-100 text-gray-700"}`}>
                          {PACKAGE_TYPE_LABELS[pkg.type] || pkg.type}
                        </span>
                        <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {pkg.name}
                        </h3>
                      </div>
                      {pkg.discount && pkg.discount > 0 && (
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 text-xs font-bold rounded-full">
                          {pkg.discount}% OFF
                        </span>
                      )}
                    </div>
                    {pkg.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{pkg.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        {pkg.basePrice ? (
                          <span className="text-lg font-bold text-blue-600">
                            Rs.{pkg.basePrice.toLocaleString()}
                          </span>
                        ) : pkg.pricePerDay ? (
                          <span className="text-lg font-bold text-blue-600">
                            Rs.{pkg.pricePerDay.toLocaleString()}<span className="text-sm font-normal text-gray-500">/day</span>
                          </span>
                        ) : pkg.pricePerHour ? (
                          <span className="text-lg font-bold text-blue-600">
                            Rs.{pkg.pricePerHour.toLocaleString()}<span className="text-sm font-normal text-gray-500">/hour</span>
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Custom pricing</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 group-hover:text-blue-500 transition-colors">
                        <span className="text-sm">Details</span>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <div className="bg-white rounded-xl p-6 shadow-md mb-6">
              <h2 className="text-xl font-bold mb-4">Rental Policies</h2>
              <div className="space-y-4">
                {Object.entries(policiesByCategory).map(([category, categoryPolicies]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <span>{POLICY_CATEGORY_ICONS[category] || "📄"}</span>
                      {category.charAt(0).toUpperCase() + category.slice(1)} Policies
                    </h3>
                    <div className="space-y-2">
                      {categoryPolicies.map((policy) => (
                        <details
                          key={policy.id}
                          className="group border border-gray-200 rounded-lg overflow-hidden"
                        >
                          <summary className="flex items-center justify-between p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900">
                                {policy.title}
                              </span>
                              {policy.isRequired && (
                                <span className="inline-flex px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                  Required
                                </span>
                              )}
                            </div>
                            <svg
                              className="w-5 h-5 text-gray-400 group-open:rotate-180 transition-transform"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </summary>
                          <div className="p-4 border-t border-gray-200">
                            {policy.summary && (
                              <p className="text-sm text-gray-600 mb-3 font-medium">
                                {policy.summary}
                              </p>
                            )}
                            <div
                              className="prose prose-sm max-w-none text-gray-600"
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
          <div className="bg-white rounded-xl p-6 shadow-md">
            <h2 className="text-xl font-bold mb-4">
              Reviews ({vehicle.reviews.length})
            </h2>
            {vehicle.reviews.length > 0 ? (
              <div className="space-y-4">
                {vehicle.reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border-b border-gray-100 pb-4 last:border-0"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {review.user.name || "Anonymous"}
                      </span>
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={
                              i < review.rating
                                ? "text-yellow-500"
                                : "text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                      </div>
                    </div>
                    {review.comment && (
                      <p className="text-gray-600">{review.comment}</p>
                    )}
                    <p className="text-sm text-gray-400 mt-2">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No reviews yet.</p>
            )}
          </div>
        </div>

        {/* Booking Form */}
        <div className="lg:col-span-1">
          <BookingForm
            vehicleId={vehicle.id}
            pricePerDay={vehicle.pricePerDay}
            vehicleName={vehicle.name}
            location={vehicle.location}
          />
        </div>
      </div>
    </div>
  );
}
