"use client";

import { cn } from "@/lib/utils";

interface RepCounterProps {
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  elapsedTime: string;
  className?: string;
}

export function RepCounter({
  totalReps,
  goodFormReps,
  badFormReps,
  elapsedTime,
  className,
}: RepCounterProps) {
  return (
    <div
      data-tour="rep-counter"
      className={cn(
        "bg-background/80 backdrop-blur-sm rounded-lg p-4 shadow-lg",
        className
      )}
    >
      <div className="text-center">
        <div className="text-6xl font-bold tabular-nums">{totalReps}</div>
        <div className="text-muted-foreground text-sm uppercase tracking-wide">
          Reps
        </div>
      </div>

      <div className="flex justify-center gap-6 mt-4">
        <div className="text-center">
          <div className="text-2xl font-semibold text-green-500 tabular-nums">
            {goodFormReps}
          </div>
          <div className="text-xs text-muted-foreground">Good</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-semibold text-red-500 tabular-nums">
            {badFormReps}
          </div>
          <div className="text-xs text-muted-foreground">Bad</div>
        </div>
      </div>

      <div className="text-center mt-4 pt-4 border-t">
        <div className="text-xl font-mono tabular-nums">{elapsedTime}</div>
        <div className="text-xs text-muted-foreground">Duration</div>
      </div>
    </div>
  );
}
