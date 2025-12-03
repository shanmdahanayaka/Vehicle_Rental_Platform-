import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/invoices/[id] - Get specific invoice for user
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        booking: {
          include: {
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
                type: true,
                transmission: true,
                fuelType: true,
                pricePerDay: true,
                images: true,
              },
            },
            packages: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            documents: {
              select: {
                id: true,
                type: true,
                title: true,
                fileUrl: true,
                stage: true,
                createdAt: true,
              },
              orderBy: { createdAt: "desc" },
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

    // Verify user owns this invoice
    if (invoice.booking.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Format decimal values
    const formattedInvoice = {
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
      // Package invoice fields
      isPackageInvoice: invoice.isPackageInvoice,
      packageName: invoice.packageName,
      packageType: invoice.packageType,
      packageBasePrice: invoice.packageBasePrice ? Number(invoice.packageBasePrice) : null,
      vehiclePackagePrice: invoice.vehiclePackagePrice ? Number(invoice.vehiclePackagePrice) : null,
      customCostsDetails: invoice.customCostsDetails,
      useFlatVehicleRate: invoice.useFlatVehicleRate,
      booking: {
        ...invoice.booking,
        totalPrice: Number(invoice.booking.totalPrice),
        advanceAmount: invoice.booking.advanceAmount ? Number(invoice.booking.advanceAmount) : null,
        extraMileageCost: invoice.booking.extraMileageCost ? Number(invoice.booking.extraMileageCost) : null,
        fuelCharge: invoice.booking.fuelCharge ? Number(invoice.booking.fuelCharge) : null,
        damageCharge: invoice.booking.damageCharge ? Number(invoice.booking.damageCharge) : null,
        lateReturnCharge: invoice.booking.lateReturnCharge ? Number(invoice.booking.lateReturnCharge) : null,
        otherCharges: invoice.booking.otherCharges ? Number(invoice.booking.otherCharges) : null,
        discountAmount: invoice.booking.discountAmount ? Number(invoice.booking.discountAmount) : null,
        finalAmount: invoice.booking.finalAmount ? Number(invoice.booking.finalAmount) : null,
        balanceDue: invoice.booking.balanceDue ? Number(invoice.booking.balanceDue) : null,
        vehicle: {
          ...invoice.booking.vehicle,
          pricePerDay: Number(invoice.booking.vehicle.pricePerDay),
        },
        packages: invoice.booking.packages.map((bp) => ({
          ...bp,
          price: Number(bp.price),
        })),
      },
      payments: invoice.payments.map((p) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };

    return NextResponse.json(formattedInvoice);
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}
