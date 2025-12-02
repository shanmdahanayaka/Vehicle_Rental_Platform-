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
  type: string;
  transmission: string;
  fuelType: string;
  seats: number;
  pricePerDay: number;
  images: string;
  location: string;
  available: boolean;
}

interface CartItem {
  id: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation: string;
  days: number;
  totalPrice: number;
  createdAt: string;
  vehicle: Vehicle;
}

interface CartData {
  items: CartItem[];
  itemCount: number;
  cartTotal: number;
}

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/cart");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchCart();
    }
  }, [status]);

  const fetchCart = async () => {
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCart(data);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeItem = async (itemId: string) => {
    setRemoving(itemId);
    try {
      const res = await fetch(`/api/cart?itemId=${itemId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchCart();
      }
    } catch (error) {
      console.error("Error removing item:", error);
    } finally {
      setRemoving(null);
    }
  };

  const handleCheckout = async () => {
    if (!cart || cart.items.length === 0) return;

    setCheckingOut(true);

    // Create bookings for each cart item
    try {
      for (const item of cart.items) {
        const res = await fetch("/api/bookings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vehicleId: item.vehicle.id,
            startDate: item.startDate,
            endDate: item.endDate,
            pickupLocation: item.pickupLocation,
            dropoffLocation: item.dropoffLocation,
          }),
        });

        if (res.ok) {
          // Remove item from cart after successful booking
          await fetch(`/api/cart?itemId=${item.id}`, { method: "DELETE" });
        }
      }

      // Redirect to bookings page
      router.push("/bookings");
    } catch (error) {
      console.error("Error during checkout:", error);
    } finally {
      setCheckingOut(false);
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">My Cart</h1>
          </div>
          <p className="text-slate-600">
            {cart?.itemCount || 0} {cart?.itemCount === 1 ? "vehicle" : "vehicles"} in your cart
          </p>
        </div>

        {!cart || cart.items.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Your cart is empty</h2>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Browse our vehicles and add them to your cart to book multiple vehicles at once.
            </p>
            <Link
              href="/vehicles"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              Browse Vehicles
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cart.items.map((item) => {
                const images = parseImages(item.vehicle.images);
                const mainImage = images[0] || "/placeholder-car.jpg";

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Image */}
                      <div className="relative w-full sm:w-48 h-40 bg-slate-100 flex-shrink-0">
                        {images.length > 0 ? (
                          <Image
                            src={mainImage}
                            alt={item.vehicle.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        {!item.vehicle.available && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                              Not Available
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm text-blue-600 font-medium">{item.vehicle.brand}</p>
                            <h3 className="font-bold text-slate-900">{item.vehicle.name}</h3>
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            disabled={removing === item.id}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Remove from cart"
                          >
                            {removing === item.id ? (
                              <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            )}
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-slate-500">Pickup</p>
                            <p className="font-medium text-slate-900">
                              {new Date(item.startDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-500">{item.pickupLocation}</p>
                          </div>
                          <div>
                            <p className="text-slate-500">Return</p>
                            <p className="font-medium text-slate-900">
                              {new Date(item.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-500">{item.dropoffLocation}</p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <span className="bg-slate-100 px-2 py-1 rounded-lg">
                              {item.days} {item.days === 1 ? "day" : "days"}
                            </span>
                            <span>×</span>
                            <span>{formatCurrency(item.vehicle.pricePerDay)}/day</span>
                          </div>
                          <p className="text-lg font-bold text-blue-600">
                            {formatCurrency(item.totalPrice)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-24">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Order Summary</h2>

                <div className="space-y-3 mb-6">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 truncate max-w-[60%]">
                        {item.vehicle.name}
                      </span>
                      <span className="text-slate-900 font-medium">
                        {formatCurrency(item.totalPrice)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-200 pt-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-semibold text-slate-900">Total</span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      {formatCurrency(cart.cartTotal)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={checkingOut || cart.items.some((i) => !i.vehicle.available)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {checkingOut ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Proceed to Book ({cart.itemCount})
                    </>
                  )}
                </button>

                <Link
                  href="/vehicles"
                  className="block w-full text-center mt-3 text-sm text-slate-600 hover:text-blue-600 transition"
                >
                  Continue Browsing
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
