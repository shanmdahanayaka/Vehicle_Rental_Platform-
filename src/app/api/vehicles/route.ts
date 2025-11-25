import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const location = searchParams.get("location");
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const available = searchParams.get("available");

    const where: Record<string, unknown> = {};

    if (type) where.type = type;
    if (location) where.location = { contains: location };
    if (available !== null) where.available = available === "true";
    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) (where.pricePerDay as Record<string, unknown>).gte = parseFloat(minPrice);
      if (maxPrice) (where.pricePerDay as Record<string, unknown>).lte = parseFloat(maxPrice);
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        reviews: {
          select: {
            rating: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const vehiclesWithRating = vehicles.map((vehicle) => {
      const avgRating =
        vehicle.reviews.length > 0
          ? vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
            vehicle.reviews.length
          : 0;
      return {
        ...vehicle,
        avgRating,
        reviewCount: vehicle.reviews.length,
      };
    });

    return NextResponse.json(vehiclesWithRating);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    const vehicle = await prisma.vehicle.create({
      data: {
        name: data.name,
        brand: data.brand,
        model: data.model,
        year: data.year,
        type: data.type,
        transmission: data.transmission,
        fuelType: data.fuelType,
        seats: data.seats,
        pricePerDay: data.pricePerDay,
        description: data.description,
        images: JSON.stringify(data.images || []),
        location: data.location,
        available: data.available ?? true,
        featured: data.featured ?? false,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error("Error creating vehicle:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
