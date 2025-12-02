"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUI } from "@/components/ui/UIProvider";

interface Booking {
  id: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  vehicle: {
    id: string;
    name: string;
    brand: string;
    model: string;
    images: string[];
  };
}

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  image: string | null;
  emailVerified: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  _count: {
    bookings: number;
    reviews: number;
  };
}

type TabType = "overview" | "edit" | "security";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  COLLECTED: "bg-emerald-100 text-emerald-700",
  COMPLETED: "bg-purple-100 text-purple-700",
  INVOICED: "bg-orange-100 text-orange-700",
  PAID: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useUI();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [saving, setSaving] = useState(false);

  // Form states
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    image: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [profileRes, bookingsRes] = await Promise.all([
          fetch("/api/user/profile"),
          fetch("/api/bookings?limit=5"),
        ]);

        if (profileRes.ok) {
          const data = await profileRes.json();
          setProfile(data);
          setProfileForm({
            name: data.name || "",
            phone: data.phone || "",
            image: data.image || "",
          });
        }

        if (bookingsRes.ok) {
          const data = await bookingsRes.json();
          setRecentBookings(Array.isArray(data) ? data.slice(0, 5) : []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
      setLoading(false);
    }

    if (status === "authenticated") {
      fetchData();
    }
  }, [status]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
        toast({ message: "Profile updated successfully", type: "success" });
        setActiveTab("overview");
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to update profile", type: "error" });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({ message: "Failed to update profile", type: "error" });
    }

    setSaving(false);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({ message: "New passwords do not match", type: "error" });
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast({ message: "Password must be at least 8 characters", type: "error" });
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      if (res.ok) {
        toast({ message: "Password changed successfully", type: "success" });
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setActiveTab("overview");
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to change password", type: "error" });
      }
    } catch (error) {
      console.error("Error changing password:", error);
      toast({ message: "Failed to change password", type: "error" });
    }

    setSaving(false);
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !profile) {
    return null;
  }

  const getRoleBadge = (role: string) => {
    const badges: Record<string, string> = {
      USER: "bg-slate-100 text-slate-700",
      MANAGER: "bg-blue-100 text-blue-700",
      ADMIN: "bg-purple-100 text-purple-700",
      SUPER_ADMIN: "bg-red-100 text-red-700",
    };
    return badges[role] || badges.USER;
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-6">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
              {/* Avatar Section */}
              <div className="bg-gradient-to-br from-blue-600 to-purple-600 px-6 py-8 text-center">
                <div className="mx-auto mb-4 relative">
                  {profile.image ? (
                    <img
                      src={profile.image}
                      alt={profile.name || "Profile"}
                      className="w-24 h-24 rounded-full mx-auto object-cover border-4 border-white/30"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full mx-auto bg-white/20 flex items-center justify-center text-4xl font-bold text-white border-4 border-white/30">
                      {profile.name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white">
                  {profile.name || "No name set"}
                </h2>
                <p className="text-blue-100 text-sm">{profile.email}</p>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadge(profile.role)}`}>
                  {profile.role}
                </span>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">
                <div className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{profile._count.bookings}</p>
                  <p className="text-xs text-slate-500">Bookings</p>
                </div>
                <div className="px-4 py-4 text-center">
                  <p className="text-2xl font-bold text-slate-900">{profile._count.reviews}</p>
                  <p className="text-xs text-slate-500">Reviews</p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-600 truncate">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-slate-600">{profile.phone || "Not set"}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-slate-600">
                    Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-t border-slate-200 space-y-2">
                <Link
                  href="/bookings"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-sm font-medium text-slate-700"
                >
                  <span>My Bookings</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                <Link
                  href="/settings"
                  className="flex items-center justify-between w-full px-4 py-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 transition text-sm font-medium text-slate-700"
                >
                  <span>Settings</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>

          {/* Right Column - Tabs Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm ring-1 ring-slate-200 mb-6">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "overview"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("edit")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "edit"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Edit Profile
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition ${
                  activeTab === "security"
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Security
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Account Info */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Account Information</h3>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Full Name</label>
                      <p className="text-slate-900 font-medium">{profile.name || "Not set"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Email Address</label>
                      <p className="text-slate-900 font-medium">{profile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Phone Number</label>
                      <p className="text-slate-900 font-medium">{profile.phone || "Not set"}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-500 mb-1">Last Login</label>
                      <p className="text-slate-900 font-medium">
                        {profile.lastLoginAt
                          ? new Date(profile.lastLoginAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Bookings */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Recent Bookings</h3>
                    <Link href="/bookings" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View All
                    </Link>
                  </div>
                  {recentBookings.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {recentBookings.map((booking) => (
                        <div key={booking.id} className="px-6 py-4 flex items-center gap-4">
                          <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                            {booking.vehicle.images?.[0] ? (
                              <img
                                src={booking.vehicle.images[0]}
                                alt={booking.vehicle.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-slate-400">
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-slate-900 truncate">{booking.vehicle.name}</p>
                            <p className="text-sm text-slate-500">
                              {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || STATUS_COLORS.PENDING}`}>
                              {booking.status}
                            </span>
                            <p className="text-sm font-semibold text-slate-900 mt-1">${booking.totalPrice}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="px-6 py-12 text-center">
                      <svg className="w-12 h-12 mx-auto text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="mt-4 text-slate-500">No bookings yet</p>
                      <Link
                        href="/vehicles"
                        className="mt-4 inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Browse Vehicles
                        <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "edit" && (
              <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                <h3 className="text-lg font-semibold text-slate-900 mb-6">Edit Profile</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Profile Picture URL</label>
                    <div className="flex gap-4 items-start">
                      <div className="w-20 h-20 rounded-full bg-slate-100 overflow-hidden flex-shrink-0">
                        {profileForm.image ? (
                          <img src={profileForm.image} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-slate-400">
                            {profileForm.name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="url"
                          value={profileForm.image}
                          onChange={(e) => setProfileForm({ ...profileForm, image: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="https://example.com/your-photo.jpg"
                        />
                        <p className="mt-1 text-xs text-slate-500">Enter a URL to your profile picture</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Full Name</label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Phone Number</label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Enter your phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                    <input
                      type="email"
                      value={profile.email}
                      disabled
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileForm({
                          name: profile.name || "",
                          phone: profile.phone || "",
                          image: profile.image || "",
                        });
                        setActiveTab("overview");
                      }}
                      className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === "security" && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">Change Password</h3>
                  <p className="text-sm text-slate-500 mb-6">Update your password to keep your account secure</p>

                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">New Password</label>
                        <input
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          minLength={8}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Confirm New Password</label>
                        <input
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          minLength={8}
                          required
                        />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">Password must be at least 8 characters long</p>
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                    >
                      {saving ? "Updating..." : "Update Password"}
                    </button>
                  </form>
                </div>

                {/* Security Info */}
                <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Security Information</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <div>
                        <p className="font-medium text-slate-900">Email Verification</p>
                        <p className="text-sm text-slate-500">Your email verification status</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        profile.emailVerified ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {profile.emailVerified ? "Verified" : "Not Verified"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-slate-100">
                      <div>
                        <p className="font-medium text-slate-900">Account Status</p>
                        <p className="text-sm text-slate-500">Your current account status</p>
                      </div>
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        profile.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                      }`}>
                        {profile.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-slate-900">Last Login</p>
                        <p className="text-sm text-slate-500">Your most recent sign in</p>
                      </div>
                      <p className="text-sm text-slate-700">
                        {profile.lastLoginAt
                          ? new Date(profile.lastLoginAt).toLocaleString()
                          : "Never"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
