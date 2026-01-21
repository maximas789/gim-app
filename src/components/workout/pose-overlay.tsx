"use client";

import { useEffect, useRef, useCallback } from "react";
import { LANDMARKS } from "@/lib/pose-utils";
import { cn } from "@/lib/utils";

interface PoseOverlayProps {
  landmarks: Array<{ x: number; y: number; z?: number; visibility?: number }> | null;
  width: number;
  height: number;
  className?: string;
  isGoodForm?: boolean;
}

// Skeleton connections for visualization
const SKELETON_CONNECTIONS: [number, number][] = [
  // Torso
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.RIGHT_SHOULDER],
  [LANDMARKS.LEFT_SHOULDER, LANDMARKS.LEFT_HIP],
  [LANDMARKS.RIGHT_SHOULDER, LANDMARKS.RIGHT_HIP],
  [LANDMARKS.LEFT_HIP, LANDMARKS.RIGHT_HIP],
  // Left leg
  [LANDMARKS.LEFT_HIP, LANDMARKS.LEFT_KNEE],
  [LANDMARKS.LEFT_KNEE, LANDMARKS.LEFT_ANKLE],
  // Right leg
  [LANDMARKS.RIGHT_HIP, LANDMARKS.RIGHT_KNEE],
  [LANDMARKS.RIGHT_KNEE, LANDMARKS.RIGHT_ANKLE],
];

export function PoseOverlay({
  landmarks,
  width,
  height,
  className,
  isGoodForm = true,
}: PoseOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawSkeleton = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set colors based on form quality
    const lineColor = isGoodForm ? "#22c55e" : "#ef4444"; // green-500 or red-500
    const pointColor = isGoodForm ? "#16a34a" : "#dc2626"; // green-600 or red-600

    // Draw connections
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    for (const [startIdx, endIdx] of SKELETON_CONNECTIONS) {
      const start = landmarks[startIdx];
      const end = landmarks[endIdx];

      if (!start || !end) continue;

      // Check visibility
      const startVisible = (start.visibility ?? 1) > 0.5;
      const endVisible = (end.visibility ?? 1) > 0.5;

      if (!startVisible || !endVisible) continue;

      // Mirror the x-coordinate to match mirrored video
      const startX = (1 - start.x) * width;
      const startY = start.y * height;
      const endX = (1 - end.x) * width;
      const endY = end.y * height;

      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
    }

    // Draw landmark points
    ctx.fillStyle = pointColor;

    const relevantLandmarks = [
      LANDMARKS.LEFT_SHOULDER,
      LANDMARKS.RIGHT_SHOULDER,
      LANDMARKS.LEFT_HIP,
      LANDMARKS.RIGHT_HIP,
      LANDMARKS.LEFT_KNEE,
      LANDMARKS.RIGHT_KNEE,
      LANDMARKS.LEFT_ANKLE,
      LANDMARKS.RIGHT_ANKLE,
    ];

    for (const idx of relevantLandmarks) {
      const landmark = landmarks[idx];
      if (!landmark) continue;

      const visible = (landmark.visibility ?? 1) > 0.5;
      if (!visible) continue;

      // Mirror the x-coordinate
      const x = (1 - landmark.x) * width;
      const y = landmark.y * height;

      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();
    }
  }, [landmarks, width, height, isGoodForm]);

  useEffect(() => {
    drawSkeleton();
  }, [drawSkeleton]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={cn("absolute inset-0 pointer-events-none", className)}
    />
  );
}
