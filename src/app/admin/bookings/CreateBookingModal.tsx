"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/config/site";

interface User {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
}

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
  pricePerDay: number;
  location: string;
  available: boolean;
  images: string;
}

interface Package {
  id: string;
  name: string;
  type: string;
  pricePerDay: number | null;
  pricePerHour: number | null;
  basePrice: number | null;
  discount: number | null;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateBookingModalProps) {
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form states
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("10:00");
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [selectedPackageIds, setSelectedPackageIds] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Search states
  const [userSearch, setUserSearch] = useState("");
  const [vehicleSearch, setVehicleSearch] = useState("");

  // New customer form states
  const [isCreatingNewCustomer, setIsCreatingNewCustomer] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerEmail, setNewCustomerEmail] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  // UI states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1: Customer, 2: Dates, 3: Vehicle, 4: Review
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Load data when modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoadingData(true);
    try {
      const [usersRes, packagesRes] = await Promise.all([
        fetch("/api/admin/users?limit=100"),
        fetch("/api/packages"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users || data);
      }
      if (packagesRes.ok) {
        const data = await packagesRes.json();
        setPackages(data);
      }
    } catch (err) {
      console.error("Error loading data:", err);
      setError("Failed to load data");
    } finally {
      setLoadingData(false);
    }
  };

  // Load available vehicles based on selected dates
  const loadAvailableVehicles = async () => {
    if (!startDate || !endDate) return;

    setLoadingVehicles(true);
    setVehicles([]);
    setSelectedVehicleId("");

    try {
      const params = new URLSearchParams({
        startDate: `${startDate}T${startTime}:00`,
        endDate: `${endDate}T${endTime}:00`,
      });

      const res = await fetch(`/api/vehicles/available?${params}`);
      if (res.ok) {
        const data = await res.json();
        setVehicles(data);
      } else {
        // Fallback: get all vehicles if availability API doesn't exist
        const fallbackRes = await fetch("/api/vehicles");
        if (fallbackRes.ok) {
          const data = await fallbackRes.json();
          const allVehicles = Array.isArray(data) ? data : (data.vehicles || []);
          // Filter to only available vehicles
          setVehicles(allVehicles.filter((v: Vehicle) => v.available));
        }
      }
    } catch (err) {
      console.error("Error loading vehicles:", err);
      setError("Failed to load available vehicles");
    } finally {
      setLoadingVehicles(false);
    }
  };

  const resetForm = () => {
    setSelectedUserId("");
    setSelectedVehicleId("");
    setStartDate("");
    setStartTime("10:00");
    setEndDate("");
    setEndTime("10:00");
    setPickupLocation("");
    setDropoffLocation("");
    setSelectedPackageIds([]);
    setNotes("");
    setUserSearch("");
    setVehicleSearch("");
    setIsCreatingNewCustomer(false);
    setNewCustomerName("");
    setNewCustomerEmail("");
    setNewCustomerPhone("");
    setStep(1);
    setError("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // Filter users and vehicles based on search
  const filteredUsers = users.filter(
    (u) =>
      u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone?.includes(userSearch)
  );

  const filteredVehicles = vehicles.filter(
    (v) =>
      v.name.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.brand.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  // Calculate pricing
  const calculatePricing = () => {
    if (!selectedVehicle || !startDate || !endDate) return null;

    const start = new Date(`${startDate}T${startTime}`);
    const end = new Date(`${endDate}T${endTime}`);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

    const basePrice = selectedVehicle.pricePerDay * days;

    // Calculate package prices
    let packageTotal = 0;
    selectedPackageIds.forEach((pkgId) => {
      const pkg = packages.find((p) => p.id === pkgId);
      if (pkg) {
        if (pkg.basePrice) {
          packageTotal += pkg.basePrice;
        } else if (pkg.pricePerDay) {
          packageTotal += pkg.pricePerDay * days;
        }
      }
    });

    const totalPrice = basePrice + packageTotal;

    return { days, basePrice, packageTotal, totalPrice };
  };

  const pricing = calculatePricing();

  // Handle package toggle
  const togglePackage = (packageId: string) => {
    setSelectedPackageIds((prev) =>
      prev.includes(packageId)
        ? prev.filter((id) => id !== packageId)
        : [...prev, packageId]
    );
  };

  // Set default location when vehicle is selected
  useEffect(() => {
    if (selectedVehicle) {
      setPickupLocation(selectedVehicle.location);
      setDropoffLocation(selectedVehicle.location);
    }
  }, [selectedVehicle]);

  // Create new customer and proceed to next step
  const handleCreateCustomer = async () => {
    if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
      setError("Name and phone number are required");
      return;
    }

    setCreatingCustomer(true);
    setError("");

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCustomerName.trim(),
          email: newCustomerEmail.trim() || null,
          phone: newCustomerPhone.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        // Add new user to the list and select them
        const newUser: User = {
          id: data.user.id,
          name: data.user.name,
          email: data.user.email || "",
          phone: data.user.phone,
        };
        setUsers((prev) => [newUser, ...prev]);
        setSelectedUserId(newUser.id);
        setIsCreatingNewCustomer(false);
        setNewCustomerName("");
        setNewCustomerEmail("");
        setNewCustomerPhone("");
        // Automatically proceed to next step
        setStep(2);
      } else {
        setError(data.error || "Failed to create customer");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreatingCustomer(false);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedUserId || !selectedVehicleId || !startDate || !endDate) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedUserId,
          vehicleId: selectedVehicleId,
          startDate: `${startDate}T${startTime}:00`,
          endDate: `${endDate}T${endTime}:00`,
          pickupLocation: pickupLocation || selectedVehicle?.location,
          dropoffLocation: dropoffLocation || selectedVehicle?.location,
          packageIds: selectedPackageIds,
          notes,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        handleClose();
        onSuccess();
      } else {
        setError(data.error || "Failed to create booking");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Validate current step
  const canProceed = () => {
    switch (step) {
      case 1:
        return !!selectedUserId;
      case 2:
        return !!startDate && !!endDate;
      case 3:
        return !!selectedVehicleId;
      case 4:
        return true;
      default:
        return false;
    }
  };

  // Handle step change - load vehicles when moving to step 3
  const handleNextStep = () => {
    if (step === 2 && canProceed()) {
      // Moving from dates to vehicle selection - load available vehicles
      loadAvailableVehicles();
    }
    setStep(step + 1);
  };

  if (!isOpen) return null;

  // Get first image from vehicle
  const getVehicleImage = (vehicle: Vehicle) => {
    try {
      const images = JSON.parse(vehicle.images);
      return Array.isArray(images) && images.length > 0 ? images[0] : null;
    } catch {
      return vehicle.images?.startsWith("http") ? vehicle.images : null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-600 to-purple-600 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Create New Booking</h2>
            <p className="text-sm text-white/80">Step {step} of 4</p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-white/80 hover:bg-white/20 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex-1">
                <div
                  className={`h-2 rounded-full transition-all ${
                    s <= step ? "bg-blue-600" : "bg-slate-200"
                  }`}
                />
                <p className={`text-xs mt-1 ${s <= step ? "text-blue-600 font-medium" : "text-slate-400"}`}>
                  {s === 1 && "Customer"}
                  {s === 2 && "Dates"}
                  {s === 3 && "Vehicle"}
                  {s === 4 && "Review"}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {loadingData ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              {/* Step 1: Select Customer */}
              {step === 1 && (
                <div className="space-y-4">
                  {/* Toggle between search and create new */}
                  <div className="flex rounded-xl bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewCustomer(false);
                        setError("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                        !isCreatingNewCustomer
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      Search Existing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCreatingNewCustomer(true);
                        setSelectedUserId("");
                        setError("");
                      }}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition ${
                        isCreatingNewCustomer
                          ? "bg-white text-green-600 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      + New Customer
                    </button>
                  </div>

                  {!isCreatingNewCustomer ? (
                    <>
                      {/* Search existing customers */}
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <input
                          type="text"
                          placeholder="Search customers by name, email, or phone..."
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>

                      <div className="grid gap-2 max-h-72 overflow-y-auto">
                        {filteredUsers.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => setSelectedUserId(user.id)}
                            className={`flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${
                              selectedUserId === user.id
                                ? "border-blue-600 bg-blue-50"
                                : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-lg font-medium text-white flex-shrink-0">
                              {user.name?.charAt(0) || "U"}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 truncate">
                                {user.name || "Unknown"}
                              </p>
                              <p className="text-sm text-slate-500 truncate">{user.email}</p>
                              {user.phone && (
                                <p className="text-sm text-slate-400">{user.phone}</p>
                              )}
                            </div>
                            {selectedUserId === user.id && (
                              <svg className="w-6 h-6 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                        ))}

                        {filteredUsers.length === 0 && userSearch && (
                          <div className="text-center py-6">
                            <p className="text-slate-500 mb-3">No customers found for &quot;{userSearch}&quot;</p>
                            <button
                              type="button"
                              onClick={() => {
                                setIsCreatingNewCustomer(true);
                                setNewCustomerName(userSearch);
                              }}
                              className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition font-medium text-sm"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Create New Customer
                            </button>
                          </div>
                        )}

                        {filteredUsers.length === 0 && !userSearch && (
                          <div className="text-center py-8 text-slate-500">
                            Start typing to search customers
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    /* Create new customer form */
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 rounded-xl border border-green-200">
                        <div className="flex items-center gap-2 text-green-700 mb-3">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                          </svg>
                          <span className="font-medium">New Customer Details</span>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              value={newCustomerName}
                              onChange={(e) => setNewCustomerName(e.target.value)}
                              placeholder="Enter customer name"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Phone Number <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              value={newCustomerPhone}
                              onChange={(e) => setNewCustomerPhone(e.target.value)}
                              placeholder="Enter phone number"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                              Email <span className="text-slate-400">(optional)</span>
                            </label>
                            <input
                              type="email"
                              value={newCustomerEmail}
                              onChange={(e) => setNewCustomerEmail(e.target.value)}
                              placeholder="Enter email address"
                              className="w-full px-3 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-slate-900"
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleCreateCustomer}
                        disabled={creatingCustomer || !newCustomerName.trim() || !newCustomerPhone.trim()}
                        className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {creatingCustomer ? (
                          <>
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                            Creating...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Create Customer & Continue
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2: Select Dates */}
              {step === 2 && (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700 mb-3">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium">Select Rental Period</span>
                    </div>
                    <p className="text-sm text-blue-600 mb-4">
                      Choose dates first to see available vehicles
                    </p>
                    {/* Dates Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Pickup Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                          min={new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Pickup Time
                        </label>
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Return Date <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          min={startDate || new Date().toISOString().split("T")[0]}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                          Return Time
                        </label>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 3: Select Vehicle & Details */}
              {step === 3 && (
                <div className="space-y-6">
                  {/* Date Summary */}
                  <div className="p-3 bg-blue-50 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-blue-700">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium">
                        {startDate && new Date(startDate).toLocaleDateString()} - {endDate && new Date(endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Change dates
                    </button>
                  </div>

                  {/* Vehicle Selection */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Available Vehicle
                    </label>
                    {loadingVehicles ? (
                      <div className="flex items-center justify-center py-8">
                        <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="ml-2 text-slate-600">Loading available vehicles...</span>
                      </div>
                    ) : (
                      <>
                        <div className="relative mb-3">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            placeholder="Search vehicles..."
                            value={vehicleSearch}
                            onChange={(e) => setVehicleSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                          />
                        </div>

                        <div className="grid gap-2 max-h-48 overflow-y-auto">
                          {filteredVehicles.map((vehicle) => {
                            const image = getVehicleImage(vehicle);
                            return (
                              <button
                                key={vehicle.id}
                                onClick={() => setSelectedVehicleId(vehicle.id)}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 transition text-left ${
                                  selectedVehicleId === vehicle.id
                                    ? "border-blue-600 bg-blue-50"
                                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                                }`}
                              >
                                <div className="w-16 h-12 rounded-lg bg-slate-100 overflow-hidden flex-shrink-0">
                                  {image ? (
                                    <img src={image} alt={vehicle.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-6 4h4" />
                                      </svg>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-slate-900 text-sm">{vehicle.name}</p>
                                  <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-bold text-blue-600 text-sm">{formatCurrency(vehicle.pricePerDay)}</p>
                                  <p className="text-xs text-slate-400">/day</p>
                                </div>
                                {selectedVehicleId === vehicle.id && (
                                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                              </button>
                            );
                          })}

                          {filteredVehicles.length === 0 && !loadingVehicles && (
                            <div className="text-center py-6 text-slate-500">
                              <svg className="w-12 h-12 mx-auto mb-2 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                              </svg>
                              <p>No vehicles available for selected dates</p>
                              <button
                                type="button"
                                onClick={() => setStep(2)}
                                className="mt-2 text-blue-600 hover:underline text-sm"
                              >
                                Try different dates
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Locations */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Pickup Location
                      </label>
                      <input
                        type="text"
                        value={pickupLocation}
                        onChange={(e) => setPickupLocation(e.target.value)}
                        placeholder={selectedVehicle?.location || "Enter location"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Drop-off Location
                      </label>
                      <input
                        type="text"
                        value={dropoffLocation}
                        onChange={(e) => setDropoffLocation(e.target.value)}
                        placeholder={selectedVehicle?.location || "Enter location"}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                      />
                    </div>
                  </div>

                  {/* Packages */}
                  {packages.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Add-on Packages (Optional)
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {packages.map((pkg) => (
                          <button
                            key={pkg.id}
                            type="button"
                            onClick={() => togglePackage(pkg.id)}
                            className={`flex items-center justify-between p-3 rounded-xl border-2 transition text-left ${
                              selectedPackageIds.includes(pkg.id)
                                ? "border-indigo-600 bg-indigo-50"
                                : "border-slate-200 hover:border-indigo-300"
                            }`}
                          >
                            <div>
                              <p className="font-medium text-slate-900 text-sm">{pkg.name}</p>
                              <p className="text-xs text-slate-500">{pkg.type}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-indigo-600 text-sm">
                                {pkg.basePrice
                                  ? formatCurrency(pkg.basePrice)
                                  : pkg.pricePerDay
                                  ? `${formatCurrency(pkg.pricePerDay)}/day`
                                  : "Free"}
                              </p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      placeholder="Any special requests or notes..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-slate-900"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="space-y-4">
                  {/* Customer Info */}
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">Customer</p>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-medium text-white">
                        {selectedUser?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{selectedUser?.name || "Unknown"}</p>
                        <p className="text-sm text-slate-500">{selectedUser?.email}</p>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  <div className="p-4 bg-slate-50 rounded-xl">
                    <p className="text-xs text-slate-500 mb-2">Vehicle</p>
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-12 rounded-lg bg-slate-200 overflow-hidden">
                        {selectedVehicle && getVehicleImage(selectedVehicle) ? (
                          <img
                            src={getVehicleImage(selectedVehicle)!}
                            alt={selectedVehicle.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h8m-8 4h8m-6 4h4" />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{selectedVehicle?.name}</p>
                        <p className="text-sm text-slate-500">
                          {selectedVehicle?.brand} {selectedVehicle?.model}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Booking Details */}
                  <div className="p-4 bg-blue-50 rounded-xl">
                    <p className="text-xs text-blue-600 mb-2">Booking Period</p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Pickup</p>
                        <p className="font-semibold text-slate-900">
                          {startDate && new Date(startDate).toLocaleDateString()}
                        </p>
                        <p className="text-blue-600">{startTime}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Return</p>
                        <p className="font-semibold text-slate-900">
                          {endDate && new Date(endDate).toLocaleDateString()}
                        </p>
                        <p className="text-blue-600">{endTime}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-500">Pickup Location</p>
                        <p className="font-medium text-slate-900">{pickupLocation || selectedVehicle?.location}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Drop-off Location</p>
                        <p className="font-medium text-slate-900">{dropoffLocation || selectedVehicle?.location}</p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Packages */}
                  {selectedPackageIds.length > 0 && (
                    <div className="p-4 bg-indigo-50 rounded-xl">
                      <p className="text-xs text-indigo-600 mb-2">Selected Packages</p>
                      <div className="space-y-1">
                        {selectedPackageIds.map((pkgId) => {
                          const pkg = packages.find((p) => p.id === pkgId);
                          return pkg ? (
                            <div key={pkg.id} className="flex justify-between text-sm">
                              <span className="text-slate-700">{pkg.name}</span>
                              <span className="font-medium text-indigo-700">
                                {pkg.basePrice
                                  ? formatCurrency(pkg.basePrice)
                                  : pkg.pricePerDay && pricing
                                  ? formatCurrency(pkg.pricePerDay * pricing.days)
                                  : "Free"}
                              </span>
                            </div>
                          ) : null;
                        })}
                      </div>
                    </div>
                  )}

                  {/* Pricing Summary */}
                  {pricing && (
                    <div className="p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl text-white">
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-white/80">
                            Base Rental ({pricing.days} days × {formatCurrency(selectedVehicle?.pricePerDay || 0)})
                          </span>
                          <span className="font-medium">{formatCurrency(pricing.basePrice)}</span>
                        </div>
                        {pricing.packageTotal > 0 && (
                          <div className="flex justify-between">
                            <span className="text-white/80">Packages</span>
                            <span className="font-medium">+{formatCurrency(pricing.packageTotal)}</span>
                          </div>
                        )}
                        <div className="flex justify-between pt-2 border-t border-white/30">
                          <span className="font-bold">Total</span>
                          <span className="text-xl font-bold">{formatCurrency(pricing.totalPrice)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {notes && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">{notes}</p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex justify-between gap-3 p-6 border-t border-slate-100">
          <button
            onClick={() => {
              if (step > 1) {
                // If going back from vehicle step to dates, clear vehicle selection
                if (step === 3) {
                  setSelectedVehicleId("");
                  setVehicles([]);
                }
                setStep(step - 1);
              } else {
                handleClose();
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-medium hover:bg-slate-200 transition"
          >
            {step > 1 ? "Back" : "Cancel"}
          </button>

          <div className="flex gap-3">
            {step < 4 ? (
              <button
                onClick={handleNextStep}
                disabled={!canProceed()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create Booking"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
