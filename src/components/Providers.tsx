"use client";

import { SessionProvider } from "next-auth/react";
import { UIProvider } from "./ui/UIProvider";
import { NotificationProvider } from "./notifications/NotificationProvider";
import { ChatProvider } from "./chat/ChatProvider";
import ChatWidget from "./chat/ChatWidget";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <UIProvider>
        <NotificationProvider>
          <ChatProvider>
            {children}
            <ChatWidget />
          </ChatProvider>
        </NotificationProvider>
      </UIProvider>
    </SessionProvider>
  );
}
