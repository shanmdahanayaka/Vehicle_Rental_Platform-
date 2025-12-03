import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/invoices - Get user's invoices
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build where clause - only user's invoices
    const where: Record<string, unknown> = {
      booking: {
        userId: session.user.id,
      },
    };

    if (status) {
      where.status = status;
    }

    // Get invoices with pagination
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          booking: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              pickupLocation: true,
              dropoffLocation: true,
              vehicle: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  model: true,
                  images: true,
                },
              },
            },
          },
          payments: {
            select: {
              id: true,
              amount: true,
              method: true,
              reference: true,
              paidAt: true,
            },
            orderBy: { paidAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Format response - convert all Decimal fields to numbers
    const formattedInvoices = invoices.map((invoice) => ({
      ...invoice,
      dailyRate: Number(invoice.dailyRate),
      rentalAmount: Number(invoice.rentalAmount),
      totalAmount: Number(invoice.totalAmount),
      subtotal: Number(invoice.subtotal),
      taxAmount: invoice.taxAmount ? Number(invoice.taxAmount) : null,
      taxRate: invoice.taxRate ? Number(invoice.taxRate) : null,
      discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : null,
      amountPaid: Number(invoice.amountPaid),
      balanceDue: Number(invoice.balanceDue),
      advancePaid: invoice.advancePaid ? Number(invoice.advancePaid) : null,
      packageCharges: invoice.packageCharges ? Number(invoice.packageCharges) : null,
      extraMileageCost: invoice.extraMileageCost ? Number(invoice.extraMileageCost) : null,
      extraMileageRate: invoice.extraMileageRate ? Number(invoice.extraMileageRate) : null,
      fuelCharge: invoice.fuelCharge ? Number(invoice.fuelCharge) : null,
      damageCharge: invoice.damageCharge ? Number(invoice.damageCharge) : null,
      lateReturnCharge: invoice.lateReturnCharge ? Number(invoice.lateReturnCharge) : null,
      otherCharges: invoice.otherCharges ? Number(invoice.otherCharges) : null,
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    }));

    return NextResponse.json({
      invoices: formattedInvoices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}
