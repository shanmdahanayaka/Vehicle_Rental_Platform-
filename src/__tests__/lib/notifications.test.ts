/**
 * Unit Tests for src/lib/notifications.ts
 *
 * Tests notification template functions
 */

import { NotificationTemplates } from '@/lib/notifications';
import { NotificationType } from '@prisma/client';

describe('lib/notifications', () => {
  // ============================================
  // NOTIFICATION TEMPLATES TESTS
  // ============================================
  describe('NotificationTemplates', () => {
    describe('bookingCreated()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.bookingCreated('booking-123', 'Toyota Camry');

        expect(result.type).toBe(NotificationType.BOOKING_CREATED);
        expect(result.title).toBe('Booking Created');
        expect(result.message).toContain('Toyota Camry');
        expect(result.message).toContain('pending confirmation');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });

      it('should include vehicle name in message', () => {
        const result = NotificationTemplates.bookingCreated('123', 'Honda Civic');
        expect(result.message).toContain('Honda Civic');
      });
    });

    describe('bookingConfirmed()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.bookingConfirmed('booking-123', 'BMW X5', '2024-01-15');

        expect(result.type).toBe(NotificationType.BOOKING_CONFIRMED);
        expect(result.title).toBe('Booking Confirmed');
        expect(result.message).toContain('BMW X5');
        expect(result.message).toContain('2024-01-15');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });

      it('should include pickup date in message', () => {
        const result = NotificationTemplates.bookingConfirmed('123', 'Car', '2024-03-20');
        expect(result.message).toContain('2024-03-20');
      });
    });

    describe('bookingCancelled()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.bookingCancelled('booking-123', 'Tesla Model 3');

        expect(result.type).toBe(NotificationType.BOOKING_CANCELLED);
        expect(result.title).toBe('Booking Cancelled');
        expect(result.message).toContain('Tesla Model 3');
        expect(result.message).toContain('cancelled');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });
    });

    describe('bookingReminder()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.bookingReminder('booking-123', 'Mercedes C-Class', '2024-02-10');

        expect(result.type).toBe(NotificationType.BOOKING_REMINDER);
        expect(result.title).toBe('Upcoming Rental Reminder');
        expect(result.message).toContain('Mercedes C-Class');
        expect(result.message).toContain('2024-02-10');
        expect(result.message).toContain('Reminder');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });
    });

    describe('paymentSuccess()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.paymentSuccess('booking-123', 150.50);

        expect(result.type).toBe(NotificationType.PAYMENT_SUCCESS);
        expect(result.title).toBe('Payment Successful');
        expect(result.message).toContain('$150.50');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });

      it('should format amount with two decimal places', () => {
        const result = NotificationTemplates.paymentSuccess('123', 100);
        expect(result.message).toContain('$100.00');
      });

      it('should handle large amounts', () => {
        const result = NotificationTemplates.paymentSuccess('123', 10000.99);
        expect(result.message).toContain('$10000.99');
      });
    });

    describe('paymentFailed()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.paymentFailed('booking-123');

        expect(result.type).toBe(NotificationType.PAYMENT_FAILED);
        expect(result.title).toBe('Payment Failed');
        expect(result.message).toContain('could not be processed');
        expect(result.data).toEqual({ bookingId: 'booking-123' });
      });
    });

    describe('reviewReceived()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.reviewReceived('Toyota Camry', 5);

        expect(result.type).toBe(NotificationType.REVIEW_RECEIVED);
        expect(result.title).toBe('New Review');
        expect(result.message).toContain('Toyota Camry');
        expect(result.message).toContain('5-star');
        expect(result.data).toEqual({});
      });

      it('should include rating in message', () => {
        const result = NotificationTemplates.reviewReceived('Car', 3);
        expect(result.message).toContain('3-star');
      });
    });

    describe('newChatMessage()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.newChatMessage('John Doe', 'conv-123');

        expect(result.type).toBe(NotificationType.CHAT_MESSAGE);
        expect(result.title).toBe('New Message');
        expect(result.message).toContain('John Doe');
        expect(result.data).toEqual({ conversationId: 'conv-123' });
      });
    });

    describe('promotion()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.promotion('Holiday Sale!', 'Get 20% off all rentals');

        expect(result.type).toBe(NotificationType.PROMOTION);
        expect(result.title).toBe('Holiday Sale!');
        expect(result.message).toBe('Get 20% off all rentals');
        expect(result.data).toEqual({});
      });

      it('should use custom title and message', () => {
        const result = NotificationTemplates.promotion('Custom Title', 'Custom message here');
        expect(result.title).toBe('Custom Title');
        expect(result.message).toBe('Custom message here');
      });
    });

    describe('system()', () => {
      it('should return correct notification structure', () => {
        const result = NotificationTemplates.system('System Update', 'New features available');

        expect(result.type).toBe(NotificationType.SYSTEM);
        expect(result.title).toBe('System Update');
        expect(result.message).toBe('New features available');
        expect(result.data).toEqual({});
      });
    });
  });

  // ============================================
  // ALL TEMPLATES STRUCTURE TESTS
  // ============================================
  describe('all templates structure', () => {
    it('should all have type, title, message, and data properties', () => {
      const templates = [
        NotificationTemplates.bookingCreated('id', 'vehicle'),
        NotificationTemplates.bookingConfirmed('id', 'vehicle', 'date'),
        NotificationTemplates.bookingCancelled('id', 'vehicle'),
        NotificationTemplates.bookingReminder('id', 'vehicle', 'date'),
        NotificationTemplates.paymentSuccess('id', 100),
        NotificationTemplates.paymentFailed('id'),
        NotificationTemplates.reviewReceived('vehicle', 5),
        NotificationTemplates.newChatMessage('sender', 'convId'),
        NotificationTemplates.promotion('title', 'message'),
        NotificationTemplates.system('title', 'message'),
      ];

      templates.forEach((template) => {
        expect(template).toHaveProperty('type');
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('message');
        expect(template).toHaveProperty('data');
        expect(typeof template.type).toBe('string');
        expect(typeof template.title).toBe('string');
        expect(typeof template.message).toBe('string');
        expect(typeof template.data).toBe('object');
      });
    });

    it('should all have non-empty titles', () => {
      const templates = [
        NotificationTemplates.bookingCreated('id', 'vehicle'),
        NotificationTemplates.bookingConfirmed('id', 'vehicle', 'date'),
        NotificationTemplates.bookingCancelled('id', 'vehicle'),
        NotificationTemplates.bookingReminder('id', 'vehicle', 'date'),
        NotificationTemplates.paymentSuccess('id', 100),
        NotificationTemplates.paymentFailed('id'),
        NotificationTemplates.reviewReceived('vehicle', 5),
        NotificationTemplates.newChatMessage('sender', 'convId'),
        NotificationTemplates.promotion('title', 'message'),
        NotificationTemplates.system('title', 'message'),
      ];

      templates.forEach((template) => {
        expect(template.title.length).toBeGreaterThan(0);
      });
    });

    it('should all have non-empty messages', () => {
      const templates = [
        NotificationTemplates.bookingCreated('id', 'vehicle'),
        NotificationTemplates.bookingConfirmed('id', 'vehicle', 'date'),
        NotificationTemplates.bookingCancelled('id', 'vehicle'),
        NotificationTemplates.bookingReminder('id', 'vehicle', 'date'),
        NotificationTemplates.paymentSuccess('id', 100),
        NotificationTemplates.paymentFailed('id'),
        NotificationTemplates.reviewReceived('vehicle', 5),
        NotificationTemplates.newChatMessage('sender', 'convId'),
        NotificationTemplates.promotion('title', 'message'),
        NotificationTemplates.system('title', 'message'),
      ];

      templates.forEach((template) => {
        expect(template.message.length).toBeGreaterThan(0);
      });
    });
  });
});
