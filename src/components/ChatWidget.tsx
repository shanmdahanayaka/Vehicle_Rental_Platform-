"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender: {
    name: string | null;
  };
}

interface Conversation {
  id: string;
  status: string;
  messages: ChatMessage[];
  unreadCount?: number;
}

export default function ChatWidget() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch existing conversation
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      fetchConversation();
    }
  }, [status, session?.user]);

  // Subscribe to pusher for real-time updates
  useEffect(() => {
    if (!conversation || status !== "authenticated") return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.conversation(conversation.id));

    channel.bind(EVENTS.NEW_MESSAGE, (data: { message: ChatMessage }) => {
      if (data.message.senderId !== session?.user?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        if (!isOpen) {
          setUnreadCount((prev) => prev + 1);
        }
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.conversation(conversation.id));
    };
  }, [conversation?.id, status, session?.user?.id, isOpen]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current && isOpen) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Clear unread count when opened
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
    }
  }, [isOpen]);

  const fetchConversation = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        // Find an open conversation
        const openConv = data.find(
          (c: Conversation) => c.status === "OPEN" || c.status === "WAITING"
        );
        if (openConv) {
          setConversation(openConv);
          setUnreadCount(openConv.unreadCount || 0);
          // Fetch full messages
          const msgRes = await fetch(`/api/chat/conversations/${openConv.id}`);
          if (msgRes.ok) {
            const msgData = await msgRes.json();
            setMessages(msgData.messages || []);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
    }
  };

  const startConversation = async (initialMessage: string) => {
    setLoading(true);
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
        const conv = await res.json();
        setConversation(conv);
        // Fetch messages
        const msgRes = await fetch(`/api/chat/conversations/${conv.id}`);
        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setMessages(msgData.messages || []);
        }
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    const content = messageInput.trim();
    setMessageInput("");

    // If no conversation, start one
    if (!conversation) {
      await startConversation(content);
      return;
    }

    setSending(true);

    // Optimistic update
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      content,
      senderId: session?.user?.id || "",
      createdAt: new Date().toISOString(),
      sender: { name: session?.user?.name || null },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(
        `/api/chat/conversations/${conversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      if (res.ok) {
        const message = await res.json();
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? message : m))
        );
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
        setMessageInput(content);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Don't show widget for admins or on admin pages
  if (
    status === "loading" ||
    (session?.user?.role &&
      ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role))
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Window */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold">Support Chat</h3>
                  <p className="text-xs text-white/80">
                    We typically reply in minutes
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/chat")}
                className="p-1.5 hover:bg-white/10 rounded-lg transition"
                title="Open full chat"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="h-72 overflow-y-auto p-4 bg-slate-50">
            {status === "unauthenticated" ? (
              <div className="text-center py-8">
                <p className="text-slate-600 mb-4">
                  Please sign in to chat with support
                </p>
                <button
                  onClick={() => router.push("/login?callbackUrl=/chat")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  Sign In
                </button>
              </div>
            ) : messages.length === 0 && !loading ? (
              <div className="text-center py-8">
                <p className="text-slate-600 text-sm mb-2">
                  Hi! How can we help you today?
                </p>
                <p className="text-slate-400 text-xs">
                  Type a message below to start
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isOwn = message.senderId === session?.user?.id;
                return (
                  <div
                    key={message.id}
                    className={`flex ${
                      isOwn ? "justify-end" : "justify-start"
                    } mb-3`}
                  >
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                        isOwn
                          ? "bg-blue-600 text-white rounded-br-md"
                          : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                );
              })
            )}
            {loading && (
              <div className="flex justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {status === "authenticated" && (
            <div className="p-3 border-t border-slate-200 bg-white">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 text-slate-900"
                />
                <button
                  onClick={sendMessage}
                  disabled={!messageInput.trim() || sending}
                  className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
      >
        {isOpen ? (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        )}

        {/* Unread Badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}

        {/* Pulse animation when has unread */}
        {unreadCount > 0 && !isOpen && (
          <span className="absolute inset-0 rounded-full bg-blue-400 animate-ping opacity-25" />
        )}
      </button>
    </div>
  );
}
