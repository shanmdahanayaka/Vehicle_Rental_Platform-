import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import BookingForm from "./BookingForm";

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

export default async function VehicleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vehicle = await getVehicle(id);

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
