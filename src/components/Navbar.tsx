"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

export default function Navbar() {
  const { data: session } = useSession();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              RentWheels
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/vehicles"
              className="text-gray-700 hover:text-blue-600 transition"
            >
              Vehicles
            </Link>
            {session ? (
              <>
                <Link
                  href="/bookings"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  My Bookings
                </Link>
                {["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role) && (
                  <Link
                    href="/admin"
                    className="text-gray-700 hover:text-blue-600 transition"
                  >
                    Admin
                  </Link>
                )}
                <div className="flex items-center space-x-4">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                      {session.user.name?.charAt(0) || session.user.email?.charAt(0).toUpperCase()}
                    </span>
                    <span>{session.user.name || "Profile"}</span>
                  </Link>
                  <button
                    onClick={() => signOut()}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 transition"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
                >
                  Register
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-blue-600"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-4 py-2 space-y-2">
            <Link
              href="/vehicles"
              className="block text-gray-700 hover:text-blue-600 py-2"
            >
              Vehicles
            </Link>
            {session ? (
              <>
                <Link
                  href="/bookings"
                  className="block text-gray-700 hover:text-blue-600 py-2"
                >
                  My Bookings
                </Link>
                <Link
                  href="/profile"
                  className="block text-gray-700 hover:text-blue-600 py-2"
                >
                  My Profile
                </Link>
                {["MANAGER", "ADMIN", "SUPER_ADMIN"].includes(session.user.role) && (
                  <Link
                    href="/admin"
                    className="block text-gray-700 hover:text-blue-600 py-2"
                  >
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="block w-full text-left text-red-500 py-2"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block text-gray-700 hover:text-blue-600 py-2"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="block text-blue-600 font-semibold py-2"
                >
                  Register
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
