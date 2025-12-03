"use client";

import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import GuidedTour from "./index";
import { getTourSteps } from "./tourSteps";

export default function TourProvider() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Don't show tour while loading or if not logged in
  if (status === "loading" || !session?.user) {
    return null;
  }

  // Get appropriate tour steps based on user role
  const tourSteps = getTourSteps(session.user.role);

  // Determine storage key based on role
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "MANAGER"].includes(session.user.role);
  const storageKey = isAdmin ? "adminTourCompleted" : "userTourCompleted";

  // Only show tour on main pages
  const isValidPage = isAdmin
    ? pathname.startsWith("/admin")
    : !pathname.startsWith("/admin") && !pathname.includes("/login") && !pathname.includes("/register");

  if (!isValidPage) {
    return null;
  }

  return (
    <GuidedTour
      steps={tourSteps}
      storageKey={storageKey}
      onComplete={() => {
        console.log("Tour completed!");
      }}
      onSkip={() => {
        console.log("Tour skipped");
      }}
    />
  );
}
