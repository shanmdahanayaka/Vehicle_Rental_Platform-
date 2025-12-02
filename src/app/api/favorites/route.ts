import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/favorites - Get user's favorite vehicles
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: session.user.id },
      include: {
        vehicle: {
          include: {
            reviews: {
              select: { rating: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform data to include average rating
    const favoritesWithRating = favorites.map((fav) => {
      const avgRating =
        fav.vehicle.reviews.length > 0
          ? fav.vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
            fav.vehicle.reviews.length
          : 0;

      return {
        id: fav.id,
        createdAt: fav.createdAt,
        vehicle: {
          ...fav.vehicle,
          pricePerDay: Number(fav.vehicle.pricePerDay),
          avgRating,
          reviewCount: fav.vehicle.reviews.length,
        },
      };
    });

    return NextResponse.json(favoritesWithRating);
  } catch (error) {
    console.error("Error fetching favorites:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorites" },
      { status: 500 }
    );
  }
}

// POST /api/favorites - Add vehicle to favorites
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vehicleId } = await request.json();

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // Check if already favorited
    const existing = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId: session.user.id,
          vehicleId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Vehicle already in favorites" },
        { status: 400 }
      );
    }

    // Create favorite
    const favorite = await prisma.favorite.create({
      data: {
        userId: session.user.id,
        vehicleId,
      },
      include: {
        vehicle: true,
      },
    });

    return NextResponse.json(favorite, { status: 201 });
  } catch (error) {
    console.error("Error adding favorite:", error);
    return NextResponse.json(
      { error: "Failed to add favorite" },
      { status: 500 }
    );
  }
}

// DELETE /api/favorites - Remove vehicle from favorites
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");

    if (!vehicleId) {
      return NextResponse.json(
        { error: "Vehicle ID is required" },
        { status: 400 }
      );
    }

    // Find and delete the favorite
    const favorite = await prisma.favorite.findUnique({
      where: {
        userId_vehicleId: {
          userId: session.user.id,
          vehicleId,
        },
      },
    });

    if (!favorite) {
      return NextResponse.json(
        { error: "Favorite not found" },
        { status: 404 }
      );
    }

    await prisma.favorite.delete({
      where: { id: favorite.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite:", error);
    return NextResponse.json(
      { error: "Failed to remove favorite" },
      { status: 500 }
    );
  }
}
