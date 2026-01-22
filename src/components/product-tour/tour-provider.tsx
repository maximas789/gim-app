"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

const TOUR_STORAGE_KEY = "gymcoach-tour-completed";

// Helper to read from localStorage with SSR safety
function getStoredTourCompletion(): boolean {
  if (typeof window === "undefined") return true; // Default to true on server
  return localStorage.getItem(TOUR_STORAGE_KEY) === "true";
}

// Subscribe to storage changes
function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

interface TourContextValue {
  isRunning: boolean;
  stepIndex: number;
  hasCompletedTour: boolean;
  startTour: () => void;
  stopTour: () => void;
  setStepIndex: (index: number) => void;
  completeTour: () => void;
  resetTourHistory: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function TourProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Use useSyncExternalStore to safely read from localStorage
  const hasCompletedTour = useSyncExternalStore(
    subscribeToStorage,
    getStoredTourCompletion,
    () => true // Server snapshot - default to true to avoid showing tour during SSR
  );

  const startTour = useCallback(() => {
    setStepIndex(0);
    setIsRunning(true);
  }, []);

  const stopTour = useCallback(() => {
    setIsRunning(false);
  }, []);

  const completeTour = useCallback(() => {
    setIsRunning(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
    // Dispatch storage event to trigger re-render
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  const resetTourHistory = useCallback(() => {
    localStorage.removeItem(TOUR_STORAGE_KEY);
    // Dispatch storage event to trigger re-render
    window.dispatchEvent(new StorageEvent("storage"));
  }, []);

  return (
    <TourContext.Provider
      value={{
        isRunning,
        stepIndex,
        hasCompletedTour,
        startTour,
        stopTour,
        setStepIndex,
        completeTour,
        resetTourHistory,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }
  return context;
}
