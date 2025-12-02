import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

// GET /api/admin/bookings/[id]/documents - Get all documents for a booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const documents = await prisma.bookingDocument.findMany({
      where: { bookingId: id },
      orderBy: [{ stage: "asc" }, { createdAt: "desc" }],
    });

    // Group documents by stage
    const grouped = {
      CONFIRMATION: documents.filter((d) => d.stage === "CONFIRMATION"),
      COLLECTION: documents.filter((d) => d.stage === "COLLECTION"),
      RETURN: documents.filter((d) => d.stage === "RETURN"),
    };

    return NextResponse.json({
      documents,
      grouped,
      count: documents.length,
    });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/bookings/[id]/documents - Add a document to booking
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.type || !body.title || !body.fileUrl || !body.fileName) {
      return NextResponse.json(
        { error: "Type, title, fileUrl, and fileName are required" },
        { status: 400 }
      );
    }

    // Check if booking exists
    const booking = await prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Determine stage based on booking status
    let stage = body.stage;
    if (!stage) {
      switch (booking.status) {
        case "PENDING":
        case "CONFIRMED":
          stage = "CONFIRMATION";
          break;
        case "COLLECTED":
          stage = "COLLECTION";
          break;
        case "COMPLETED":
        case "INVOICED":
        case "PAID":
          stage = "RETURN";
          break;
        default:
          stage = "CONFIRMATION";
      }
    }

    const document = await prisma.bookingDocument.create({
      data: {
        bookingId: id,
        type: body.type,
        stage,
        title: body.title,
        description: body.description || null,
        fileUrl: body.fileUrl,
        fileName: body.fileName,
        fileSize: body.fileSize || null,
        mimeType: body.mimeType || null,
        uploadedBy: session.user.id,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/bookings/[id]/documents - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session || !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "Document ID is required" },
        { status: 400 }
      );
    }

    // Check if document exists and belongs to the booking
    const { id } = await params;
    const document = await prisma.bookingDocument.findFirst({
      where: {
        id: documentId,
        bookingId: id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await prisma.bookingDocument.delete({
      where: { id: documentId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
