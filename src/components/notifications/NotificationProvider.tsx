"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, unknown> | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within NotificationProvider");
  }
  return context;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [channel, setChannel] = useState<Channel | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/notifications?limit=50");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  // Mark specific notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationIds }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            notificationIds.includes(n.id) ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - notificationIds.length));
      }
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAllRead: true }),
      });

      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  }, []);

  // Delete a notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setNotifications((prev) => {
          const notification = prev.find((n) => n.id === id);
          if (notification && !notification.read) {
            setUnreadCount((count) => Math.max(0, count - 1));
          }
          return prev.filter((n) => n.id !== id);
        });
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  }, []);

  // Clear all notifications
  const clearAll = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?deleteAll=true", { method: "DELETE" });
      if (res.ok) {
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  }, []);

  // Initialize Pusher subscription
  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      setLoading(false);
      return;
    }

    fetchNotifications();

    // Subscribe to Pusher channel
    const pusher = getPusherClient();
    const userChannel = pusher.subscribe(CHANNELS.userNotifications(session.user.id));
    setChannel(userChannel);

    // Handle new notification
    userChannel.bind(EVENTS.NEW_NOTIFICATION, (data: { notification: Notification }) => {
      setNotifications((prev) => [data.notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Play notification sound (optional)
      try {
        const audio = new Audio("/sounds/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
    });

    // Handle notifications read
    userChannel.bind(EVENTS.NOTIFICATION_READ, (data: { notificationIds: string[] }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          data.notificationIds.includes(n.id) ? { ...n, read: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - data.notificationIds.length));
    });

    // Handle all notifications cleared
    userChannel.bind(EVENTS.NOTIFICATIONS_CLEARED, () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    });

    return () => {
      userChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.userNotifications(session.user.id));
    };
  }, [status, session?.user?.id, fetchNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
