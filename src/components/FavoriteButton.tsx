"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface FavoriteButtonProps {
  vehicleId: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export default function FavoriteButton({
  vehicleId,
  size = "md",
  className = "",
  showText = false,
}: FavoriteButtonProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [isFavorited, setIsFavorited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [animating, setAnimating] = useState(false);

  // Check if vehicle is favorited
  useEffect(() => {
    if (session?.user) {
      checkFavoriteStatus();
    }
  }, [session?.user, vehicleId]);

  const checkFavoriteStatus = async () => {
    try {
      const res = await fetch(`/api/favorites/check?vehicleId=${vehicleId}`);
      if (res.ok) {
        const data = await res.json();
        setIsFavorited(data.isFavorited);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!session?.user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setAnimating(true);

    try {
      if (isFavorited) {
        // Remove from favorites
        const res = await fetch(`/api/favorites?vehicleId=${vehicleId}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setIsFavorited(false);
        }
      } else {
        // Add to favorites
        const res = await fetch("/api/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicleId }),
        });
        if (res.ok) {
          setIsFavorited(true);
        }
      }
    } catch (error) {
      console.error("Error toggling favorite:", error);
    } finally {
      setLoading(false);
      setTimeout(() => setAnimating(false), 300);
    }
  };

  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <button
      onClick={toggleFavorite}
      disabled={loading}
      className={`
        ${sizeClasses[size]}
        ${showText ? "w-auto px-4" : ""}
        flex items-center justify-center gap-2
        rounded-full
        transition-all duration-200
        ${
          isFavorited
            ? "bg-red-50 text-red-500 hover:bg-red-100"
            : "bg-white/90 text-slate-400 hover:text-red-500 hover:bg-white"
        }
        ${animating ? "scale-125" : "scale-100"}
        shadow-sm backdrop-blur-sm
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      title={isFavorited ? "Remove from favorites" : "Add to favorites"}
    >
      <svg
        className={`${iconSizes[size]} transition-transform ${
          animating ? "scale-110" : ""
        }`}
        fill={isFavorited ? "currentColor" : "none"}
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
      {showText && (
        <span className="text-sm font-medium">
          {isFavorited ? "Saved" : "Save"}
        </span>
      )}
    </button>
  );
}
