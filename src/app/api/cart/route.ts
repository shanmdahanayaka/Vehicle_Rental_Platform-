import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/cart - Get user's cart items
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cartItems = await prisma.cartItem.findMany({
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

    // Transform data with pricing calculation
    const itemsWithPricing = cartItems.map((item) => {
      const days = Math.ceil(
        (new Date(item.endDate).getTime() - new Date(item.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      const pricePerDay = Number(item.vehicle.pricePerDay);
      const totalPrice = pricePerDay * days;
      const avgRating =
        item.vehicle.reviews.length > 0
          ? item.vehicle.reviews.reduce((sum, r) => sum + r.rating, 0) /
            item.vehicle.reviews.length
          : 0;

      return {
        id: item.id,
        startDate: item.startDate,
        endDate: item.endDate,
        pickupLocation: item.pickupLocation,
        dropoffLocation: item.dropoffLocation,
        days,
        totalPrice,
        createdAt: item.createdAt,
        vehicle: {
          ...item.vehicle,
          pricePerDay,
          avgRating,
          reviewCount: item.vehicle.reviews.length,
        },
      };
    });

    // Calculate cart totals
    const cartTotal = itemsWithPricing.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    );

    return NextResponse.json({
      items: itemsWithPricing,
      itemCount: itemsWithPricing.length,
      cartTotal,
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { error: "Failed to fetch cart" },
      { status: 500 }
    );
  }
}

// POST /api/cart - Add vehicle to cart
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { vehicleId, startDate, endDate, pickupLocation, dropoffLocation } =
      await request.json();

    // Validate required fields
    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Vehicle ID, start date, and end date are required" },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
    }

    if (!vehicle.available) {
      return NextResponse.json(
        { error: "Vehicle is not available" },
        { status: 400 }
      );
    }

    // Check if already in cart
    const existing = await prisma.cartItem.findUnique({
      where: {
        userId_vehicleId: {
          userId: session.user.id,
          vehicleId,
        },
      },
    });

    if (existing) {
      // Update existing cart item
      const updated = await prisma.cartItem.update({
        where: { id: existing.id },
        data: {
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          pickupLocation: pickupLocation || vehicle.location,
          dropoffLocation: dropoffLocation || vehicle.location,
        },
        include: { vehicle: true },
      });
      return NextResponse.json(updated);
    }

    // Create new cart item
    const cartItem = await prisma.cartItem.create({
      data: {
        userId: session.user.id,
        vehicleId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        pickupLocation: pickupLocation || vehicle.location,
        dropoffLocation: dropoffLocation || vehicle.location,
      },
      include: { vehicle: true },
    });

    return NextResponse.json(cartItem, { status: 201 });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { error: "Failed to add to cart" },
      { status: 500 }
    );
  }
}

// DELETE /api/cart - Remove item from cart
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const vehicleId = searchParams.get("vehicleId");

    if (!itemId && !vehicleId) {
      return NextResponse.json(
        { error: "Item ID or Vehicle ID is required" },
        { status: 400 }
      );
    }

    if (itemId) {
      // Delete by item ID
      const item = await prisma.cartItem.findFirst({
        where: { id: itemId, userId: session.user.id },
      });

      if (!item) {
        return NextResponse.json(
          { error: "Cart item not found" },
          { status: 404 }
        );
      }

      await prisma.cartItem.delete({ where: { id: itemId } });
    } else if (vehicleId) {
      // Delete by vehicle ID
      const item = await prisma.cartItem.findUnique({
        where: {
          userId_vehicleId: {
            userId: session.user.id,
            vehicleId,
          },
        },
      });

      if (!item) {
        return NextResponse.json(
          { error: "Cart item not found" },
          { status: 404 }
        );
      }

      await prisma.cartItem.delete({ where: { id: item.id } });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing from cart:", error);
    return NextResponse.json(
      { error: "Failed to remove from cart" },
      { status: 500 }
    );
  }
}

// PUT /api/cart - Update cart item
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemId, startDate, endDate, pickupLocation, dropoffLocation } =
      await request.json();

    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }

    // Verify ownership
    const item = await prisma.cartItem.findFirst({
      where: { id: itemId, userId: session.user.id },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Cart item not found" },
        { status: 404 }
      );
    }

    const updated = await prisma.cartItem.update({
      where: { id: itemId },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(pickupLocation && { pickupLocation }),
        ...(dropoffLocation && { dropoffLocation }),
      },
      include: { vehicle: true },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating cart:", error);
    return NextResponse.json(
      { error: "Failed to update cart" },
      { status: 500 }
    );
  }
}
