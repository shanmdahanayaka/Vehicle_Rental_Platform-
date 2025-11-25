"use client";

import { useState, useEffect } from "react";

interface Policy {
  id: string;
  name: string;
  title: string;
  content: string;
  summary: string | null;
  category: string;
  isActive: boolean;
  isRequired: boolean;
  sortOrder: number;
  _count: {
    packagePolicies: number;
    vehiclePolicies: number;
  };
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
  type: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  cancellation: "Cancellation",
  insurance: "Insurance",
  fuel: "Fuel Policy",
  damage: "Damage Policy",
  general: "General Terms",
  payment: "Payment",
  mileage: "Mileage",
};

const CATEGORY_COLORS: Record<string, string> = {
  cancellation: "bg-red-100 text-red-700",
  insurance: "bg-blue-100 text-blue-700",
  fuel: "bg-amber-100 text-amber-700",
  damage: "bg-orange-100 text-orange-700",
  general: "bg-slate-100 text-slate-700",
  payment: "bg-green-100 text-green-700",
  mileage: "bg-purple-100 text-purple-700",
};

export default function PolicyTable() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [showAttachModal, setShowAttachModal] = useState(false);
  const [attachingPolicy, setAttachingPolicy] = useState<Policy | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => {
    fetchPolicies();
  }, [showInactive]);

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/policies?includeInactive=${showInactive}`);
      if (res.ok) {
        const data = await res.json();
        setPolicies(data);
      }
    } catch (error) {
      console.error("Error fetching policies:", error);
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this policy?")) return;

    try {
      const res = await fetch(`/api/admin/policies/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchPolicies();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete policy");
      }
    } catch (error) {
      console.error("Error deleting policy:", error);
      alert("Failed to delete policy");
    }
  };

  const handleToggleActive = async (policy: Policy) => {
    try {
      const res = await fetch(`/api/admin/policies/${policy.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !policy.isActive }),
      });
      if (res.ok) {
        fetchPolicies();
      }
    } catch (error) {
      console.error("Error updating policy:", error);
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
          Show inactive policies
        </label>
        <button
          onClick={() => {
            setEditingPolicy(null);
            setShowModal(true);
          }}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition"
        >
          + Add Policy
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Policy
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Category
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Attachments
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Required
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    </div>
                  </td>
                </tr>
              ) : policies.length > 0 ? (
                policies.map((policy) => (
                  <tr key={policy.id} className={`hover:bg-slate-50 transition ${!policy.isActive ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{policy.title}</p>
                        <p className="text-xs text-slate-500">{policy.name}</p>
                        {policy.summary && (
                          <p className="text-xs text-slate-400 truncate max-w-xs mt-1">{policy.summary}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${CATEGORY_COLORS[policy.category] || 'bg-slate-100 text-slate-700'}`}>
                        {CATEGORY_LABELS[policy.category] || policy.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="flex gap-2">
                        <span className="text-purple-600">{policy._count.packagePolicies} packages</span>
                        <span className="text-blue-600">{policy._count.vehiclePolicies} vehicles</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${policy.isRequired ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {policy.isRequired ? "Required" : "Optional"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleToggleActive(policy)}
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${policy.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                      >
                        {policy.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingPolicy(policy);
                            setShowModal(true);
                          }}
                          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            setAttachingPolicy(policy);
                            setShowAttachModal(true);
                          }}
                          className="rounded-lg bg-purple-100 px-3 py-1.5 text-xs font-medium text-purple-700 hover:bg-purple-200 transition"
                        >
                          Attach
                        </button>
                        <button
                          onClick={() => handleDelete(policy.id)}
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
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500">No policies found. Create your first policy!</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <PolicyModal
          policy={editingPolicy}
          onClose={() => {
            setShowModal(false);
            setEditingPolicy(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingPolicy(null);
            fetchPolicies();
          }}
        />
      )}

      {/* Attach Modal */}
      {showAttachModal && attachingPolicy && (
        <AttachPolicyModal
          policy={attachingPolicy}
          onClose={() => {
            setShowAttachModal(false);
            setAttachingPolicy(null);
          }}
          onSave={() => {
            setShowAttachModal(false);
            setAttachingPolicy(null);
            fetchPolicies();
          }}
        />
      )}
    </div>
  );
}

// Policy Modal Component
function PolicyModal({
  policy,
  onClose,
  onSave,
}: {
  policy: Policy | null;
  onClose: () => void;
  onSave: () => void;
}) {
  const [formData, setFormData] = useState({
    name: policy?.name || "",
    title: policy?.title || "",
    content: policy?.content || "",
    summary: policy?.summary || "",
    category: policy?.category || "general",
    isActive: policy?.isActive ?? true,
    isRequired: policy?.isRequired ?? false,
    sortOrder: policy?.sortOrder?.toString() || "0",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = policy ? `/api/admin/policies/${policy.id}` : "/api/admin/policies";
      const method = policy ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sortOrder: parseInt(formData.sortOrder),
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to save policy");
      }
    } catch (err) {
      console.error("Error saving policy:", err);
      setError("Failed to save policy");
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            {policy ? "Edit Policy" : "Create Policy"}
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Name (Internal) *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="e.g., cancellation-policy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                <select
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title (Display) *</label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Cancellation Policy"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Summary (Short description)</label>
              <textarea
                value={formData.summary}
                onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                rows={2}
                placeholder="Brief summary shown on vehicle/package cards..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Content *</label>
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none font-mono"
                rows={8}
                placeholder="Full policy content (supports HTML/Markdown)..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Sort Order</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div className="flex items-end gap-6">
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
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Must Accept
                </label>
              </div>
            </div>
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
            {loading ? "Saving..." : policy ? "Update Policy" : "Create Policy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Attach Policy Modal
function AttachPolicyModal({
  policy,
  onClose,
  onSave,
}: {
  policy: Policy;
  onClose: () => void;
  onSave: () => void;
}) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [packages, setPackages] = useState<Package[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch policy details with current attachments
      const policyRes = await fetch(`/api/admin/policies/${policy.id}`);
      if (policyRes.ok) {
        const policyData = await policyRes.json();
        setSelectedVehicles(policyData.vehiclePolicies.map((vp: { vehicle: Vehicle }) => vp.vehicle.id));
        setSelectedPackages(policyData.packagePolicies.map((pp: { package: Package }) => pp.package.id));
      }

      // Fetch all vehicles
      const vehiclesRes = await fetch("/api/vehicles");
      if (vehiclesRes.ok) {
        const vehiclesData = await vehiclesRes.json();
        setVehicles(Array.isArray(vehiclesData) ? vehiclesData : vehiclesData.vehicles || []);
      }

      // Fetch all packages
      const packagesRes = await fetch("/api/admin/packages?includeInactive=true");
      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/policies/${policy.id}/attach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleIds: selectedVehicles,
          packageIds: selectedPackages,
        }),
      });

      if (res.ok) {
        onSave();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to attach policy");
      }
    } catch (error) {
      console.error("Error attaching policy:", error);
      alert("Failed to attach policy");
    }
    setSaving(false);
  };

  const toggleVehicle = (id: string) => {
    setSelectedVehicles((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    );
  };

  const togglePackage = (id: string) => {
    setSelectedPackages((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-900">
            Attach Policy: {policy.title}
          </h2>
          <p className="text-sm text-slate-500">
            Select vehicles and packages to attach this policy to
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Packages Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Packages ({selectedPackages.length} selected)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {packages.map((pkg) => (
                    <button
                      key={pkg.id}
                      onClick={() => togglePackage(pkg.id)}
                      className={`rounded-lg p-3 text-left text-sm transition ${
                        selectedPackages.includes(pkg.id)
                          ? "bg-purple-100 border-2 border-purple-500"
                          : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                      }`}
                    >
                      <p className="font-medium">{pkg.name}</p>
                      <p className="text-xs text-slate-500">{pkg.type}</p>
                    </button>
                  ))}
                  {packages.length === 0 && (
                    <p className="text-slate-500 col-span-full">No packages available</p>
                  )}
                </div>
              </div>

              {/* Vehicles Section */}
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-3">Vehicles ({selectedVehicles.length} selected)</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {vehicles.map((vehicle) => (
                    <button
                      key={vehicle.id}
                      onClick={() => toggleVehicle(vehicle.id)}
                      className={`rounded-lg p-3 text-left text-sm transition ${
                        selectedVehicles.includes(vehicle.id)
                          ? "bg-blue-100 border-2 border-blue-500"
                          : "bg-slate-50 border-2 border-transparent hover:bg-slate-100"
                      }`}
                    >
                      <p className="font-medium">{vehicle.name}</p>
                      <p className="text-xs text-slate-500">{vehicle.brand} {vehicle.model}</p>
                    </button>
                  ))}
                  {vehicles.length === 0 && (
                    <p className="text-slate-500 col-span-full">No vehicles available</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Attachments"}
          </button>
        </div>
      </div>
    </div>
  );
}
