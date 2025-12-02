"use client";

import { useState, useEffect } from "react";
import { PackageType } from "@prisma/client";
import { useUI } from "@/components/ui/UIProvider";
import { formatCurrency, currency } from "@/config/site";

interface Policy {
  id: string;
  name: string;
  title: string;
}

interface Vehicle {
  id: string;
  name: string;
  brand: string;
  model: string;
}

interface Package {
  id: string;
  name: string;
  description: string | null;
  type: PackageType;
  basePrice: number | null;
  pricePerDay: number | null;
  pricePerHour: number | null;
  discount: number | null;
  minDuration: number | null;
  maxDuration: number | null;
  isActive: boolean;
  isGlobal: boolean;
  sortOrder: number;
  icon: string | null;
  policies: { policy: Policy }[];
  vehiclePackages: { vehicle: Vehicle }[];
  _count: {
    vehiclePackages: number;
    bookings: number;
  };
}

const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  DAILY: "Daily Rental",
  WEEKLY: "Weekly Rental",
  MONTHLY: "Monthly Rental",
  AIRPORT_PICKUP: "Airport Pickup",
  AIRPORT_DROP: "Airport Drop",
  AIRPORT_ROUND: "Airport Round Trip",
  HOURLY: "Hourly Rental",
  CUSTOM: "Custom",
};

const PACKAGE_TYPE_COLORS: Record<PackageType, string> = {
  DAILY: "bg-blue-100 text-blue-700",
  WEEKLY: "bg-green-100 text-green-700",
  MONTHLY: "bg-purple-100 text-purple-700",
  AIRPORT_PICKUP: "bg-orange-100 text-orange-700",
  AIRPORT_DROP: "bg-amber-100 text-amber-700",
  AIRPORT_ROUND: "bg-yellow-100 text-yellow-700",
  HOURLY: "bg-cyan-100 text-cyan-700",
  CUSTOM: "bg-slate-100 text-slate-700",
};

