"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface VehicleSortDropdownProps {
  currentSort: string;
}

export default function VehicleSortDropdown({
  currentSort,
}: VehicleSortDropdownProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("sort", e.target.value);
    router.push(`/vehicles?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-600">Sort by:</label>
      <select
        name="sort"
        value={currentSort}
        onChange={handleSortChange}
        className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
      >
        <option value="newest">Newest First</option>
        <option value="price_asc">Price: Low to High</option>
        <option value="price_desc">Price: High to Low</option>
        <option value="popular">Most Popular</option>
      </select>
    </div>
  );
}
