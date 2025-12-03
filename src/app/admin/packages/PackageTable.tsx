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
  pricePerDay: number;
}

interface CustomCost {
  id?: string;
  name: string;
  description?: string;
  price: number;
  isOptional: boolean;
  sortOrder: number;
}

interface VehiclePackage {
  vehicleId: string;
  customPrice: number | null;
  vehicle: Vehicle;
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
  images: string | null;
  videoUrl: string | null;
  policies: { policy: Policy }[];
  vehiclePackages: VehiclePackage[];
  customCosts: CustomCost[];
  _count: {
    vehiclePackages: number;
    bookings: number;
    customCosts: number;
  };
}

const PACKAGE_TYPE_LABELS: Record<PackageType, string> = {
  WEDDING: "Wedding",
  AIRPORT: "Airport Transfer",
  TOURISM: "Tourism",
  CORPORATE: "Corporate",
  SELF_DRIVE: "Self Drive",
  WITH_DRIVER: "With Driver",
  LONG_TERM: "Long Term",
  EVENT: "Event",
  HONEYMOON: "Honeymoon",
  PILGRIMAGE: "Pilgrimage",
  ADVENTURE: "Adventure",
  CUSTOM: "Custom",
};

const PACKAGE_TYPE_COLORS: Record<PackageType, string> = {
  WEDDING: "bg-pink-100 text-pink-700",
  AIRPORT: "bg-blue-100 text-blue-700",
  TOURISM: "bg-green-100 text-green-700",
  CORPORATE: "bg-slate-100 text-slate-700",
  SELF_DRIVE: "bg-cyan-100 text-cyan-700",
  WITH_DRIVER: "bg-purple-100 text-purple-700",
  LONG_TERM: "bg-indigo-100 text-indigo-700",
  EVENT: "bg-orange-100 text-orange-700",
  HONEYMOON: "bg-rose-100 text-rose-700",
  PILGRIMAGE: "bg-amber-100 text-amber-700",
  ADVENTURE: "bg-emerald-100 text-emerald-700",
  CUSTOM: "bg-gray-100 text-gray-700",
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
                  Custom Costs
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
                  <td colSpan={8} className="px-6 py-12 text-center">
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
                      {pkg.customCosts && pkg.customCosts.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {pkg.customCosts.slice(0, 2).map((cost, idx) => (
                            <span key={cost.id || idx} className="inline-flex items-center gap-1 rounded bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
                              {cost.name}
                              <span className="font-medium">{formatCurrency(cost.price)}</span>
                            </span>
                          ))}
                          {pkg.customCosts.length > 2 && (
                            <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                              +{pkg.customCosts.length - 2} more
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">No custom costs</span>
                      )}
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
                  <td colSpan={8} className="px-6 py-12 text-center">
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
  // Parse images from JSON string
  const parseImages = (images: string | null): string[] => {
    if (!images) return [];
    try {
      return JSON.parse(images);
    } catch {
      return [];
    }
  };

  const [formData, setFormData] = useState({
    name: pkg?.name || "",
    description: pkg?.description || "",
    type: pkg?.type || "CUSTOM",
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
    images: parseImages(pkg?.images || null),
    videoUrl: pkg?.videoUrl || "",
    policyIds: pkg?.policies.map((pp) => pp.policy.id) || [],
    vehiclePackages: pkg?.vehiclePackages?.map((vp) => ({
      vehicleId: vp.vehicleId || vp.vehicle.id,
      customPrice: vp.customPrice?.toString() || "",
    })) || [],
    customCosts: pkg?.customCosts?.map((cost) => ({
      id: cost.id,
      name: cost.name,
      description: cost.description || "",
      price: cost.price?.toString() || "",
      isOptional: cost.isOptional ?? false,
    })) || [],
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const url = pkg ? `/api/admin/packages/${pkg.id}` : "/api/admin/packages";
      const method = pkg ? "PATCH" : "POST";

      // Format data for API
      const submitData = {
        ...formData,
        // Include images array (will be JSON stringified on server)
        images: formData.images.length > 0 ? formData.images : null,
        // Include video URL
        videoUrl: formData.videoUrl || null,
        // Format custom costs - filter out empty entries
        customCosts: formData.customCosts
          .filter((cost) => cost.name.trim() && cost.price)
          .map((cost, index) => ({
            ...(cost.id ? { id: cost.id } : {}),
            name: cost.name,
            description: cost.description || null,
            price: parseFloat(cost.price) || 0,
            isOptional: cost.isOptional,
            sortOrder: index,
          })),
        // Format vehicle packages
        vehiclePackages: formData.vehiclePackages.map((vp) => ({
          vehicleId: vp.vehicleId,
          customPrice: vp.customPrice ? parseFloat(vp.customPrice) : null,
        })),
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
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

  // Vehicle package handlers
  const handleVehicleToggle = (vehicleId: string) => {
    setFormData((prev) => {
      const exists = prev.vehiclePackages.some((vp) => vp.vehicleId === vehicleId);
      if (exists) {
        return {
          ...prev,
          vehiclePackages: prev.vehiclePackages.filter((vp) => vp.vehicleId !== vehicleId),
        };
      } else {
        return {
          ...prev,
          vehiclePackages: [...prev.vehiclePackages, { vehicleId, customPrice: "" }],
        };
      }
    });
  };

  const handleVehicleCustomPrice = (vehicleId: string, price: string) => {
    setFormData((prev) => ({
      ...prev,
      vehiclePackages: prev.vehiclePackages.map((vp) =>
        vp.vehicleId === vehicleId ? { ...vp, customPrice: price } : vp
      ),
    }));
  };

  // Custom cost handlers
  const addCustomCost = () => {
    setFormData((prev) => ({
      ...prev,
      customCosts: [...prev.customCosts, { id: undefined, name: "", description: "", price: "", isOptional: false }],
    }));
  };

  const removeCustomCost = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      customCosts: prev.customCosts.filter((_, i) => i !== index),
    }));
  };

  const updateCustomCost = (index: number, field: string, value: string | boolean) => {
    setFormData((prev) => ({
      ...prev,
      customCosts: prev.customCosts.map((cost, i) =>
        i === index ? { ...cost, [field]: value } : cost
      ),
    }));
  };

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Check if adding more would exceed max
    if (formData.images.length + files.length > 4) {
      setError("Maximum 4 images allowed");
      return;
    }

    setImageUploading(true);
    setError("");

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formDataUpload = new FormData();
        formDataUpload.append("file", file);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formDataUpload,
        });

        if (!res.ok) throw new Error("Upload failed");
        const data = await res.json();
        return data.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls].slice(0, 4),
      }));
    } catch (err) {
      console.error("Error uploading images:", err);
      setError("Failed to upload images");
    }

    setImageUploading(false);
    e.target.value = "";
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Extract YouTube video ID for thumbnail
  const getYouTubeVideoId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/);
    return match ? match[1] : null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl bg-white shadow-xl flex flex-col">
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

            {/* Package Images */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Package Images (max 4)
              </label>
              <div className="flex flex-wrap gap-3">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={url}
                      alt={`Package ${index + 1}`}
                      className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition flex items-center justify-center"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
                {formData.images.length < 4 && (
                  <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                    {imageUploading ? (
                      <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <>
                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-xs text-slate-500 mt-1">Add Image</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={imageUploading}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* YouTube Video URL */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">YouTube Video URL</label>
              <input
                type="url"
                value={formData.videoUrl}
                onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {formData.videoUrl && getYouTubeVideoId(formData.videoUrl) && (
                <div className="mt-2 flex items-center gap-3">
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-slate-100">
                    <img
                      src={`https://img.youtube.com/vi/${getYouTubeVideoId(formData.videoUrl)}/mqdefault.jpg`}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  <span className="text-xs text-green-600">Valid YouTube URL</span>
                </div>
              )}
              {formData.videoUrl && !getYouTubeVideoId(formData.videoUrl) && (
                <p className="text-xs text-amber-600 mt-1">Please enter a valid YouTube URL</p>
              )}
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
                  onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked, vehiclePackages: e.target.checked ? [] : formData.vehiclePackages })}
                  className="rounded border-slate-300"
                />
                Available for all vehicles
              </label>
            </div>

            {/* Vehicle Selection with Custom Pricing - Only show when not global */}
            {!formData.isGlobal && vehicles.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Vehicles & Set Package Pricing ({formData.vehiclePackages.length} selected)
                </label>
                <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
                  <div className="space-y-2">
                    {vehicles.map((vehicle) => {
                      const isSelected = formData.vehiclePackages.some((vp) => vp.vehicleId === vehicle.id);
                      const vehiclePkg = formData.vehiclePackages.find((vp) => vp.vehicleId === vehicle.id);

                      return (
                        <div
                          key={vehicle.id}
                          className={`rounded-lg p-3 transition border ${
                            isSelected
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-200 bg-slate-50 hover:bg-slate-100"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => handleVehicleToggle(vehicle.id)}
                              className="flex items-center gap-3 text-left flex-1"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                className="rounded border-slate-300"
                              />
                              <div>
                                <p className="font-medium text-slate-900">{vehicle.name}</p>
                                <p className="text-xs text-slate-500">
                                  {vehicle.brand} {vehicle.model} - Default: {formatCurrency(vehicle.pricePerDay)}/day
                                </p>
                              </div>
                            </button>
                            {isSelected && (
                              <div className="flex items-center gap-2 ml-4">
                                <label className="text-xs text-slate-600 whitespace-nowrap">Package Price:</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">{currency.symbol}</span>
                                  <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Default"
                                    value={vehiclePkg?.customPrice || ""}
                                    onChange={(e) => handleVehicleCustomPrice(vehicle.id, e.target.value)}
                                    className="w-28 rounded border border-slate-300 pl-6 pr-2 py-1 text-sm focus:border-blue-500 focus:outline-none"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {formData.vehiclePackages.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Please select at least one vehicle for this package
                  </p>
                )}
              </div>
            )}

            {/* Custom Costs Section */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  Custom Costs ({formData.customCosts.length})
                </label>
                <button
                  type="button"
                  onClick={addCustomCost}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Cost
                </button>
              </div>

              {formData.customCosts.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4 border border-dashed border-slate-300 rounded-lg">
                  No custom costs. Click &quot;Add Cost&quot; to add items like Driver Fee, Decoration, etc.
                </p>
              ) : (
                <div className="space-y-3">
                  {formData.customCosts.map((cost, index) => (
                    <div key={index} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-1 grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Name *</label>
                            <input
                              type="text"
                              placeholder="e.g., Driver Fee"
                              value={cost.name}
                              onChange={(e) => updateCustomCost(index, "name", e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Price ({currency.symbol}) *</label>
                            <input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              value={cost.price}
                              onChange={(e) => updateCustomCost(index, "price", e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-500 mb-1">Description</label>
                            <input
                              type="text"
                              placeholder="Optional"
                              value={cost.description}
                              onChange={(e) => updateCustomCost(index, "description", e.target.value)}
                              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
                            />
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 pt-5">
                          <label className="flex items-center gap-1.5 text-xs">
                            <input
                              type="checkbox"
                              checked={cost.isOptional}
                              onChange={(e) => updateCustomCost(index, "isOptional", e.target.checked)}
                              className="rounded border-slate-300"
                            />
                            Optional
                          </label>
                          <button
                            type="button"
                            onClick={() => removeCustomCost(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove cost"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

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
