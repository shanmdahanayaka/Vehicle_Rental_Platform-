import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher-server";
import { CHANNELS, EVENTS } from "@/lib/pusher-client";
import { NotificationType } from "@prisma/client";

interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export async function sendNotification({
  userId,
  type,
  title,
  message,
  data,
}: SendNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        data: data ? JSON.stringify(data) : null,
      },
    });

    // Send real-time notification via Pusher
    await pusherServer.trigger(
      CHANNELS.userNotifications(userId),
      EVENTS.NEW_NOTIFICATION,
      {
        notification: {
          ...notification,
          data: data || null,
        },
      }
    );

    return notification;
  } catch (error) {
    console.error("Error sending notification:", error);
    throw error;
  }
}

// Notification templates for common scenarios
export const NotificationTemplates = {
  bookingCreated: (bookingId: string, vehicleName: string) => ({
    type: NotificationType.BOOKING_CREATED,
    title: "Booking Created",
    message: `Your booking for ${vehicleName} has been created and is pending confirmation.`,
    data: { bookingId },
  }),

  bookingConfirmed: (bookingId: string, vehicleName: string, startDate: string) => ({
    type: NotificationType.BOOKING_CONFIRMED,
    title: "Booking Confirmed",
    message: `Your booking for ${vehicleName} has been confirmed! Pickup date: ${startDate}`,
    data: { bookingId },
  }),

  bookingCancelled: (bookingId: string, vehicleName: string) => ({
    type: NotificationType.BOOKING_CANCELLED,
    title: "Booking Cancelled",
    message: `Your booking for ${vehicleName} has been cancelled.`,
    data: { bookingId },
  }),

  bookingReminder: (bookingId: string, vehicleName: string, startDate: string) => ({
    type: NotificationType.BOOKING_REMINDER,
    title: "Upcoming Rental Reminder",
    message: `Reminder: Your rental of ${vehicleName} starts on ${startDate}. Don't forget to pick up your vehicle!`,
    data: { bookingId },
  }),

  paymentSuccess: (bookingId: string, amount: number) => ({
    type: NotificationType.PAYMENT_SUCCESS,
    title: "Payment Successful",
    message: `Your payment of $${amount.toFixed(2)} has been processed successfully.`,
    data: { bookingId },
  }),

  paymentFailed: (bookingId: string) => ({
    type: NotificationType.PAYMENT_FAILED,
    title: "Payment Failed",
    message: "Your payment could not be processed. Please try again or use a different payment method.",
    data: { bookingId },
  }),

  reviewReceived: (vehicleName: string, rating: number) => ({
    type: NotificationType.REVIEW_RECEIVED,
    title: "New Review",
    message: `Your ${vehicleName} received a ${rating}-star review!`,
    data: {},
  }),

  newChatMessage: (senderName: string, conversationId: string) => ({
    type: NotificationType.CHAT_MESSAGE,
    title: "New Message",
    message: `${senderName} sent you a message.`,
    data: { conversationId },
  }),

  promotion: (title: string, message: string) => ({
    type: NotificationType.PROMOTION,
    title,
    message,
    data: {},
  }),

  system: (title: string, message: string) => ({
    type: NotificationType.SYSTEM,
    title,
    message,
    data: {},
  }),

  invoiceGenerated: (invoiceId: string, invoiceNumber: string, totalAmount: number, currencySymbol: string = "Rs.") => ({
    type: NotificationType.SYSTEM,
    title: "Invoice Generated",
    message: `Invoice ${invoiceNumber} for ${currencySymbol}${totalAmount.toLocaleString()} has been generated for your rental.`,
    data: { invoiceId, invoiceNumber },
  }),

  invoicePaymentReceived: (invoiceId: string, invoiceNumber: string, amount: number, balanceDue: number, currencySymbol: string = "Rs.") => ({
    type: NotificationType.PAYMENT_SUCCESS,
    title: "Payment Received",
    message: balanceDue <= 0
      ? `Payment of ${currencySymbol}${amount.toLocaleString()} received. Invoice ${invoiceNumber} is now fully paid. Thank you!`
      : `Payment of ${currencySymbol}${amount.toLocaleString()} received for invoice ${invoiceNumber}. Remaining balance: ${currencySymbol}${balanceDue.toLocaleString()}`,
    data: { invoiceId, invoiceNumber },
  }),

  rentalCompleted: (bookingId: string, vehicleName: string) => ({
    type: NotificationType.SYSTEM,
    title: "Rental Completed",
    message: `Your rental of ${vehicleName} has been completed. Thank you for choosing us!`,
    data: { bookingId },
  }),

  // Package booking notifications
  packageBookingCreated: (bookingId: string, packageName: string, vehicleName: string, startDate: string) => ({
    type: NotificationType.BOOKING_CREATED,
    title: "Package Booking Created",
    message: `Your "${packageName}" package booking with ${vehicleName} has been created for ${startDate}. Pending confirmation.`,
    data: { bookingId, isPackageBooking: true },
  }),

  packageBookingConfirmed: (bookingId: string, packageName: string, vehicleName: string, startDate: string) => ({
    type: NotificationType.BOOKING_CONFIRMED,
    title: "Package Booking Confirmed",
    message: `Great news! Your "${packageName}" package with ${vehicleName} is confirmed for ${startDate}. Get ready for your trip!`,
    data: { bookingId, isPackageBooking: true },
  }),

  packageBookingCancelled: (bookingId: string, packageName: string) => ({
    type: NotificationType.BOOKING_CANCELLED,
    title: "Package Booking Cancelled",
    message: `Your "${packageName}" package booking has been cancelled.`,
    data: { bookingId, isPackageBooking: true },
  }),

  // Admin notifications for package bookings
  adminNewPackageBooking: (bookingId: string, customerName: string, packageName: string, vehicleName: string, totalAmount: number, currencySymbol: string = "Rs.") => ({
    type: NotificationType.SYSTEM,
    title: "New Package Booking",
    message: `${customerName} booked "${packageName}" package with ${vehicleName}. Total: ${currencySymbol}${totalAmount.toLocaleString()}`,
    data: { bookingId, isPackageBooking: true },
  }),

  adminPackageBookingCancelled: (bookingId: string, customerName: string, packageName: string) => ({
    type: NotificationType.SYSTEM,
    title: "Package Booking Cancelled",
    message: `${customerName} cancelled their "${packageName}" package booking.`,
    data: { bookingId, isPackageBooking: true },
  }),
};

// Send notification to multiple users
export async function sendBulkNotifications(
  userIds: string[],
  notification: Omit<SendNotificationParams, "userId">
) {
  const promises = userIds.map((userId) =>
    sendNotification({ ...notification, userId })
  );
  return Promise.allSettled(promises);
}

// Send notification to all admins
export async function notifyAdmins(
  notification: Omit<SendNotificationParams, "userId">
) {
  const admins = await prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "SUPER_ADMIN", "MANAGER"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  return sendBulkNotifications(
    admins.map((a) => a.id),
    notification
  );
}
