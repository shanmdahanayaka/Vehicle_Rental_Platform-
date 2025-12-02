import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification } from "@/lib/notifications";

// GET /api/admin/invoices/[id] - Get invoice details
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: {
          select: {
            id: true,
            startDate: true,
            endDate: true,
            pickupLocation: true,
            dropoffLocation: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
              },
            },
            vehicle: {
              select: {
                id: true,
                name: true,
                brand: true,
                model: true,
                year: true,
                images: true,
              },
            },
            packages: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          orderBy: { paidAt: "desc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/invoices/[id] - Update invoice
export async function PATCH(
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

    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Don't allow updates to paid invoices
    if (invoice.status === "PAID" && body.status !== "PAID") {
      return NextResponse.json(
        { error: "Cannot modify a paid invoice" },
        { status: 400 }
      );
    }

    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: body,
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    return NextResponse.json(updatedInvoice);
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/admin/invoices/[id] - Actions on invoice (send, etc.)
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
    const { action } = body;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
            user: true,
            vehicle: true,
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    switch (action) {
      case "send-email": {
        // In production, integrate with email service (SendGrid, Nodemailer, etc.)
        // For now, we'll just mark it as sent and send a notification

        await prisma.invoice.update({
          where: { id },
          data: {
            sentViaEmail: true,
            emailSentAt: new Date(),
          },
        });

        // Send in-app notification
        await sendNotification({
          userId: invoice.booking.userId,
          type: "SYSTEM",
          title: "Invoice Received",
          message: `Your invoice ${invoice.invoiceNumber} for ${invoice.booking.vehicle.brand} ${invoice.booking.vehicle.model} rental has been sent to your email.`,
          data: {
            invoiceId: invoice.id,
            bookingId: invoice.bookingId,
          },
        });

        return NextResponse.json({
          success: true,
          message: "Invoice sent via email",
        });
      }

      case "send-whatsapp": {
        // Generate WhatsApp message link
        const phone = invoice.booking.user.phone?.replace(/\D/g, "");
        if (!phone) {
          return NextResponse.json(
            { error: "Customer phone number not available" },
            { status: 400 }
          );
        }

        const message = encodeURIComponent(
          `Hello ${invoice.booking.user.name},\n\n` +
            `Your invoice ${invoice.invoiceNumber} is ready.\n\n` +
            `Vehicle: ${invoice.booking.vehicle.brand} ${invoice.booking.vehicle.model}\n` +
            `Total Amount: ${Number(invoice.totalAmount).toLocaleString()}\n` +
            `Balance Due: ${Number(invoice.balanceDue).toLocaleString()}\n\n` +
            `Thank you for your business!`
        );

        const whatsappUrl = `https://wa.me/${phone}?text=${message}`;

        await prisma.invoice.update({
          where: { id },
          data: {
            sentViaWhatsApp: true,
            whatsAppSentAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          whatsappUrl,
          message: "WhatsApp link generated",
        });
      }

      case "mark-sent": {
        await prisma.invoice.update({
          where: { id },
          data: {
            status: "ISSUED",
            issuedAt: new Date(),
          },
        });

        return NextResponse.json({
          success: true,
          message: "Invoice marked as sent",
        });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Error processing invoice action:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
