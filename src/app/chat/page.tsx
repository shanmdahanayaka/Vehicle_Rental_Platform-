"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { getPusherClient, CHANNELS, EVENTS } from "@/lib/pusher-client";
import Link from "next/link";

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
  unreadCount?: number;
}

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function UserChatPageContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/chat");
    }
  }, [status, router]);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        return data;
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
    return [];
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

  // Initial fetch and check for new chat request
  useEffect(() => {
    if (status === "authenticated") {
      fetchConversations().then((convs) => {
        // Check if we should start a new conversation
        const newChat = searchParams.get("new");
        if (newChat === "true" && convs.length === 0) {
          // No existing conversations, will show the start chat UI
        } else if (convs.length > 0 && !selectedConversation) {
          // Auto-select first conversation
          setSelectedConversation(convs[0]);
          fetchMessages(convs[0].id);
        }
      });
    }
  }, [status, fetchConversations, searchParams]);

  // Subscribe to conversation channel for real-time updates
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

    channel.bind(EVENTS.CONVERSATION_CLOSED, () => {
      setSelectedConversation((prev) =>
        prev ? { ...prev, status: "CLOSED" as Conversation["status"] } : null
      );
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

  const startNewConversation = async (initialMessage?: string) => {
    setStartingChat(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SUPPORT",
          initialMessage: initialMessage || "Hello, I need help.",
        }),
      });

      if (res.ok) {
        const conversation = await res.json();
        setConversations((prev) => [conversation, ...prev]);
        setSelectedConversation(conversation);
        fetchMessages(conversation.id);
      }
    } catch (error) {
      console.error("Error starting conversation:", error);
    } finally {
      setStartingChat(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    // If no conversation selected, start a new one
    if (!selectedConversation) {
      await startNewConversation(messageInput.trim());
      setMessageInput("");
      return;
    }

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
        role: session?.user?.role || "USER",
      },
    };

    setMessages((prev) => [...prev, tempMessage]);

    try {
      const res = await fetch(
        `/api/chat/conversations/${selectedConversation.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: content.trim() }),
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
      handleSendMessage();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-green-100 text-green-700";
      case "WAITING":
        return "bg-yellow-100 text-yellow-700";
      case "RESOLVED":
        return "bg-blue-100 text-blue-700";
      case "CLOSED":
        return "bg-slate-100 text-slate-600";
      default:
        return "bg-slate-100 text-slate-600";
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Support Chat</h1>
              <p className="text-slate-600">
                Get help from our support team
              </p>
            </div>
            <Link
              href="/"
              className="text-sm text-slate-600 hover:text-slate-900 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>

        {/* Chat Container */}
        <div
          className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden"
          style={{ height: "calc(100vh - 200px)" }}
        >
          <div className="flex h-full">
            {/* Conversations List - Hidden on mobile when conversation selected */}
            <div
              className={`${
                selectedConversation ? "hidden md:flex" : "flex"
              } w-full md:w-80 border-r border-slate-200 flex-col`}
            >
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <h2 className="font-semibold text-slate-900">Conversations</h2>
              </div>

              <div className="flex-1 overflow-y-auto">
                {conversations.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-8 h-8 text-blue-600"
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
                    <h3 className="font-medium text-slate-900 mb-1">
                      No conversations yet
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Start a conversation with our support team
                    </p>
                    <button
                      onClick={() => startNewConversation()}
                      disabled={startingChat}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
                    >
                      {startingChat ? "Starting..." : "Start Chat"}
                    </button>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => {
                        setSelectedConversation(conversation);
                        fetchMessages(conversation.id);
                      }}
                      className={`w-full p-4 text-left border-b border-slate-100 hover:bg-slate-50 transition ${
                        selectedConversation?.id === conversation.id
                          ? "bg-blue-50"
                          : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-slate-900">
                          Support Chat
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(
                            conversation.status
                          )}`}
                        >
                          {conversation.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 truncate">
                        {conversation.messages?.[0]?.content || "No messages"}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatTime(conversation.updatedAt)}
                      </p>
                      {conversation.unreadCount && conversation.unreadCount > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-xs bg-blue-600 text-white rounded-full mt-1">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>

              {conversations.length > 0 && (
                <div className="p-3 border-t border-slate-200">
                  <button
                    onClick={() => startNewConversation()}
                    disabled={startingChat}
                    className="w-full bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-200 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                    New Conversation
                  </button>
                </div>
              )}
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  {/* Chat Header */}
                  <div className="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedConversation(null)}
                        className="md:hidden p-2 -ml-2 text-slate-400 hover:text-slate-600"
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
                            d="M15 19l-7-7 7-7"
                          />
                        </svg>
                      </button>
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        S
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">Support Team</p>
                        <p className="text-sm text-slate-500">
                          Usually replies within minutes
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${getStatusColor(
                        selectedConversation.status
                      )}`}
                    >
                      {selectedConversation.status}
                    </span>
                  </div>

                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                    {/* Welcome Message */}
                    {messages.length === 0 && (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                          <svg
                            className="w-8 h-8 text-blue-600"
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
                        <h3 className="font-medium text-slate-900 mb-1">
                          Start the conversation
                        </h3>
                        <p className="text-sm text-slate-500">
                          Send a message to begin chatting with support
                        </p>
                      </div>
                    )}

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
                          className={`flex ${
                            isOwn ? "justify-end" : "justify-start"
                          } mb-4`}
                        >
                          <div
                            className={`flex ${
                              isOwn ? "flex-row-reverse" : "flex-row"
                            } items-end gap-2 max-w-[80%]`}
                          >
                            {!isOwn && (
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                S
                              </div>
                            )}
                            <div>
                              {!isOwn && (
                                <p className="text-xs text-slate-500 mb-1 ml-1">
                                  Support
                                </p>
                              )}
                              <div
                                className={`px-4 py-2 rounded-2xl ${
                                  isOwn
                                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-br-md"
                                    : "bg-white text-slate-900 rounded-bl-md shadow-sm"
                                }`}
                              >
                                <p className="text-sm whitespace-pre-wrap break-words">
                                  {message.content}
                                </p>
                              </div>
                              <p
                                className={`text-xs text-slate-400 mt-1 ${
                                  isOwn ? "text-right mr-1" : "ml-1"
                                }`}
                              >
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
                          placeholder="Type your message..."
                          className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-900"
                          rows={2}
                        />
                        <button
                          onClick={handleSendMessage}
                          disabled={!messageInput.trim() || sending}
                          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2"
                        >
                          {sending ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <span className="hidden sm:inline">Send</span>
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
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border-t border-slate-200 bg-slate-100 text-center">
                      <p className="text-sm text-slate-500">
                        This conversation has been closed
                      </p>
                      <button
                        onClick={() => startNewConversation()}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Start a new conversation
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-slate-50">
                  <div className="text-center max-w-sm">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                      <svg
                        className="w-10 h-10 text-blue-600"
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
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">
                      Welcome to Support
                    </h3>
                    <p className="text-slate-500 mb-6">
                      Have a question? Start a conversation with our support team
                      and we&apos;ll help you out.
                    </p>
                    <button
                      onClick={() => startNewConversation()}
                      disabled={startingChat}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50 flex items-center gap-2 mx-auto"
                    >
                      {startingChat ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
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
                              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                            />
                          </svg>
                          Start Conversation
                        </>
                      )}
                    </button>
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

export default function UserChatPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        </div>
      }
    >
      <UserChatPageContent />
    </Suspense>
  );
}
