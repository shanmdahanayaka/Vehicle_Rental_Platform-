import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/config/site";
import PackageBookingForm from "@/components/PackageBookingForm";
import PackageMediaGallery from "@/components/PackageMediaGallery";

// Helper to extract YouTube video ID
function getYouTubeVideoId(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match ? match[1] : null;
}

// Parse images from JSON string
function parseImages(images: string | null): string[] {
  if (!images) return [];
  try {
    return JSON.parse(images);
  } catch {
    return [];
  }
}

const typeLabels: Record<string, string> = {
  WEDDING: "Wedding",
  AIRPORT: "Airport Transfer",
  TOURISM: "Tourism",
  CORPORATE: "Corporate",
  SELF_DRIVE: "Self Drive",
  WITH_DRIVER: "With Driver",
  LONG_TERM: "Long Term",
  EVENT: "Event",
  HONEYMOON: "Honeymoon",
  PILGRIMAGE: "Pilgrimage",
  ADVENTURE: "Adventure",
  CUSTOM: "Custom",
};

const packageIcons: Record<string, string> = {
  WEDDING: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  AIRPORT: "M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2",
  TOURISM: "M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  CORPORATE: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
  SELF_DRIVE: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z",
  WITH_DRIVER: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
  LONG_TERM: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  EVENT: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  HONEYMOON: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
  PILGRIMAGE: "M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z",
  ADVENTURE: "M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z",
  CUSTOM: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
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
      customCosts: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
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

async function getAvailableVehicles(packageId: string, isGlobal: boolean, vehiclePackages: { vehicleId: string; customPrice: unknown; vehicle: { id: string; name: string; brand: string; model: string; year: number; pricePerDay: unknown; images: string; transmission: string; fuelType: string; seats: number; available: boolean } }[]) {
  if (isGlobal) {
    // For global packages, get all available vehicles
    const vehicles = await prisma.vehicle.findMany({
      where: { available: true },
      orderBy: { name: "asc" },
    });

    return vehicles.map((v) => ({
      id: v.id,
      name: v.name,
      brand: v.brand,
      model: v.model,
      year: v.year,
      pricePerDay: Number(v.pricePerDay),
      packagePrice: null,
      images: parseImages(v.images),
      transmission: v.transmission,
      fuelType: v.fuelType,
      seats: v.seats,
      available: true,
    }));
  }

  // For non-global packages, get linked vehicles with their custom prices
  return vehiclePackages
    .filter((vp) => vp.vehicle.available === true)
    .map((vp) => ({
      id: vp.vehicle.id,
      name: vp.vehicle.name,
      brand: vp.vehicle.brand,
      model: vp.vehicle.model,
      year: vp.vehicle.year,
      pricePerDay: Number(vp.vehicle.pricePerDay),
      packagePrice: vp.customPrice ? Number(vp.customPrice) : null,
      images: parseImages(vp.vehicle.images),
      transmission: vp.vehicle.transmission,
      fuelType: vp.vehicle.fuelType,
      seats: vp.vehicle.seats,
      available: true,
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

  const vehicles = await getAvailableVehicles(id, pkg.isGlobal, pkg.vehiclePackages as unknown as { vehicleId: string; customPrice: unknown; vehicle: { id: string; name: string; brand: string; model: string; year: number; pricePerDay: unknown; images: string; transmission: string; fuelType: string; seats: number; available: boolean } }[]);
  const iconPath = packageIcons[pkg.type] || packageIcons.CUSTOM;

  // Parse media
  const packageImages = parseImages(pkg.images);
  const videoId = getYouTubeVideoId(pkg.videoUrl);
  const hasMedia = packageImages.length > 0 || videoId;

  // Required custom costs total
  const requiredCostsTotal = pkg.customCosts
    .filter((c) => !c.isOptional)
    .reduce((sum, c) => sum + Number(c.price), 0);

  // Format custom costs for the form
  const formattedCustomCosts = pkg.customCosts.map((cost) => ({
    id: cost.id,
    name: cost.name,
    description: cost.description,
    price: Number(cost.price),
    isOptional: cost.isOptional,
  }));

  // Pricing display
  const getPriceInfo = () => {
    if (pkg.basePrice) {
      return { price: Number(pkg.basePrice), suffix: "package base", type: "base" };
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
      <section className="relative py-12 bg-gradient-to-br from-purple-900 via-purple-800 to-blue-900 overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-purple-500/30 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-purple-200 mb-6">
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

          {/* Type Badge & Title */}
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
              </svg>
            </div>
            <span className="bg-white/20 backdrop-blur text-white px-4 py-2 rounded-full text-sm font-semibold">
              {typeLabels[pkg.type] || pkg.type}
            </span>
            {pkg.discount && Number(pkg.discount) > 0 && (
              <span className="bg-gradient-to-r from-green-400 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold">
                {Number(pkg.discount)}% OFF
              </span>
            )}
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{pkg.name}</h1>

          {pkg.description && (
            <p className="text-lg text-purple-200 mb-6 max-w-3xl">{pkg.description}</p>
          )}

          {/* Key Features */}
          <div className="flex flex-wrap gap-3 mb-8">
            {pkg.minDuration && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white text-sm">
                  Min: {pkg.minDuration} {pkg.pricePerHour ? "hours" : "days"}
                </span>
              </div>
            )}
            {pkg.maxDuration && (
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">
                <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white text-sm">
                  Max: {pkg.maxDuration} {pkg.pricePerHour ? "hours" : "days"}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur px-3 py-1.5 rounded-lg">
              <svg className="w-4 h-4 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              <span className="text-white text-sm">{vehicles.length} vehicles available</span>
            </div>
          </div>
        </div>
      </section>

      {/* Media Gallery & Pricing Section */}
      <section className="py-8 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 -mt-16 relative z-20">
            {/* Media Gallery */}
            {hasMedia ? (
              <PackageMediaGallery
                images={packageImages}
                videoId={videoId}
                packageName={pkg.name}
              />
            ) : (
              <div className="bg-gradient-to-br from-purple-100 to-blue-100 rounded-3xl overflow-hidden shadow-lg aspect-video flex items-center justify-center">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                    <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={iconPath} />
                    </svg>
                  </div>
                  <p className="text-slate-600 font-medium">{pkg.name}</p>
                </div>
              </div>
            )}

            {/* Pricing Card */}
            <div className="bg-white rounded-3xl p-8 shadow-2xl h-fit">
              <h3 className="text-lg font-semibold text-slate-600 mb-4">Package Pricing</h3>

              {/* Base Price */}
              {priceInfo && (
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                      {formatCurrency(priceInfo.price)}
                    </span>
                    <span className="text-slate-500">{priceInfo.suffix}</span>
                  </div>
                </div>
              )}

              {/* Custom Costs Summary */}
              {pkg.customCosts.length > 0 && (
                <div className="border-t border-slate-200 pt-4 mb-6">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Included Services</h4>
                  <div className="space-y-2">
                    {pkg.customCosts.filter((c) => !c.isOptional).map((cost) => (
                      <div key={cost.id} className="flex justify-between text-sm">
                        <span className="text-slate-600">{cost.name}</span>
                        <span className="font-medium text-slate-900">{formatCurrency(Number(cost.price))}</span>
                      </div>
                    ))}
                    {requiredCostsTotal > 0 && (
                      <div className="flex justify-between text-sm pt-2 border-t border-slate-100">
                        <span className="font-medium text-slate-700">Services Subtotal</span>
                        <span className="font-semibold text-purple-600">{formatCurrency(requiredCostsTotal)}</span>
                      </div>
                    )}
                  </div>

                  {pkg.customCosts.some((c) => c.isOptional) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Optional Add-ons</h4>
                      <div className="space-y-1">
                        {pkg.customCosts.filter((c) => c.isOptional).map((cost) => (
                          <div key={cost.id} className="flex justify-between text-sm">
                            <span className="text-slate-500">{cost.name}</span>
                            <span className="text-slate-600">+{formatCurrency(Number(cost.price))}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>+ Vehicle rental per day</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>24/7 roadside assistance</span>
                </div>
                <div className="flex items-center gap-3 text-slate-600">
                  <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Insurance included</span>
                </div>
              </div>

              <Link
                href="#book"
                className="block w-full text-center bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                Book This Package
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

      {/* Booking Form Section */}
      <section id="book" className="py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-900">Book {pkg.name}</h2>
            <p className="text-slate-600 mt-2">
              Select your dates, choose a vehicle, and customize your package
            </p>
          </div>

          <PackageBookingForm
            packageId={pkg.id}
            packageName={pkg.name}
            packageType={pkg.type}
            basePrice={pkg.basePrice ? Number(pkg.basePrice) : null}
            pricePerDay={pkg.pricePerDay ? Number(pkg.pricePerDay) : null}
            minDuration={pkg.minDuration}
            maxDuration={pkg.maxDuration}
            customCosts={formattedCustomCosts}
            vehicles={vehicles}
            isGlobal={pkg.isGlobal}
          />
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 bg-gradient-to-r from-purple-600 to-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Need Help?</h2>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            Our team is available to help you customize your package or answer any questions.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center justify-center gap-2 bg-white text-purple-600 px-8 py-4 rounded-xl font-semibold hover:bg-slate-100 transition-colors"
          >
            Contact Us
          </Link>
        </div>
      </section>
    </div>
  );
}
