"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface WorkoutControlsProps {
  isActive: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  className?: string;
}

export function WorkoutControls({
  isActive,
  isPaused,
  onStart,
  onPause,
  onResume,
  onStop,
  className,
}: WorkoutControlsProps) {
  if (!isActive) {
    return (
      <div data-tour="workout-controls" className={cn("flex justify-center gap-4", className)}>
        <Button size="lg" onClick={onStart} className="text-lg px-8 py-6">
          Start Workout
        </Button>
      </div>
    );
  }

  return (
    <div data-tour="workout-controls" className={cn("flex justify-center gap-4", className)}>
      {isPaused ? (
        <Button
          size="lg"
          onClick={onResume}
          className="text-lg px-8 py-6"
        >
          Resume
        </Button>
      ) : (
        <Button
          size="lg"
          variant="secondary"
          onClick={onPause}
          className="text-lg px-8 py-6"
        >
          Pause
        </Button>
      )}
      <Button
        size="lg"
        variant="destructive"
        onClick={onStop}
        className="text-lg px-8 py-6"
      >
        End Workout
      </Button>
    </div>
  );
}
