import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/config/site";

interface PackageCardProps {
  id: string;
  name: string;
  description: string | null;
  type: string;
  basePrice: number | null;
  pricePerDay: number | null;
  pricePerHour: number | null;
  discount: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  icon: string | null;
  images?: string | null;
  videoUrl?: string | null;
  vehicleCount?: number;
}

// Helper to extract YouTube video ID
function getYouTubeVideoId(url: string | null) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
  return match ? match[1] : null;
}

// Parse images from JSON string
function parseImages(images: string | null | undefined): string[] {
  if (!images) return [];
  try {
    return JSON.parse(images);
  } catch {
    return [];
  }
}

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

const packageColors: Record<string, { bg: string; text: string; gradient: string }> = {
  WEDDING: { bg: "bg-pink-100", text: "text-pink-700", gradient: "from-pink-500 to-rose-500" },
  AIRPORT: { bg: "bg-blue-100", text: "text-blue-700", gradient: "from-blue-500 to-blue-600" },
  TOURISM: { bg: "bg-green-100", text: "text-green-700", gradient: "from-green-500 to-emerald-600" },
  CORPORATE: { bg: "bg-slate-100", text: "text-slate-700", gradient: "from-slate-500 to-slate-600" },
  SELF_DRIVE: { bg: "bg-cyan-100", text: "text-cyan-700", gradient: "from-cyan-500 to-cyan-600" },
  WITH_DRIVER: { bg: "bg-purple-100", text: "text-purple-700", gradient: "from-purple-500 to-purple-600" },
  LONG_TERM: { bg: "bg-indigo-100", text: "text-indigo-700", gradient: "from-indigo-500 to-indigo-600" },
  EVENT: { bg: "bg-orange-100", text: "text-orange-700", gradient: "from-orange-500 to-orange-600" },
  HONEYMOON: { bg: "bg-rose-100", text: "text-rose-700", gradient: "from-rose-500 to-pink-600" },
  PILGRIMAGE: { bg: "bg-amber-100", text: "text-amber-700", gradient: "from-amber-500 to-amber-600" },
  ADVENTURE: { bg: "bg-emerald-100", text: "text-emerald-700", gradient: "from-emerald-500 to-teal-600" },
  CUSTOM: { bg: "bg-gray-100", text: "text-gray-700", gradient: "from-gray-500 to-gray-600" },
};

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

export default function PackageCard({
  id,
  name,
  description,
  type,
  basePrice,
  pricePerDay,
  pricePerHour,
  discount,
  minDuration,
  maxDuration,
  images,
  videoUrl,
  vehicleCount = 0,
}: PackageCardProps) {
  const colors = packageColors[type] || packageColors.CUSTOM;
  const iconPath = packageIcons[type] || packageIcons.CUSTOM;

  // Parse images and get video ID
  const packageImages = parseImages(images);
  const videoId = getYouTubeVideoId(videoUrl || null);

  // Get thumbnail - prefer video thumbnail, then first image
  const thumbnailImage = videoId
    ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
    : packageImages[0] || null;

  const hasMedia = thumbnailImage !== null;

  // Determine pricing display
  const getPriceDisplay = () => {
    if (basePrice) {
      return { price: basePrice, suffix: "" };
    }
    if (pricePerDay) {
      return { price: pricePerDay, suffix: "/day" };
    }
    if (pricePerHour) {
      return { price: pricePerHour, suffix: "/hour" };
    }
    return null;
  };

  const priceDisplay = getPriceDisplay();

  // Duration display
  const getDurationText = () => {
    if (minDuration && maxDuration) {
      return `${minDuration} - ${maxDuration} ${type === "HOURLY" ? "hours" : "days"}`;
    }
    if (minDuration) {
      return `Min ${minDuration} ${type === "HOURLY" ? "hours" : "days"}`;
    }
    if (maxDuration) {
      return `Max ${maxDuration} ${type === "HOURLY" ? "hours" : "days"}`;
    }
    return null;
  };

  const durationText = getDurationText();

  return (
    <div className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col">
      {/* Header with image or gradient */}
      <div className={`relative h-44 ${!hasMedia ? `bg-gradient-to-br ${colors.gradient}` : 'bg-slate-100'} overflow-hidden`}>
        {hasMedia ? (
          <>
            <Image
              src={thumbnailImage}
              alt={name}
              fill
              className="object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {/* Video play indicator */}
            {videoId && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-purple-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              </div>
            )}
            {/* Image count badge */}
            {packageImages.length > 1 && !videoId && (
              <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {packageImages.length}
              </div>
            )}
            {/* Gradient overlay for text readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            {/* Icon */}
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
              </svg>
            </div>
          </div>
        )}

        {/* Type Badge */}
        <span className="absolute top-3 left-3 bg-white/95 backdrop-blur text-slate-800 px-3 py-1 rounded-full text-xs font-semibold shadow-sm">
          {typeLabels[type] || type}
        </span>

        {/* Discount Badge */}
        {discount && discount > 0 && (
          <div className="absolute top-3 right-3 bg-gradient-to-r from-red-500 to-pink-500 text-white px-2.5 py-1 rounded-full text-xs font-bold shadow-sm">
            {discount}% OFF
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col">
        {/* Name */}
        <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
          {name}
        </h3>

        {/* Description */}
        {description && (
          <p className="text-slate-600 text-sm mb-4 line-clamp-2">{description}</p>
        )}

        {/* Features */}
        <div className="flex flex-wrap gap-2 mb-4">
          {durationText && (
            <span className={`inline-flex items-center gap-1.5 text-xs ${colors.bg} ${colors.text} px-2.5 py-1.5 rounded-lg`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {durationText}
            </span>
          )}
          {vehicleCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-2.5 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
              </svg>
              {vehicleCount} vehicles
            </span>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price & CTA */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <div>
            {priceDisplay ? (
              <>
                <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  {formatCurrency(priceDisplay.price)}
                </span>
                {priceDisplay.suffix && (
                  <span className="text-slate-500 text-sm">{priceDisplay.suffix}</span>
                )}
              </>
            ) : (
              <span className="text-lg font-semibold text-slate-500">Custom pricing</span>
            )}
          </div>
          <Link
            href={`/packages/${id}`}
            className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2.5 rounded-xl font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-sm hover:shadow-md"
          >
            View Details
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
