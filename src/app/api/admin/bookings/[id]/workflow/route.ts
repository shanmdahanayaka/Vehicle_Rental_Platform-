import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";
import { mileageConfig, invoiceConfig } from "@/config/site";

// POST /api/admin/bookings/[id]/workflow - Handle booking workflow transitions
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
    const { action, ...data } = body;

    // Get the current booking
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true,
        packages: { include: { package: true } },
        documents: true,
        invoice: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    let updatedBooking;
    let invoice;

    switch (action) {
      // ==================== CONFIRM BOOKING ====================
      case "confirm": {
        if (booking.status !== "PENDING") {
          return NextResponse.json(
            { error: "Booking can only be confirmed from PENDING status" },
            { status: 400 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            status: "CONFIRMED",
            confirmedAt: new Date(),
            confirmedBy: session.user.id,
            advanceAmount: data.advanceAmount ? parseFloat(data.advanceAmount) : null,
            advancePaid: data.advancePaid || false,
            advancePaidAt: data.advancePaid ? new Date() : null,
            advancePaymentMethod: data.advancePaymentMethod || null,
            confirmationNotes: data.confirmationNotes || null,
            // Set default mileage config
            freeMileage: data.freeMileage ?? calculateFreeMileage(booking.startDate, booking.endDate),
            extraMileageRate: data.extraMileageRate ?? mileageConfig.extraMileageRate,
          },
          include: { vehicle: true, user: true },
        });

        // Send notification
        const vehicleName = `${booking.vehicle.brand} ${booking.vehicle.model}`;
        const startDate = new Date(booking.startDate).toLocaleDateString();
        const notification = NotificationTemplates.bookingConfirmed(
          booking.id,
          vehicleName,
          startDate
        );
        await sendNotification({
          userId: booking.userId,
          ...notification,
        });

        break;
      }

      // ==================== VEHICLE COLLECTED ====================
      case "collect": {
        if (booking.status !== "CONFIRMED") {
          return NextResponse.json(
            { error: "Booking must be CONFIRMED before collection" },
            { status: 400 }
          );
        }

        if (!data.collectionOdometer) {
          return NextResponse.json(
            { error: "Collection odometer reading is required" },
            { status: 400 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            status: "COLLECTED",
            collectedAt: new Date(),
            collectionOdometer: parseInt(data.collectionOdometer),
            collectionFuelLevel: data.collectionFuelLevel || "FULL",
            collectionNotes: data.collectionNotes || null,
            collectedBy: session.user.id,
          },
          include: { vehicle: true, user: true },
        });

        // Update vehicle availability
        await prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { available: false },
        });

        break;
      }

      // ==================== VEHICLE RETURNED / COMPLETE ====================
      case "complete": {
        if (booking.status !== "COLLECTED") {
          return NextResponse.json(
            { error: "Booking must be COLLECTED before completion" },
            { status: 400 }
          );
        }

        if (!data.returnOdometer) {
          return NextResponse.json(
            { error: "Return odometer reading is required" },
            { status: 400 }
          );
        }

        const returnOdometer = parseInt(data.returnOdometer);
        const collectionOdometer = booking.collectionOdometer || 0;
        const totalMileage = returnOdometer - collectionOdometer;
        const freeMileage = booking.freeMileage || calculateFreeMileage(booking.startDate, booking.endDate);
        const extraMileage = Math.max(0, totalMileage - freeMileage);
        const extraMileageRate = Number(booking.extraMileageRate) || mileageConfig.extraMileageRate;
        const extraMileageCost = extraMileage * extraMileageRate;

        // Calculate additional charges
        const fuelCharge = data.fuelCharge ? parseFloat(data.fuelCharge) : 0;
        const damageCharge = data.damageCharge ? parseFloat(data.damageCharge) : 0;
        const lateReturnCharge = data.lateReturnCharge ? parseFloat(data.lateReturnCharge) : 0;
        const otherCharges = data.otherCharges ? parseFloat(data.otherCharges) : 0;

        // Calculate final amount
        const baseAmount = Number(booking.totalPrice);
        const totalAdditional = extraMileageCost + fuelCharge + damageCharge + lateReturnCharge + otherCharges;
        const discountAmount = data.discountAmount ? parseFloat(data.discountAmount) : 0;
        const finalAmount = baseAmount + totalAdditional - discountAmount;
        // Only deduct advance if it was actually paid (checkbox was ticked)
        const advanceAmount = booking.advancePaid ? (Number(booking.advanceAmount) || 0) : 0;
        const balanceDue = finalAmount - advanceAmount;

        updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            status: "COMPLETED",
            returnedAt: new Date(),
            returnOdometer,
            returnFuelLevel: data.returnFuelLevel || null,
            returnNotes: data.returnNotes || null,
            returnedBy: session.user.id,
            totalMileage,
            extraMileage,
            extraMileageCost,
            fuelCharge,
            damageCharge,
            lateReturnCharge,
            otherCharges,
            otherChargesNote: data.otherChargesNote || null,
            discountAmount,
            discountReason: data.discountReason || null,
            finalAmount,
            balanceDue,
          },
          include: { vehicle: true, user: true, packages: { include: { package: true } } },
        });

        // Update vehicle availability
        await prisma.vehicle.update({
          where: { id: booking.vehicleId },
          data: { available: true },
        });

        break;
      }

      // ==================== GENERATE INVOICE ====================
      case "generate-invoice": {
        if (booking.status !== "COMPLETED") {
          return NextResponse.json(
            { error: "Booking must be COMPLETED before generating invoice" },
            { status: 400 }
          );
        }

        if (booking.invoice) {
          return NextResponse.json(
            { error: "Invoice already exists for this booking" },
            { status: 400 }
          );
        }

        // Generate invoice number
        const year = new Date().getFullYear();
        const lastInvoice = await prisma.invoice.findFirst({
          where: {
            invoiceNumber: { startsWith: `${invoiceConfig.invoicePrefix}-${year}` },
          },
          orderBy: { createdAt: "desc" },
        });

        let nextNumber = 1;
        if (lastInvoice) {
          const parts = lastInvoice.invoiceNumber.split("-");
          nextNumber = parseInt(parts[2]) + 1;
        }
        const invoiceNumber = `${invoiceConfig.invoicePrefix}-${year}-${String(nextNumber).padStart(6, "0")}`;

        // Calculate rental days based on ACTUAL collection and return dates (not booking dates)
        // collectedAt = when vehicle was actually collected
        // returnedAt = when vehicle was actually returned (just completed)
        const actualStartDate = booking.collectedAt || booking.startDate;
        const actualEndDate = booking.returnedAt || new Date();

        // Calculate days - minimum 1 day
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffMs = new Date(actualEndDate).getTime() - new Date(actualStartDate).getTime();
        const rentalDays = Math.max(1, Math.ceil(diffMs / msPerDay));

        // Calculate package charges
        const packageCharges = booking.packages.reduce(
          (sum, bp) => sum + Number(bp.price),
          0
        );

        // Calculate amounts
        const dailyRate = Number(booking.vehicle.pricePerDay);
        const rentalAmount = dailyRate * rentalDays;
        const subtotal =
          rentalAmount +
          packageCharges +
          Number(booking.extraMileageCost || 0) +
          Number(booking.fuelCharge || 0) +
          Number(booking.damageCharge || 0) +
          Number(booking.lateReturnCharge || 0) +
          Number(booking.otherCharges || 0);

        const discountAmount = Number(booking.discountAmount || 0);
        const taxRate = data.taxRate ?? invoiceConfig.taxRate;
        const taxAmount = taxRate > 0 ? ((subtotal - discountAmount) * taxRate) / 100 : 0;
        const totalAmount = subtotal - discountAmount + taxAmount;
        // Only deduct advance if it was actually paid (checkbox was ticked during confirmation)
        const advancePaid = booking.advancePaid ? (Number(booking.advanceAmount) || 0) : 0;
        const balanceDue = totalAmount - advancePaid;

        invoice = await prisma.invoice.create({
          data: {
            bookingId: id,
            invoiceNumber,
            status: "DRAFT",
            // Store actual rental period dates
            rentalStartDate: actualStartDate,
            rentalEndDate: actualEndDate,
            rentalDays,
            dailyRate,
            rentalAmount,
            collectionOdometer: booking.collectionOdometer,
            returnOdometer: booking.returnOdometer,
            totalMileage: booking.totalMileage,
            freeMileage: booking.freeMileage,
            extraMileage: booking.extraMileage,
            extraMileageRate: booking.extraMileageRate,
            extraMileageCost: booking.extraMileageCost,
            packageCharges: packageCharges > 0 ? packageCharges : null,
            fuelCharge: booking.fuelCharge,
            damageCharge: booking.damageCharge,
            lateReturnCharge: booking.lateReturnCharge,
            otherCharges: booking.otherCharges,
            otherChargesDesc: booking.otherChargesNote,
            subtotal,
            discountAmount: discountAmount > 0 ? discountAmount : null,
            discountReason: booking.discountReason,
            taxRate: taxRate > 0 ? taxRate : null,
            taxAmount: taxAmount > 0 ? taxAmount : null,
            totalAmount,
            advancePaid: advancePaid > 0 ? advancePaid : null,
            balanceDue,
            dueDate: new Date(Date.now() + invoiceConfig.paymentTermsDays * 24 * 60 * 60 * 1000),
            termsAndConditions: invoiceConfig.defaultTerms,
            notes: data.notes || null,
            createdBy: session.user.id,
          },
        });

        // Update booking status
        updatedBooking = await prisma.booking.update({
          where: { id },
          data: { status: "INVOICED" },
          include: { vehicle: true, user: true, invoice: true },
        });

        break;
      }

      // ==================== RECORD PAYMENT ====================
      case "record-payment": {
        if (!booking.invoice) {
          return NextResponse.json(
            { error: "No invoice exists for this booking" },
            { status: 400 }
          );
        }

        if (!data.amount || !data.method) {
          return NextResponse.json(
            { error: "Payment amount and method are required" },
            { status: 400 }
          );
        }

        const paymentAmount = parseFloat(data.amount);

        // Create payment record
        await prisma.invoicePayment.create({
          data: {
            invoiceId: booking.invoice.id,
            amount: paymentAmount,
            method: data.method,
            reference: data.reference || null,
            notes: data.notes || null,
            receivedBy: session.user.id,
            paidAt: new Date(),
          },
        });

        // Update invoice
        const newAmountPaid = Number(booking.invoice.amountPaid) + paymentAmount;
        const newBalanceDue = Number(booking.invoice.totalAmount) - newAmountPaid;
        const isFullyPaid = newBalanceDue <= 0;

        invoice = await prisma.invoice.update({
          where: { id: booking.invoice.id },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: Math.max(0, newBalanceDue),
            status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
            paidAt: isFullyPaid ? new Date() : null,
          },
        });

        // Update booking status if fully paid
        if (isFullyPaid) {
          updatedBooking = await prisma.booking.update({
            where: { id },
            data: { status: "PAID" },
            include: { vehicle: true, user: true, invoice: true },
          });
        } else {
          updatedBooking = await prisma.booking.findUnique({
            where: { id },
            include: { vehicle: true, user: true, invoice: true },
          });
        }

        break;
      }

      // ==================== ISSUE INVOICE ====================
      case "issue-invoice": {
        if (!booking.invoice) {
          return NextResponse.json(
            { error: "No invoice exists for this booking" },
            { status: 400 }
          );
        }

        invoice = await prisma.invoice.update({
          where: { id: booking.invoice.id },
          data: {
            status: "ISSUED",
            issuedAt: new Date(),
          },
        });

        updatedBooking = await prisma.booking.findUnique({
          where: { id },
          include: { vehicle: true, user: true, invoice: true },
        });

        break;
      }

      // ==================== CANCEL BOOKING ====================
      case "cancel": {
        if (["COMPLETED", "INVOICED", "PAID"].includes(booking.status)) {
          return NextResponse.json(
            { error: "Cannot cancel a completed or invoiced booking" },
            { status: 400 }
          );
        }

        updatedBooking = await prisma.booking.update({
          where: { id },
          data: {
            status: "CANCELLED",
          },
          include: { vehicle: true, user: true },
        });

        // If vehicle was collected, make it available again
        if (booking.status === "COLLECTED") {
          await prisma.vehicle.update({
            where: { id: booking.vehicleId },
            data: { available: true },
          });
        }

        // Send cancellation notification
        const vehicleName = `${booking.vehicle.brand} ${booking.vehicle.model}`;
        const notification = NotificationTemplates.bookingCancelled(
          booking.id,
          vehicleName
        );
        await sendNotification({
          userId: booking.userId,
          ...notification,
        });

        break;
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      invoice,
    });
  } catch (error) {
    console.error("Error in booking workflow:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to calculate free mileage based on rental days
function calculateFreeMileage(startDate: Date, endDate: Date): number {
  const days = Math.ceil(
    (new Date(endDate).getTime() - new Date(startDate).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  return days * mileageConfig.freeMileagePerDay;
}
