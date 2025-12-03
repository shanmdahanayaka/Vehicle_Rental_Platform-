/**
 * Unit Tests for src/lib/pusher-client.ts
 *
 * Tests Pusher client configuration including:
 * - Channel name generators
 * - Event constants
 */

import { CHANNELS, EVENTS } from '@/lib/pusher-client';

describe('lib/pusher-client', () => {
  // ============================================
  // CHANNELS TESTS
  // ============================================
  describe('CHANNELS', () => {
    describe('userNotifications()', () => {
      it('should generate correct channel name for user', () => {
        const channel = CHANNELS.userNotifications('user-123');
        expect(channel).toBe('private-user-user-123-notifications');
      });

      it('should handle different user IDs', () => {
        expect(CHANNELS.userNotifications('abc')).toBe('private-user-abc-notifications');
        expect(CHANNELS.userNotifications('12345')).toBe('private-user-12345-notifications');
        expect(CHANNELS.userNotifications('user_xyz')).toBe('private-user-user_xyz-notifications');
      });

      it('should always start with private-', () => {
        const channel = CHANNELS.userNotifications('test');
        expect(channel.startsWith('private-')).toBe(true);
      });
    });

    describe('userChat()', () => {
      it('should generate correct channel name for user chat', () => {
        const channel = CHANNELS.userChat('user-456');
        expect(channel).toBe('private-user-user-456-chat');
      });

      it('should handle different user IDs', () => {
        expect(CHANNELS.userChat('abc')).toBe('private-user-abc-chat');
        expect(CHANNELS.userChat('12345')).toBe('private-user-12345-chat');
      });

      it('should always start with private-', () => {
        const channel = CHANNELS.userChat('test');
        expect(channel.startsWith('private-')).toBe(true);
      });
    });

    describe('conversation()', () => {
      it('should generate correct channel name for conversation', () => {
        const channel = CHANNELS.conversation('conv-789');
        expect(channel).toBe('private-conversation-conv-789');
      });

      it('should handle different conversation IDs', () => {
        expect(CHANNELS.conversation('abc')).toBe('private-conversation-abc');
        expect(CHANNELS.conversation('12345')).toBe('private-conversation-12345');
        expect(CHANNELS.conversation('conv_xyz')).toBe('private-conversation-conv_xyz');
      });

      it('should always start with private-', () => {
        const channel = CHANNELS.conversation('test');
        expect(channel.startsWith('private-')).toBe(true);
      });
    });

    describe('adminNotifications', () => {
      it('should be a static channel name', () => {
        expect(CHANNELS.adminNotifications).toBe('private-admin-notifications');
      });

      it('should start with private-', () => {
        expect(CHANNELS.adminNotifications.startsWith('private-')).toBe(true);
      });
    });

    describe('adminChat', () => {
      it('should be a static channel name', () => {
        expect(CHANNELS.adminChat).toBe('private-admin-chat');
      });

      it('should start with private-', () => {
        expect(CHANNELS.adminChat.startsWith('private-')).toBe(true);
      });
    });
  });

  // ============================================
  // EVENTS TESTS
  // ============================================
  describe('EVENTS', () => {
    describe('notification events', () => {
      it('should have NEW_NOTIFICATION event', () => {
        expect(EVENTS.NEW_NOTIFICATION).toBe('new-notification');
      });

      it('should have NOTIFICATION_READ event', () => {
        expect(EVENTS.NOTIFICATION_READ).toBe('notification-read');
      });

      it('should have NOTIFICATIONS_CLEARED event', () => {
        expect(EVENTS.NOTIFICATIONS_CLEARED).toBe('notifications-cleared');
      });
    });

    describe('chat events', () => {
      it('should have NEW_MESSAGE event', () => {
        expect(EVENTS.NEW_MESSAGE).toBe('new-message');
      });

      it('should have MESSAGE_UPDATED event', () => {
        expect(EVENTS.MESSAGE_UPDATED).toBe('message-updated');
      });

      it('should have MESSAGE_DELETED event', () => {
        expect(EVENTS.MESSAGE_DELETED).toBe('message-deleted');
      });

      it('should have TYPING_START event', () => {
        expect(EVENTS.TYPING_START).toBe('typing-start');
      });

      it('should have TYPING_STOP event', () => {
        expect(EVENTS.TYPING_STOP).toBe('typing-stop');
      });

      it('should have USER_JOINED event', () => {
        expect(EVENTS.USER_JOINED).toBe('user-joined');
      });

      it('should have USER_LEFT event', () => {
        expect(EVENTS.USER_LEFT).toBe('user-left');
      });

      it('should have CONVERSATION_CLOSED event', () => {
        expect(EVENTS.CONVERSATION_CLOSED).toBe('conversation-closed');
      });
    });

    describe('presence events', () => {
      it('should have MEMBER_ADDED event', () => {
        expect(EVENTS.MEMBER_ADDED).toBe('pusher:member_added');
      });

      it('should have MEMBER_REMOVED event', () => {
        expect(EVENTS.MEMBER_REMOVED).toBe('pusher:member_removed');
      });
    });
  });

  // ============================================
  // ALL CONSTANTS CONSISTENCY TESTS
  // ============================================
  describe('constants consistency', () => {
    it('should have all CHANNELS properties', () => {
      expect(CHANNELS).toHaveProperty('userNotifications');
      expect(CHANNELS).toHaveProperty('userChat');
      expect(CHANNELS).toHaveProperty('conversation');
      expect(CHANNELS).toHaveProperty('adminNotifications');
      expect(CHANNELS).toHaveProperty('adminChat');
    });

    it('should have all EVENTS properties', () => {
      expect(EVENTS).toHaveProperty('NEW_NOTIFICATION');
      expect(EVENTS).toHaveProperty('NOTIFICATION_READ');
      expect(EVENTS).toHaveProperty('NOTIFICATIONS_CLEARED');
      expect(EVENTS).toHaveProperty('NEW_MESSAGE');
      expect(EVENTS).toHaveProperty('MESSAGE_UPDATED');
      expect(EVENTS).toHaveProperty('MESSAGE_DELETED');
      expect(EVENTS).toHaveProperty('TYPING_START');
      expect(EVENTS).toHaveProperty('TYPING_STOP');
      expect(EVENTS).toHaveProperty('USER_JOINED');
      expect(EVENTS).toHaveProperty('USER_LEFT');
      expect(EVENTS).toHaveProperty('CONVERSATION_CLOSED');
      expect(EVENTS).toHaveProperty('MEMBER_ADDED');
      expect(EVENTS).toHaveProperty('MEMBER_REMOVED');
    });

    it('should have unique event names', () => {
      const eventValues = Object.values(EVENTS);
      const uniqueValues = [...new Set(eventValues)];
      expect(eventValues.length).toBe(uniqueValues.length);
    });

    it('should use kebab-case for custom events', () => {
      const customEvents = [
        EVENTS.NEW_NOTIFICATION,
        EVENTS.NOTIFICATION_READ,
        EVENTS.NOTIFICATIONS_CLEARED,
        EVENTS.NEW_MESSAGE,
        EVENTS.MESSAGE_UPDATED,
        EVENTS.MESSAGE_DELETED,
        EVENTS.TYPING_START,
        EVENTS.TYPING_STOP,
        EVENTS.USER_JOINED,
        EVENTS.USER_LEFT,
        EVENTS.CONVERSATION_CLOSED,
      ];

      customEvents.forEach((event) => {
        // Should contain hyphens (kebab-case)
        expect(event).toMatch(/^[a-z]+-[a-z]+(-[a-z]+)?$/);
      });
    });

    it('should use pusher namespace for presence events', () => {
      expect(EVENTS.MEMBER_ADDED.startsWith('pusher:')).toBe(true);
      expect(EVENTS.MEMBER_REMOVED.startsWith('pusher:')).toBe(true);
    });
  });
});
