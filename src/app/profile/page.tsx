"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
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
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
          setFormData((prev) => ({
            ...prev,
            name: data.name || "",
            phone: data.phone || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
      setLoading(false);
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validate password change
    if (formData.newPassword) {
      if (formData.newPassword !== formData.confirmPassword) {
        setMessage({ type: "error", text: "New passwords do not match" });
        return;
      }
      if (formData.newPassword.length < 8) {
        setMessage({ type: "error", text: "New password must be at least 8 characters" });
        return;
      }
      if (!formData.currentPassword) {
        setMessage({ type: "error", text: "Current password is required to change password" });
        return;
      }
    }

    setSaving(true);

    try {
      const updateData: Record<string, string> = {
        name: formData.name,
        phone: formData.phone,
      };

      if (formData.newPassword) {
        updateData.currentPassword = formData.currentPassword;
        updateData.newPassword = formData.newPassword;
      }

      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (res.ok) {
        const updatedProfile = await res.json();
        setProfile((prev) => (prev ? { ...prev, ...updatedProfile } : null));
        setMessage({ type: "success", text: "Profile updated successfully" });
        setEditing(false);
        setFormData((prev) => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        }));
      } else {
        const error = await res.json();
        setMessage({ type: "error", text: error.error || "Failed to update profile" });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setMessage({ type: "error", text: "Failed to update profile" });
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
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block">
            &larr; Back to Home
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">My Profile</h1>
          <p className="text-slate-500">Manage your account settings</p>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-6 rounded-lg p-4 ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Profile Card */}
        <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-3xl font-bold text-white">
                {profile.name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {profile.name || "No name set"}
                </h2>
                <p className="text-blue-100">{profile.email}</p>
                <span className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-medium ${getRoleBadge(profile.role)}`}>
                  {profile.role}
                </span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 border-b border-slate-200">
            <div className="px-6 py-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{profile._count.bookings}</p>
              <p className="text-sm text-slate-500">Bookings</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-2xl font-bold text-slate-900">{profile._count.reviews}</p>
              <p className="text-sm text-slate-500">Reviews</p>
            </div>
            <div className="px-6 py-4 text-center">
              <p className="text-2xl font-bold text-slate-900">
                {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
              </p>
              <p className="text-sm text-slate-500">Member Since</p>
            </div>
          </div>

          {/* Profile Details / Edit Form */}
          <div className="p-6">
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="text-lg font-medium text-slate-900 mb-4">Change Password</h3>
                  <p className="text-sm text-slate-500 mb-4">Leave blank to keep your current password</p>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Current Password
                      </label>
                      <input
                        type="password"
                        value={formData.currentPassword}
                        onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        New Password
                      </label>
                      <input
                        type="password"
                        value={formData.newPassword}
                        onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        minLength={8}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setFormData({
                        name: profile.name || "",
                        phone: profile.phone || "",
                        currentPassword: "",
                        newPassword: "",
                        confirmPassword: "",
                      });
                    }}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Full Name
                    </label>
                    <p className="text-slate-900">{profile.name || "Not set"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Email Address
                    </label>
                    <p className="text-slate-900">{profile.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Phone Number
                    </label>
                    <p className="text-slate-900">{profile.phone || "Not set"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-500 mb-1">
                      Last Login
                    </label>
                    <p className="text-slate-900">
                      {profile.lastLoginAt
                        ? new Date(profile.lastLoginAt).toLocaleString()
                        : "Never"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setEditing(true)}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Links */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/bookings"
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 transition"
          >
            <h3 className="text-lg font-semibold text-slate-900">My Bookings</h3>
            <p className="text-sm text-slate-500 mt-1">View and manage your vehicle rentals</p>
          </Link>
          <Link
            href="/vehicles"
            className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200 hover:ring-blue-300 transition"
          >
            <h3 className="text-lg font-semibold text-slate-900">Browse Vehicles</h3>
            <p className="text-sm text-slate-500 mt-1">Find your next rental vehicle</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
