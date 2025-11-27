"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";

interface ChatUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  type: "TEXT" | "IMAGE" | "FILE" | "SYSTEM";
  createdAt: string;
  sender: ChatUser;
}

interface Conversation {
  id: string;
  title: string | null;
  type: "SUPPORT" | "BOOKING" | "GENERAL";
  status: "OPEN" | "WAITING" | "RESOLVED" | "CLOSED";
  createdAt: string;
  updatedAt: string;
  participants: {
    id: string;
    userId: string;
    role: "CUSTOMER" | "SUPPORT" | "ADMIN";
    user: ChatUser;
  }[];
  messages: ChatMessage[];
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function AdminChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "WAITING" | "CLOSED">("ALL");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const selectedConversationIdRef = useRef<string | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null;
  }, [selectedConversation?.id]);

  // Check if user is admin
  useEffect(() => {
    if (status === "authenticated") {
      if (!["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session?.user?.role || "")) {
        router.push("/");
      }
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, session, router]);

  // Fetch all conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations?all=true");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch messages for selected conversation
  const fetchMessages = useCallback(async (conversationId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}`);
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setSelectedConversation(data);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations();
    }
  }, [status, fetchConversations]);

  // Subscribe to admin chat channel for real-time updates
  useEffect(() => {
    if (status !== "authenticated") return;

    const pusher = getPusherClient();
    const adminChannel = pusher.subscribe(CHANNELS.adminChat);

    adminChannel.bind(EVENTS.NEW_MESSAGE, (data: { conversationId: string; message: ChatMessage }) => {
      // Update conversations list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversationId
            ? { ...c, updatedAt: new Date().toISOString(), status: "OPEN" as const }
            : c
        )
      );

      // If this conversation is currently selected, add the message using ref (avoids stale closure)
      if (selectedConversationIdRef.current === data.conversationId) {
        setMessages((prev) => {
          // Check if message already exists
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }

      // Refresh conversations to get new ones
      fetchConversations();
    });

    return () => {
      adminChannel.unbind_all();
      pusher.unsubscribe(CHANNELS.adminChat);
    };
  }, [status, fetchConversations]);

  // Subscribe to selected conversation channel
  useEffect(() => {
    if (!selectedConversation) return;

    const pusher = getPusherClient();
    const channel = pusher.subscribe(CHANNELS.conversation(selectedConversation.id));

    channel.bind(EVENTS.NEW_MESSAGE, (data: { message: ChatMessage }) => {
      if (data.message.senderId !== session?.user?.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
      }
    });

    return () => {
      channel.unbind_all();
      pusher.unsubscribe(CHANNELS.conversation(selectedConversation.id));
    };
  }, [selectedConversation?.id, session?.user?.id]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when conversation is selected
  useEffect(() => {
    if (selectedConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [selectedConversation]);

  const handleSelectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sending) return;

    setSending(true);
    const content = messageInput;
    setMessageInput("");

    // Optimistic update
    const tempMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      conversationId: selectedConversation.id,
      senderId: session?.user?.id || "",
      content: content.trim(),
      type: "TEXT",
      createdAt: new Date().toISOString(),
      sender: {
        id: session?.user?.id || "",
        name: session?.user?.name || null,
        email: session?.user?.email || "",
        image: session?.user?.image || null,
        role: session?.user?.role || "ADMIN",
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });

      if (res.ok) {
        const message = await res.json();
        setMessages((prev) => prev.map((m) => (m.id === tempMessage.id ? message : m)));

        // Update conversation status to WAITING (waiting for customer response)
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id
              ? { ...c, status: "WAITING" as const, updatedAt: new Date().toISOString() }
              : c
          )
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

  const handleCloseConversation = async () => {
    if (!selectedConversation) return;

    try {
      const res = await fetch(`/api/chat/conversations/${selectedConversation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (res.ok) {
        setSelectedConversation((prev) => prev ? { ...prev, status: "CLOSED" } : null);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConversation.id ? { ...c, status: "CLOSED" as const } : c
          )
        );
        fetchMessages(selectedConversation.id);
      }
    } catch (error) {
      console.error("Error closing conversation:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (filter === "ALL") return true;
    return c.status === filter;
  });

  const getCustomerFromConversation = (conversation: Conversation) => {
    return conversation.participants.find((p) => p.role === "CUSTOMER")?.user;
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Customer Support Chat</h1>
          <p className="text-slate-600">Manage and respond to customer conversations</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden" style={{ height: "calc(100vh - 180px)" }}>
          <div className="flex h-full">
            {/* Conversations List */}
            <div className="w-80 border-r border-slate-200 flex flex-col">
              {/* Filter Tabs */}
              <div className="p-3 border-b border-slate-200 bg-slate-50">
                <div className="flex gap-1">
                  {(["ALL", "OPEN", "WAITING", "CLOSED"] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                        filter === f
                          ? "bg-blue-600 text-white"
                          : "bg-white text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {f}
                      {f !== "ALL" && (
                        <span className="ml-1">
                          ({conversations.filter((c) => c.status === f).length})
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation List */}
              <div className="flex-1 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">
                    No conversations found
                  </div>
                ) : (
                  filteredConversations.map((conversation) => {
                    const customer = getCustomerFromConversation(conversation);
                    return (
                      <button
                        key={conversation.id}
                        onClick={() => handleSelectConversation(conversation)}
                        className={`w-full p-4 text-left border-b border-slate-100 hover:bg-slate-50 transition ${
                          selectedConversation?.id === conversation.id ? "bg-blue-50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                            {customer?.name?.charAt(0) || "U"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-slate-900 truncate">
                                {customer?.name || "Unknown User"}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  conversation.status === "OPEN"
                                    ? "bg-green-100 text-green-700"
                                    : conversation.status === "WAITING"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {conversation.status}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {customer?.email}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {formatTime(conversation.updatedAt)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        {getCustomerFromConversation(selectedConversation)?.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">
                          {getCustomerFromConversation(selectedConversation)?.name || "Unknown User"}
                        </p>
                        <p className="text-sm text-slate-500">
                          {getCustomerFromConversation(selectedConversation)?.email}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-3 py-1 rounded-full ${
                          selectedConversation.status === "OPEN"
                            ? "bg-green-100 text-green-700"
                            : selectedConversation.status === "WAITING"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {selectedConversation.status}
                      </span>
                      {selectedConversation.status !== "CLOSED" && (
                        <button
                          onClick={handleCloseConversation}
                          className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                        >
                          Close Chat
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {messages.map((message) => {
                      const isOwn = message.senderId === session?.user?.id;
                      const isSystem = message.type === "SYSTEM";

                      if (isSystem) {
                        return (
                          <div key={message.id} className="flex justify-center my-3">
                            <span className="text-xs text-slate-500 bg-slate-200 px-3 py-1 rounded-full">
                              {message.content}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-4`}
                        >
                          <div className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end gap-2 max-w-[70%]`}>
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {message.sender.name?.charAt(0) || "U"}
                              </div>
                            )}
                            <div>
                              {!isOwn && (
                                <p className="text-xs text-slate-500 mb-1 ml-1">
                                  {message.sender.name}
                                </p>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? "bg-blue-600 text-white rounded-br-md"
                                    : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                              <p className={`text-xs text-slate-400 mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
                                {formatTime(message.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input */}
                  {selectedConversation.status !== "CLOSED" ? (
                    <div className="p-4 border-t border-slate-200 bg-white">
                      <div className="flex gap-3">
                        <textarea
                          ref={inputRef}
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          onKeyDown={handleKeyDown}
                          placeholder="Type your reply..."
                          className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          rows={2}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || sending}
                          className="bg-blue-600 text-white px-6 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                          {sending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>Send</span>
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-slate-200 bg-slate-100 text-center">
                      <p className="text-sm text-slate-500">This conversation has been closed</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-50">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-slate-900 mb-1">Select a conversation</h3>
                    <p className="text-sm text-slate-500">Choose a conversation from the list to start chatting</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
