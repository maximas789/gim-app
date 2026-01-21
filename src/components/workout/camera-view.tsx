"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface CameraViewProps {
  className?: string;
  isActive?: boolean;
}

export const CameraView = forwardRef<HTMLVideoElement, CameraViewProps>(
  function CameraView({ className, isActive = false }, ref) {
    return (
      <div className={cn("relative w-full h-full bg-black rounded-lg overflow-hidden", className)}>
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className={cn(
            "w-full h-full object-cover scale-x-[-1]",
            !isActive && "hidden"
          )}
        />
        {!isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Camera not active</p>
          </div>
        )}
      </div>
    );
  }
);
