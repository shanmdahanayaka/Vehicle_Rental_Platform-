import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

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
        images: data.images || "[]",
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
