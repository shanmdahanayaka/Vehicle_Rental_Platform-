import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/documents - Get user's documents from all bookings
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get("bookingId");
    const type = searchParams.get("type");
    const stage = searchParams.get("stage");

    // Build where clause - only documents from user's bookings
    const where: Record<string, unknown> = {
      booking: {
        userId: session.user.id,
      },
    };

    if (bookingId) {
      where.bookingId = bookingId;
    }

    if (type) {
      where.type = type;
    }

    if (stage) {
      where.stage = stage;
    }

    const documents = await prisma.bookingDocument.findMany({
      where,
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            vehicle: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 }
    );
  }
}
