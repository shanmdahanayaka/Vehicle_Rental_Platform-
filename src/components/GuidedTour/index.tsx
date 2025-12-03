"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export interface TourStep {
  id: string;
  target?: string; // CSS selector for the element to highlight
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: "click" | "hover" | "none";
  route?: string; // Route where this step should be shown
  spotlight?: boolean; // Whether to spotlight the target element
}

interface GuidedTourProps {
  steps: TourStep[];
  onComplete?: () => void;
  onSkip?: () => void;
  storageKey?: string;
}

export default function GuidedTour({
  steps,
  onComplete,
  onSkip,
  storageKey = "guidedTourCompleted",
}: GuidedTourProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [currentStep, setCurrentStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [hasCompleted, setHasCompleted] = useState(true);

  // Check if tour was already completed
  useEffect(() => {
    if (typeof window !== "undefined" && session?.user?.id) {
      const completed = localStorage.getItem(`${storageKey}_${session.user.id}`);
      if (!completed) {
        setHasCompleted(false);
        setIsVisible(true);
      }
    }
  }, [session?.user?.id, storageKey]);

  // Get current step data
  const step = steps[currentStep];

  // Update target element position
  const updateTargetPosition = useCallback(() => {
    if (step?.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    } else {
      setTargetRect(null);
    }
  }, [step?.target]);

  useEffect(() => {
    updateTargetPosition();
    window.addEventListener("resize", updateTargetPosition);
    window.addEventListener("scroll", updateTargetPosition);

    // Update position after a short delay to account for animations
    const timeout = setTimeout(updateTargetPosition, 100);

    return () => {
      window.removeEventListener("resize", updateTargetPosition);
      window.removeEventListener("scroll", updateTargetPosition);
      clearTimeout(timeout);
    };
  }, [updateTargetPosition, currentStep]);

  // Filter steps by current route
  const relevantSteps = steps.filter(
    (s) => !s.route || s.route === pathname || pathname.startsWith(s.route)
  );

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (session?.user?.id) {
      localStorage.setItem(`${storageKey}_${session.user.id}`, "true");
    }
    setHasCompleted(true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    if (session?.user?.id) {
      localStorage.setItem(`${storageKey}_${session.user.id}`, "true");
    }
    setHasCompleted(true);
    setIsVisible(false);
    onSkip?.();
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setHasCompleted(false);
    setIsVisible(true);
    if (session?.user?.id) {
      localStorage.removeItem(`${storageKey}_${session.user.id}`);
    }
  };

  if (!isVisible || hasCompleted || !step) {
    return null;
  }

  // Calculate tooltip position
  const getTooltipPosition = () => {
    if (!targetRect || step.position === "center") {
      return {
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      };
    }

    const padding = 16;
    const tooltipWidth = 400;
    const tooltipHeight = 200;

    switch (step.position || "bottom") {
      case "top":
        return {
          top: `${targetRect.top - tooltipHeight - padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "bottom":
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
      case "left":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.left - tooltipWidth - padding}px`,
          transform: "translateY(-50%)",
        };
      case "right":
        return {
          top: `${targetRect.top + targetRect.height / 2}px`,
          left: `${targetRect.right + padding}px`,
          transform: "translateY(-50%)",
        };
      default:
        return {
          top: `${targetRect.bottom + padding}px`,
          left: `${targetRect.left + targetRect.width / 2}px`,
          transform: "translateX(-50%)",
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" />

      {/* Spotlight on target element */}
      {targetRect && step.spotlight !== false && (
        <div
          className="fixed z-[9999] rounded-xl ring-4 ring-blue-500 ring-offset-4 ring-offset-transparent shadow-2xl"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            pointerEvents: "none",
          }}
        />
      )}

      {/* Tooltip */}
      <div
        className="fixed z-[10000] w-[400px] max-w-[90vw] rounded-2xl bg-white p-6 shadow-2xl"
        style={tooltipPosition}
      >
        {/* Progress indicator */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-sm font-bold text-white">
              {currentStep + 1}
            </div>
            <span className="text-sm text-slate-500">
              of {steps.length}
            </span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-400 hover:text-slate-600 transition"
          >
            Skip tour
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 w-full bg-slate-100 rounded-full mb-4 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Content */}
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          {step.title}
        </h3>
        <p className="text-slate-600 mb-6 leading-relaxed">
          {step.content}
        </p>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Previous
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/25 transition"
          >
            {currentStep === steps.length - 1 ? (
              <>
                Get Started
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </>
            ) : (
              <>
                Next
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

// Hook to trigger tour restart
export function useTour(storageKey: string = "guidedTourCompleted") {
  const { data: session } = useSession();

  const restartTour = useCallback(() => {
    if (session?.user?.id) {
      localStorage.removeItem(`${storageKey}_${session.user.id}`);
      window.location.reload();
    }
  }, [session?.user?.id, storageKey]);

  const hasCompletedTour = useCallback(() => {
    if (typeof window !== "undefined" && session?.user?.id) {
      return !!localStorage.getItem(`${storageKey}_${session.user.id}`);
    }
    return true;
  }, [session?.user?.id, storageKey]);

  return { restartTour, hasCompletedTour };
}