export default function PackageTable() {
  const { confirm, toast } = useUI();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [allPolicies, setAllPolicies] = useState<Policy[]>([]);
  const [allVehicles, setAllVehicles] = useState<Vehicle[]>([]);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchPolicies();
    fetchVehicles();
  }, [showInactive]);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/packages?includeInactive=${showInactive}`);
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    }
    setLoading(false);
  };

  const fetchPolicies = async () => {
    try {
      const res = await fetch("/api/admin/policies?includeInactive=false");
      if (res.ok) {
        const data = await res.json();
        setAllPolicies(data);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const res = await fetch("/api/vehicles");
      if (res.ok) {
        const data = await res.json();
        setAllVehicles(Array.isArray(data) ? data : data.vehicles || []);
      }
    } catch (error) {
      console.error("Error fetching vehicles:", error);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = await confirm({
      title: "Delete Package",
      message: "Are you sure you want to delete this package? This action cannot be undone.",
      confirmText: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/packages/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ message: "Package deleted successfully", type: "success" });
        fetchPackages();
      } else {
        const error = await res.json();
        toast({ message: error.error || "Failed to delete package", type: "error" });
      }
    } catch (error) {
      console.error("Error deleting package:", error);
      toast({ message: "Failed to delete package", type: "error" });
    }
  };

  const handleToggleActive = async (pkg: Package) => {
    try {
      const res = await fetch(`/api/admin/packages/${pkg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !pkg.isActive }),
      });
      if (res.ok) {
        fetchPackages();
      }
    } catch (error) {
      console.error("Error updating package:", error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-slate-300"
          />
          Show inactive packages
        </label>
        <button
          onClick={() => {
            setEditingPackage(null);
            setShowModal(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          + Add Package
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Package
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Type
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Pricing
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Scope
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Policies
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : packages.length > 0 ? (
                packages.map((pkg) => (
                  <tr key={pkg.id} className={`hover:bg-slate-50 transition ${!pkg.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{pkg.name}</p>
                        {pkg.description && (
                          <p className="text-xs text-slate-500 truncate max-w-xs">{pkg.description}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${PACKAGE_TYPE_COLORS[pkg.type]}`}>
                        {PACKAGE_TYPE_LABELS[pkg.type]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700">
                      {pkg.basePrice && <p><span className="text-slate-500">Base:</span> <span className="font-medium text-slate-900">{formatCurrency(pkg.basePrice)}</span></p>}
                      {pkg.pricePerDay && <p><span className="text-slate-500">Per Day:</span> <span className="font-medium text-slate-900">{formatCurrency(pkg.pricePerDay)}</span></p>}
                      {pkg.pricePerHour && <p><span className="text-slate-500">Per Hour:</span> <span className="font-medium text-slate-900">{formatCurrency(pkg.pricePerHour)}</span></p>}
                      {pkg.discount && <p className="text-green-600 font-medium">{pkg.discount}% off</p>}
                    </td>
                    <td className="px-6 py-4">
                      {pkg.isGlobal ? (
                        <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-medium bg-emerald-100 text-emerald-700">
                          All Vehicles
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {pkg.vehiclePackages?.slice(0, 3).map((vp) => (
                            <span key={vp.vehicle.id} className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700">
                              {vp.vehicle.name}
                            </span>
                          ))}
                          {pkg.vehiclePackages?.length > 3 && (
                            <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600">
                              +{pkg.vehiclePackages.length - 3} more
                            </span>
                          )}
                          {(!pkg.vehiclePackages || pkg.vehiclePackages.length === 0) && (
                            <span className="text-xs text-amber-600">No vehicles assigned</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {pkg.policies.slice(0, 2).map((pp) => (
                          <span key={pp.policy.id} className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {pp.policy.name}
                          </span>
                        ))}
                        {pkg.policies.length > 2 && (
                          <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            +{pkg.policies.length - 2} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(pkg)}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${pkg.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {pkg.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPackage(pkg);
                            setShowModal(true);
                          }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(pkg.id)}
                          className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <p className="text-slate-500">No packages found. Create your first package!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <PackageModal
          pkg={editingPackage}
          policies={allPolicies}
          vehicles={allVehicles}
          onClose={() => {
            setShowModal(false);
            setEditingPackage(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingPackage(null);
            fetchPackages();
          }}
        />
      )}
    </div>
  );
}

// Package Modal Component
function PackageModal({
  pkg,
  policies,
  vehicles,
  onClose,
  onSave,
}: {
  pkg: Package | null;
  policies: Policy[];
  vehicles: Vehicle[];
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: pkg?.name || "",
    description: pkg?.description || "",
    type: pkg?.type || "DAILY",
    basePrice: pkg?.basePrice?.toString() || "",
    pricePerDay: pkg?.pricePerDay?.toString() || "",
    pricePerHour: pkg?.pricePerHour?.toString() || "",
    discount: pkg?.discount?.toString() || "",
    minDuration: pkg?.minDuration?.toString() || "",
    maxDuration: pkg?.maxDuration?.toString() || "",
    isActive: pkg?.isActive ?? true,
    isGlobal: pkg?.isGlobal ?? true,
    sortOrder: pkg?.sortOrder?.toString() || "0",
    icon: pkg?.icon || "",
    policyIds: pkg?.policies.map((pp) => pp.policy.id) || [],
    vehicleIds: pkg?.vehiclePackages?.map((vp) => vp.vehicle.id) || [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = pkg ? `/api/admin/packages/${pkg.id}` : "/api/admin/packages";
      const method = pkg ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save package");
      }
    } catch (err) {
      console.error("Error saving package:", err);
      setError("Failed to save package");
    }
    setLoading(false);
  };

  const handlePolicyToggle = (policyId: string) => {
    setFormData((prev) => ({
      ...prev,
      policyIds: prev.policyIds.includes(policyId)
        ? prev.policyIds.filter((id) => id !== policyId)
        : [...prev.policyIds, policyId],
    }));
  };

  const handleVehicleToggle = (vehicleId: string) => {
    setFormData((prev) => ({
      ...prev,
      vehicleIds: prev.vehicleIds.includes(vehicleId)
        ? prev.vehicleIds.filter((id) => id !== vehicleId)
        : [...prev.vehicleIds, vehicleId],
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {pkg ? "Edit Package" : "Create Package"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., Airport Pickup"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Type *</label>
                <select
                  required
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as PackageType })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(PACKAGE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={2}
                placeholder="Describe the package..."
              />
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Base Price</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.basePrice}
                  onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Per Day</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerDay}
                  onChange={(e) => setFormData({ ...formData, pricePerDay: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Per Hour</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.pricePerHour}
                  onChange={(e) => setFormData({ ...formData, pricePerHour: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Discount %</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Min Duration</label>
                <input
                  type="number"
                  value={formData.minDuration}
                  onChange={(e) => setFormData({ ...formData, minDuration: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Days/Hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Max Duration</label>
                <input
                  type="number"
                  value={formData.maxDuration}
                  onChange={(e) => setFormData({ ...formData, maxDuration: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Days/Hours"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-slate-300"
                />
                Active
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={formData.isGlobal}
                  onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked, vehicleIds: e.target.checked ? [] : formData.vehicleIds })}
                  className="rounded border-slate-300"
                />
                Available for all vehicles
              </label>
            </div>

            {/* Vehicle Selection - Only show when not global */}
            {!formData.isGlobal && vehicles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Vehicles ({formData.vehicleIds.length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  <div className="grid grid-cols-2 gap-2">
                    {vehicles.map((vehicle) => (
                      <button
                        key={vehicle.id}
                        type="button"
                        onClick={() => handleVehicleToggle(vehicle.id)}
                        className={`text-left rounded-lg p-2 text-sm transition ${
                          formData.vehicleIds.includes(vehicle.id)
                            ? "bg-blue-600 text-white"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        <p className="font-medium">{vehicle.name}</p>
                        <p className={`text-xs ${formData.vehicleIds.includes(vehicle.id) ? "text-blue-200" : "text-slate-500"}`}>
                          {vehicle.brand} {vehicle.model}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
                {formData.vehicleIds.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Please select at least one vehicle for this package
                  </p>
                )}
              </div>
            )}

            {policies.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Attached Policies</label>
                <div className="flex flex-wrap gap-2">
                  {policies.map((policy) => (
                    <button
                      key={policy.id}
                      type="button"
                      onClick={() => handlePolicyToggle(policy.id)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                        formData.policyIds.includes(policy.id)
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {policy.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </form>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Saving..." : pkg ? "Update Package" : "Create Package"}
          </button>
        </div>
      </div>
    </div>
  );
}
