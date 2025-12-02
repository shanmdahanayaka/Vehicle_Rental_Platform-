import Link from "next/link";

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
  vehicleCount?: number;
}

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

const packageColors: Record<string, { bg: string; text: string; gradient: string }> = {
  DAILY: { bg: "bg-blue-100", text: "text-blue-700", gradient: "from-blue-500 to-blue-600" },
  WEEKLY: { bg: "bg-green-100", text: "text-green-700", gradient: "from-green-500 to-green-600" },
  MONTHLY: { bg: "bg-purple-100", text: "text-purple-700", gradient: "from-purple-500 to-purple-600" },
  AIRPORT_PICKUP: { bg: "bg-orange-100", text: "text-orange-700", gradient: "from-orange-500 to-orange-600" },
  AIRPORT_DROP: { bg: "bg-amber-100", text: "text-amber-700", gradient: "from-amber-500 to-amber-600" },
  AIRPORT_ROUND: { bg: "bg-red-100", text: "text-red-700", gradient: "from-red-500 to-red-600" },
  HOURLY: { bg: "bg-cyan-100", text: "text-cyan-700", gradient: "from-cyan-500 to-cyan-600" },
  CUSTOM: { bg: "bg-slate-100", text: "text-slate-700", gradient: "from-slate-500 to-slate-600" },
};

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
  vehicleCount = 0,
}: PackageCardProps) {
  const colors = packageColors[type] || packageColors.CUSTOM;
  const iconPath = packageIcons[type] || packageIcons.CUSTOM;

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
      {/* Header with gradient */}
      <div className={`relative h-32 bg-gradient-to-br ${colors.gradient} p-5 flex flex-col justify-between`}>
        {/* Icon */}
        <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
          </svg>
        </div>

        {/* Type Badge */}
        <span className="absolute top-4 right-4 bg-white/20 backdrop-blur text-white px-3 py-1 rounded-full text-xs font-semibold">
          {typeLabels[type] || type}
        </span>

        {/* Discount Badge */}
        {discount && discount > 0 && (
          <div className="absolute bottom-4 right-4 bg-white text-green-600 px-2 py-1 rounded-lg text-sm font-bold shadow-sm">
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
                  Rs.{priceDisplay.price.toLocaleString()}
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
