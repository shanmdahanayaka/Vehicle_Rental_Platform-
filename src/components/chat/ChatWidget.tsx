"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useChat, ChatMessage, Conversation } from "./ChatProvider";

function formatTime(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function MessageBubble({ message, isOwn }: { message: ChatMessage; isOwn: boolean }) {
  if (message.type === "SYSTEM") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`flex ${isOwn ? "flex-row-reverse" : "flex-row"} items-end gap-2 max-w-[80%]`}>
        {!isOwn && (
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {message.sender.name?.charAt(0) || "?"}
          </div>
        )}
        <div>
          {!isOwn && (
            <p className="text-xs text-slate-500 mb-1 ml-1">{message.sender.name}</p>
          )}
          <div
            className={`px-4 py-2 rounded-2xl ${
              isOwn
                ? "bg-blue-600 text-white rounded-br-md"
                : "bg-slate-100 text-slate-900 rounded-bl-md"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          </div>
          <p className={`text-xs text-slate-400 mt-1 ${isOwn ? "text-right mr-1" : "ml-1"}`}>
            {formatTime(message.createdAt)}
          </p>
        </div>
      </div>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition ${
        isActive ? "bg-blue-50" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
          {conversation.title?.charAt(0) || "S"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="font-medium text-slate-900 truncate">
              {conversation.title || "Support Chat"}
            </p>
            {conversation.unreadCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {conversation.unreadCount}
              </span>
            )}
          </div>
          {conversation.lastMessage && (
            <p className="text-sm text-slate-500 truncate">
              {conversation.lastMessage.content}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1">
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
            <span className="text-xs text-slate-400">
              {formatTime(conversation.updatedAt)}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ChatWidget() {
  const { data: session } = useSession();
  const chatContext = useChat();

  // Destructure with explicit typing to help TypeScript
  const conversations: Conversation[] = chatContext.conversations;
  const activeConversation: Conversation | null = chatContext.activeConversation;
  const messages: ChatMessage[] = chatContext.messages;
  const loading = chatContext.loading;
  const sending = chatContext.sending;
  const isOpen = chatContext.isOpen;
  const typingUsers = chatContext.typingUsers;
  const openChat = chatContext.openChat;
  const closeChat = chatContext.closeChat;
  const setActiveConversation = chatContext.setActiveConversation;
  const sendMessage = chatContext.sendMessage;
  const startNewConversation = chatContext.startNewConversation;
  const totalUnreadCount = chatContext.totalUnreadCount;

  const [messageInput, setMessageInput] = useState("");
  const [showConversations, setShowConversations] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Focus input when conversation opens
  useEffect(() => {
    if (activeConversation && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeConversation]);

  const handleSend = async () => {
    if (!messageInput.trim() || sending) return;

    const message = messageInput;
    setMessageInput("");
    await sendMessage(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleStartNewChat = async () => {
    await startNewConversation();
    setShowConversations(false);
  };

  if (!session) return null;

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => openChat()}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 transition-all hover:scale-105 z-40 ${
          isOpen ? "hidden" : "flex"
        } items-center justify-center`}
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
        {totalUnreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {totalUnreadCount > 9 ? "9+" : totalUnreadCount}
          </span>
        )}
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[calc(100vh-6rem)] bg-white rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {activeConversation && !showConversations && (
                <button
                  onClick={() => {
                    setActiveConversation(null);
                    setShowConversations(true);
                  }}
                  className="text-white/80 hover:text-white"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              )}
              <div>
                <h3 className="font-semibold text-white">
                  {activeConversation ? activeConversation.title || "Support Chat" : "Messages"}
                </h3>
                {activeConversation && (
                  <p className="text-xs text-white/70">
                    {activeConversation.status === "OPEN"
                      ? "Online"
                      : activeConversation.status === "WAITING"
                      ? "Waiting for response"
                      : "Closed"}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={closeChat}
              className="text-white/80 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          {showConversations && !activeConversation ? (
            // Conversations List
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full px-6 text-center">
                  <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                      />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-slate-900 mb-2">No conversations yet</h4>
                  <p className="text-sm text-slate-500 mb-6">
                    Start a conversation with our support team
                  </p>
                  <button
                    onClick={handleStartNewChat}
                    className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                  >
                    Start New Chat
                  </button>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-slate-100">
                    {conversations.map((conversation) => {
                      const isActive = (activeConversation as Conversation | null)?.id === conversation.id;
                      return (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          isActive={isActive}
                          onClick={() => {
                            setActiveConversation(conversation);
                            setShowConversations(false);
                          }}
                        />
                      );
                    })}
                  </div>
                  <div className="p-4 border-t border-slate-200">
                    <button
                      onClick={handleStartNewChat}
                      className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition"
                    >
                      Start New Conversation
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            // Chat Messages
            <>
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-slate-500">No messages yet. Say hello!</p>
                  </div>
                ) : (
                  <>
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        isOwn={message.senderId === session.user.id}
                      />
                    ))}
                    {typingUsers.length > 0 && (
                      <div className="flex items-center gap-2 text-sm text-slate-500 ml-10">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100" />
                          <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200" />
                        </div>
                        <span>{typingUsers.join(", ")} typing...</span>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Input */}
              {activeConversation?.status !== "CLOSED" ? (
                <div className="p-4 border-t border-slate-200 bg-white">
                  <div className="flex gap-2">
                    <textarea
                      ref={inputRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Type a message..."
                      className="flex-1 resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-h-32"
                      rows={1}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!messageInput.trim() || sending}
                      className="bg-blue-600 text-white p-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    >
                      {sending ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              ) : (
                <div className="p-4 border-t border-slate-200 bg-slate-50 text-center">
                  <p className="text-sm text-slate-500">This conversation has been closed</p>
                  <button
                    onClick={handleStartNewChat}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Start a new conversation
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
