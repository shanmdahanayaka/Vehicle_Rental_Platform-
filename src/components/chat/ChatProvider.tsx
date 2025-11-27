"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";
import type { Channel } from "pusher-js";

export interface ChatUser {
  id: string;
  name: string | null;
  email?: string;
  image: string | null;
  role?: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  metadata?: Record<string, unknown>;
  createdAt: string;
  sender: ChatUser;
}

export interface Conversation {
  id: string;
  title: string | null;
  type: "SUPPORT" | "BOOKING" | "GENERAL";
  status: "OPEN" | "WAITING" | "RESOLVED" | "CLOSED";
  bookingId: string | null;
  createdAt: string;
  updatedAt: string;
  participants: {
    id: string;
    userId: string;
    role: "CUSTOMER" | "SUPPORT" | "ADMIN";
    user: ChatUser;
  }[];
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

interface ChatContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  isOpen: boolean;
  typingUsers: string[];
  fetchConversations: () => Promise<void>;
  openChat: (conversationId?: string) => void;
  closeChat: () => void;
  setActiveConversation: (conversation: Conversation | null) => void;
  sendMessage: (content: string) => Promise<void>;
  startNewConversation: (initialMessage?: string) => Promise<Conversation | null>;
  loadMessages: (conversationId: string) => Promise<void>;
  startTyping: () => void;
  stopTyping: () => void;
  totalUnreadCount: number;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function useChat(): ChatContextType {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within ChatProvider");
  }
  return context;
}

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversationState] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  const conversationChannelRef = useRef<Channel | null>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate total unread count
  const totalUnreadCount = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [session?.user?.id]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);

        // Update unread count in conversations list
        setConversations((prev) =>
          prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
        );
      }
    } catch (error) {
      console.error("Error loading messages:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set active conversation and subscribe to its channel
  const setActiveConversation = useCallback(
    (conversation: Conversation | null) => {
      // Unsubscribe from previous conversation channel
      if (conversationChannelRef.current) {
        conversationChannelRef.current.unbind_all();
        getPusherClient().unsubscribe(
          CHANNELS.conversation(activeConversation?.id || "")
        );
        conversationChannelRef.current = null;
      }

      setActiveConversationState(conversation);
      setMessages([]);
      setTypingUsers([]);

      if (conversation) {
        loadMessages(conversation.id);

        // Subscribe to conversation channel
        const pusher = getPusherClient();
        const channel = pusher.subscribe(CHANNELS.conversation(conversation.id));
        conversationChannelRef.current = channel;

        // Handle new messages
        channel.bind(EVENTS.NEW_MESSAGE, (data: { message: ChatMessage }) => {
          if (data.message.senderId !== session?.user?.id) {
            setMessages((prev) => [...prev, data.message]);
          }
        });

        // Handle typing indicators
        channel.bind(EVENTS.TYPING_START, (data: { userId: string; name: string }) => {
          if (data.userId !== session?.user?.id) {
            setTypingUsers((prev) =>
              prev.includes(data.name) ? prev : [...prev, data.name]
            );
          }
        });

        channel.bind(EVENTS.TYPING_STOP, (data: { userId: string; name: string }) => {
          setTypingUsers((prev) => prev.filter((name) => name !== data.name));
        });

        // Handle user joined
        channel.bind(EVENTS.USER_JOINED, () => {
          loadMessages(conversation.id);
        });

        // Handle conversation closed
        channel.bind(EVENTS.CONVERSATION_CLOSED, () => {
          setActiveConversationState((prev) =>
            prev ? { ...prev, status: "CLOSED" } : null
          );
          setConversations((prev) =>
            prev.map((c) => (c.id === conversation.id ? { ...c, status: "CLOSED" } : c))
          );
        });
      }
    },
    [activeConversation?.id, session?.user?.id, loadMessages]
  );

  // Open chat widget
  const openChat = useCallback(
    (conversationId?: string) => {
      setIsOpen(true);
      if (conversationId) {
        const conversation = conversations.find((c) => c.id === conversationId);
        if (conversation) {
          setActiveConversation(conversation);
        }
      }
    },
    [conversations, setActiveConversation]
  );

  // Close chat widget
  const closeChat = useCallback(() => {
    setIsOpen(false);
    setActiveConversation(null);
  }, [setActiveConversation]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!activeConversation || !content.trim() || sending) return;

      setSending(true);

      // Optimistic update
      const tempMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        conversationId: activeConversation.id,
        senderId: session?.user?.id || "",
        content: content.trim(),
        type: "TEXT",
        createdAt: new Date().toISOString(),
        sender: {
          id: session?.user?.id || "",
          name: session?.user?.name || null,
          image: session?.user?.image || null,
        },
      };

      setMessages((prev) => [...prev, tempMessage]);

      try {
        const res = await fetch(
          `/api/chat/conversations/${activeConversation.id}/messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: content.trim() }),
          }
        );

        if (res.ok) {
          const message = await res.json();
          // Replace temp message with real one
          setMessages((prev) =>
            prev.map((m) => (m.id === tempMessage.id ? message : m))
          );
        } else {
          // Remove temp message on failure
          setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        }
      } catch (error) {
        console.error("Error sending message:", error);
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      } finally {
        setSending(false);
      }
    },
    [activeConversation, sending, session?.user]
  );

  // Start a new conversation
  const startNewConversation = useCallback(
    async (initialMessage?: string): Promise<Conversation | null> => {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "SUPPORT",
            initialMessage,
          }),
        });

        if (res.ok) {
          const conversation = await res.json();
          setConversations((prev) => [conversation, ...prev]);
          setActiveConversation({ ...conversation, unreadCount: 0, lastMessage: null });
          return conversation;
        }
      } catch (error) {
        console.error("Error starting conversation:", error);
      }
      return null;
    },
    [setActiveConversation]
  );

  // Typing indicators
  const startTyping = useCallback(() => {
    if (!activeConversation) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // We'd send a typing event to the server here
    // For simplicity, using Pusher directly would require server-side trigger

    // Auto-stop typing after 3 seconds
    typingTimeoutRef.current = setTimeout(() => {
      // Stop typing event would be sent here
    }, 3000);
  }, [activeConversation]);

  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    // Stop typing event would be sent here
  }, []);

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status, fetchConversations]);

  // Subscribe to admin chat channel for support agents
  useEffect(() => {
    if (
      status !== "authenticated" ||
      !session?.user?.id ||
      !["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role)
    ) {
      return;
    }

    const pusher = getPusherClient();
    const adminChannel = pusher.subscribe(CHANNELS.adminChat);

    adminChannel.bind(
      EVENTS.NEW_MESSAGE,
      (data: { conversationId: string; message: ChatMessage; isNewConversation?: boolean }) => {
        if (data.isNewConversation) {
          fetchConversations();
        } else {
          setConversations((prev) =>
            prev.map((c) =>
              c.id === data.conversationId
                ? {
                    ...c,
                    lastMessage: data.message,
                    unreadCount: c.id === activeConversation?.id ? 0 : c.unreadCount + 1,
                    updatedAt: new Date().toISOString(),
                  }
                : c
            )
          );
        }
      }
    );

    return () => {
      adminChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.adminChat);
    };
  }, [status, session?.user, activeConversation?.id, fetchConversations]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (conversationChannelRef.current) {
        conversationChannelRef.current.unbind_all();
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ChatContext.Provider
      value={{
        conversations,
        activeConversation,
        messages,
        loading,
        sending,
        isOpen,
        typingUsers,
        fetchConversations,
        openChat,
        closeChat,
        setActiveConversation,
        sendMessage,
        startNewConversation,
        loadMessages,
        startTyping,
        stopTyping,
        totalUnreadCount,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}
