"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useUI } from "@/components/ui/UIProvider";

interface UserSettings {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { confirm, toast } = useUI();

  const [user, setUser] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);

  // Notification preferences (stored locally for now)
  const [notifications, setNotifications] = useState({
    emailBookings: true,
    emailPromotions: false,
    emailReminders: true,
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
      setLoading(false);
    }

    if (status === "authenticated") {
      fetchUser();
      // Load saved notification preferences
      const saved = localStorage.getItem("notificationPrefs");
      if (saved) {
        setNotifications(JSON.parse(saved));
      }
    }
  }, [status]);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    localStorage.setItem("notificationPrefs", JSON.stringify(updated));
    toast({ message: "Preferences saved", type: "success" });
  };

  const handleSignOut = async () => {
    const confirmed = await confirm({
      title: "Sign Out",
      message: "Are you sure you want to sign out of your account?",
      confirmText: "Sign Out",
      variant: "warning",
    });

    if (confirmed) {
      await signOut({ callbackUrl: "/" });
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = await confirm({
      title: "Delete Account",
      message: "This action is irreversible. All your data including bookings and reviews will be permanently deleted. Are you absolutely sure?",
      confirmText: "Delete My Account",
      variant: "danger",
    });

    if (confirmed) {
      // For now, just show a message - actual deletion would require backend support
      toast({
        message: "Please contact support to delete your account",
        type: "info"
      });
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!session || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8">
          <Link href="/profile" className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Profile
          </Link>
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-500">Manage your account preferences</p>
        </div>

        <div className="space-y-6">
          {/* Account Overview */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Account</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-2xl font-bold text-white">
                  {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{user.name || "No name set"}</p>
                  <p className="text-sm text-slate-500">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/profile"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
                >
                  Edit Profile
                </Link>
                <button
                  onClick={handleSignOut}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>

          {/* Notification Preferences */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
              <p className="text-sm text-slate-500">Choose what notifications you receive</p>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Booking Updates</p>
                  <p className="text-sm text-slate-500">Get notified about booking confirmations and changes</p>
                </div>
                <button
                  onClick={() => handleNotificationChange("emailBookings")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.emailBookings ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.emailBookings ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Promotional Emails</p>
                  <p className="text-sm text-slate-500">Receive offers, discounts, and special deals</p>
                </div>
                <button
                  onClick={() => handleNotificationChange("emailPromotions")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.emailPromotions ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.emailPromotions ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Booking Reminders</p>
                  <p className="text-sm text-slate-500">Get reminders before your rental starts or ends</p>
                </div>
                <button
                  onClick={() => handleNotificationChange("emailReminders")}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications.emailReminders ? "bg-blue-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications.emailReminders ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
              <p className="text-sm text-slate-500">Customize how RentWheels looks</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Theme</p>
                  <p className="text-sm text-slate-500">Select your preferred theme</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-4 py-2 rounded-lg bg-white border-2 border-blue-600 text-sm font-medium text-blue-600">
                    Light
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium text-slate-500 cursor-not-allowed" disabled>
                    Dark
                  </button>
                  <button className="px-4 py-2 rounded-lg bg-slate-100 border border-slate-200 text-sm font-medium text-slate-500 cursor-not-allowed" disabled>
                    System
                  </button>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-400">Dark mode coming soon</p>
            </div>
          </div>

          {/* Privacy & Security */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Privacy & Security</h2>
              <p className="text-sm text-slate-500">Manage your security settings</p>
            </div>
            <div className="divide-y divide-slate-100">
              <Link
                href="/profile"
                onClick={() => {
                  // Navigate to profile and switch to security tab
                  sessionStorage.setItem("profileTab", "security");
                }}
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-medium text-slate-900">Change Password</p>
                  <p className="text-sm text-slate-500">Update your account password</p>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Two-Factor Authentication</p>
                  <p className="text-sm text-slate-500">Add an extra layer of security</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Coming Soon</span>
              </div>
              <div className="px-6 py-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Active Sessions</p>
                  <p className="text-sm text-slate-500">Manage your logged-in devices</p>
                </div>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded-full">Coming Soon</span>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">Help & Support</h2>
            </div>
            <div className="divide-y divide-slate-100">
              <a
                href="mailto:support@rentwheels.com"
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Contact Support</p>
                    <p className="text-sm text-slate-500">Get help from our team</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#"
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">FAQs</p>
                    <p className="text-sm text-slate-500">Find answers to common questions</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#"
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Terms of Service</p>
                    <p className="text-sm text-slate-500">Read our terms and conditions</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
              <a
                href="#"
                className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Privacy Policy</p>
                    <p className="text-sm text-slate-500">Learn how we protect your data</p>
                  </div>
                </div>
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-red-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50">
              <h2 className="text-lg font-semibold text-red-900">Danger Zone</h2>
              <p className="text-sm text-red-600">Irreversible actions</p>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">Delete Account</p>
                  <p className="text-sm text-slate-500">Permanently delete your account and all associated data</p>
                </div>
                <button
                  onClick={handleDeleteAccount}
                  className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition"
                >
                  Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* App Version */}
          <div className="text-center py-6 text-sm text-slate-400">
            <p>RentWheels v0.1.0</p>
            <p className="mt-1">Made with care for our customers</p>
          </div>
        </div>
      </div>
    </div>
  );
}
