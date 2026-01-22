"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "./tour-provider";

export function HelpButton() {
  const { startTour, isRunning } = useTour();

  if (isRunning) {
    return null;
  }

  return (
    <Button
      variant="secondary"
      size="icon"
      onClick={startTour}
      className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
      title="Show help tour"
    >
      <CircleHelp className="h-6 w-6" />
      <span className="sr-only">Show help tour</span>
    </Button>
  );
}
