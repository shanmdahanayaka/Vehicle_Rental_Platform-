import Link from "next/link";
import Image from "next/image";

interface VehicleCardProps {
  id: string;
  name: string;
  brand: string;
  model: string;
  year: number;
  type: string;
  transmission: string;
  fuelType: string;
  seats: number;
  pricePerDay: number;
  images: string;
  avgRating?: number;
  reviewCount?: number;
}

export default function VehicleCard({
  id,
  name,
  brand,
  type,
  transmission,
  fuelType,
  seats,
  pricePerDay,
  images,
  avgRating = 0,
  reviewCount = 0,
}: VehicleCardProps) {
  // Safely parse images - handle both JSON array and plain URL
  let imageList: string[] = [];
  try {
    const parsed = JSON.parse(images || "[]");
    imageList = Array.isArray(parsed) ? parsed : [];
  } catch {
    // If not valid JSON, treat as single URL or comma-separated URLs
    if (images && images.startsWith("http")) {
      imageList = images.split(",").map((url) => url.trim()).filter(Boolean);
    }
  }
  const mainImage = imageList[0] || "/placeholder-car.jpg";

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
      <div className="relative h-48 bg-gray-200">
        {imageList.length > 0 ? (
          <Image
            src={mainImage}
            alt={name}
            fill
            className="object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <svg
              className="w-20 h-20"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M8 7h8m-8 5h8m-8 5h8M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z"
              />
            </svg>
          </div>
        )}
        <div className="absolute top-2 right-2 bg-blue-600 text-white px-2 py-1 rounded-full text-sm">
          {type}
        </div>
      </div>
      <div className="p-4">
        <h3 className="text-xl font-semibold text-gray-800">{name}</h3>
        <p className="text-gray-500 text-sm">{brand}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            {transmission}
          </span>
          <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {fuelType}
          </span>
          <span className="inline-flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {seats} seats
          </span>
        </div>

        {reviewCount > 0 && (
          <div className="mt-2 flex items-center text-sm">
            <span className="text-yellow-500">★</span>
            <span className="ml-1 text-gray-700">{avgRating.toFixed(1)}</span>
            <span className="text-gray-400 ml-1">({reviewCount} reviews)</span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold text-blue-600">
              ${pricePerDay}
            </span>
            <span className="text-gray-500 text-sm">/day</span>
          </div>
          <Link
            href={`/vehicles/${id}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            View Details
          </Link>
        </div>
      </div>
    </div>
  );
}
