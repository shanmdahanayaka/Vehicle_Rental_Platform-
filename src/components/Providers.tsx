"use client";

import { useEffect } from "react";
import { SessionProvider } from "next-auth/react";
import { UIProvider } from "./ui/UIProvider";
import { NotificationProvider } from "./notifications/NotificationProvider";
import { ChatProvider } from "./chat/ChatProvider";
import ChatWidget from "./chat/ChatWidget";
import TourProvider from "./GuidedTour/TourProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  // Unregister any stale service workers that might interfere with API calls
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }
  }, []);

  return (
    <SessionProvider>
      <UIProvider>
        <NotificationProvider>
          <ChatProvider>
            {children}
            <ChatWidget />
            <TourProvider />
          </ChatProvider>
        </NotificationProvider>
      </UIProvider>
    </SessionProvider>
  );
}
