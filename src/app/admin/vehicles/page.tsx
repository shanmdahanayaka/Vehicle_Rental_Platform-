import { prisma } from "@/lib/prisma";
import VehicleTable from "./VehicleTable";

async function getVehicles() {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      reviews: { select: { rating: true } },
      _count: { select: { bookings: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return vehicles.map((vehicle) => ({
    ...vehicle,
    pricePerDay: Number(vehicle.pricePerDay),
    avgRating:
      vehicle.reviews.length > 0
        ? vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) / vehicle.reviews.length
        : 0,
    reviewCount: vehicle.reviews.length,
    bookingCount: vehicle._count.bookings,
  }));
}

export default async function AdminVehiclesPage() {
  const vehicles = await getVehicles();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vehicles</h1>
          <p className="text-slate-500">Manage your vehicle inventory</p>
        </div>
      </div>

      {/* Vehicle Table */}
      <VehicleTable initialVehicles={vehicles} />
    </div>
  );
}
