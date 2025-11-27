import PusherClient from "pusher-js";

// Client-side Pusher instance (singleton)
let pusherClientInstance: PusherClient | null = null;

export const getPusherClient = () => {
  if (!pusherClientInstance) {
    pusherClientInstance = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
    });
  }
  return pusherClientInstance;
};

// Channel names
export const CHANNELS = {
  // User-specific channels (private)
  userNotifications: (userId: string) => `private-user-${userId}-notifications`,
  userChat: (userId: string) => `private-user-${userId}-chat`,

  // Conversation-specific channels (private)
  conversation: (conversationId: string) => `private-conversation-${conversationId}`,

  // Admin channels (private)
  adminNotifications: "private-admin-notifications",
  adminChat: "private-admin-chat",
};

// Event names
export const EVENTS = {
  // Notification events
  NEW_NOTIFICATION: "new-notification",
  NOTIFICATION_READ: "notification-read",
  NOTIFICATIONS_CLEARED: "notifications-cleared",

  // Chat events
  NEW_MESSAGE: "new-message",
  MESSAGE_UPDATED: "message-updated",
  MESSAGE_DELETED: "message-deleted",
  TYPING_START: "typing-start",
  TYPING_STOP: "typing-stop",
  USER_JOINED: "user-joined",
  USER_LEFT: "user-left",
  CONVERSATION_CLOSED: "conversation-closed",

  // Presence events
  MEMBER_ADDED: "pusher:member_added",
  MEMBER_REMOVED: "pusher:member_removed",
};
