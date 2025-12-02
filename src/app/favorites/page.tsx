"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/config/site";

interface Vehicle {
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
  location: string;
  available: boolean;
  avgRating: number;
  reviewCount: number;
}

interface Favorite {
  id: string;
  createdAt: string;
  vehicle: Vehicle;
}

export default function FavoritesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/favorites");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchFavorites();
    }
  }, [status]);

  const fetchFavorites = async () => {
    try {
      const res = await fetch("/api/favorites");
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (error) {
      console.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (vehicleId: string) => {
    setRemoving(vehicleId);
    try {
      const res = await fetch(`/api/favorites?vehicleId=${vehicleId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setFavorites((prev) => prev.filter((f) => f.vehicle.id !== vehicleId));
      }
    } catch (error) {
      console.error("Error removing favorite:", error);
    } finally {
      setRemoving(null);
    }
  };

  const parseImages = (images: string): string[] => {
    try {
      const parsed = JSON.parse(images || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      if (images && images.startsWith("http")) {
        return images.split(",").map((url) => url.trim()).filter(Boolean);
      }
      return [];
    }
  };

  const typeColors: Record<string, string> = {
    CAR: "bg-blue-500",
    SUV: "bg-green-500",
    VAN: "bg-orange-500",
    LUXURY: "bg-purple-500",
    MOTORCYCLE: "bg-red-500",
    TRUCK: "bg-slate-500",
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">My Favorites</h1>
          </div>
          <p className="text-slate-600">
            Vehicles you&apos;ve saved for later. {favorites.length} saved{" "}
            {favorites.length === 1 ? "vehicle" : "vehicles"}.
          </p>
        </div>

        {/* Favorites Grid */}
        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              No favorites yet
            </h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start exploring our vehicles and save the ones you like by clicking
              the heart icon.
            </p>
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              Browse Vehicles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((favorite) => {
              const vehicle = favorite.vehicle;
              const images = parseImages(vehicle.images);
              const mainImage = images[0] || "/placeholder-car.jpg";

              return (
                <div
                  key={favorite.id}
                  className="bg-white rounded-2xl shadow-sm overflow-hidden border border-slate-100 group hover:shadow-lg transition-all duration-300"
                >
                  {/* Image */}
                  <div className="relative h-48 bg-slate-100 overflow-hidden">
                    {images.length > 0 ? (
                      <Image
                        src={mainImage}
                        alt={vehicle.name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg
                          className="w-16 h-16 text-slate-300"
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

                    {/* Type Badge */}
                    <div
                      className={`absolute top-3 left-3 ${
                        typeColors[vehicle.type] || "bg-slate-500"
                      } text-white px-3 py-1 rounded-full text-xs font-semibold uppercase`}
                    >
                      {vehicle.type}
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeFavorite(vehicle.id)}
                      disabled={removing === vehicle.id}
                      className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition shadow-sm disabled:opacity-50"
                      title="Remove from favorites"
                    >
                      {removing === vehicle.id ? (
                        <div className="w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      )}
                    </button>

                    {/* Availability Badge */}
                    {!vehicle.available && (
                      <div className="absolute bottom-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-medium">
                        Not Available
                      </div>
                    )}

                    {/* Rating Badge */}
                    {vehicle.reviewCount > 0 && (
                      <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-white/90 backdrop-blur px-2 py-1 rounded-lg shadow-sm">
                        <svg
                          className="w-4 h-4 text-yellow-500 fill-current"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                        </svg>
                        <span className="text-sm font-semibold text-slate-700">
                          {vehicle.avgRating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <p className="text-sm text-blue-600 font-medium">
                      {vehicle.brand}
                    </p>
                    <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">
                      {vehicle.name}
                    </h3>

                    {/* Location */}
                    <div className="flex items-center gap-1 text-slate-500 text-sm mb-3">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <span>{vehicle.location}</span>
                    </div>

                    {/* Features */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {vehicle.transmission === "AUTOMATIC" ? "Auto" : "Manual"}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {vehicle.fuelType.charAt(0) +
                          vehicle.fuelType.slice(1).toLowerCase()}
                      </span>
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {vehicle.seats} Seats
                      </span>
                    </div>

                    {/* Price & CTA */}
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div>
                        <span className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                          {formatCurrency(vehicle.pricePerDay)}
                        </span>
                        <span className="text-slate-500 text-sm">/day</span>
                      </div>
                      <Link
                        href={`/vehicles/${vehicle.id}`}
                        className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium text-sm hover:from-blue-700 hover:to-purple-700 transition"
                      >
                        View
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </Link>
                    </div>

                    {/* Saved Date */}
                    <p className="text-xs text-slate-400 mt-3">
                      Saved on{" "}
                      {new Date(favorite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
