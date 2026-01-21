"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import type {
  WorkerMessageIn,
  WorkerMessageOut,
} from "@/workers/pose-detection.worker";

export type Landmark = {
  x: number;
  y: number;
  z: number;
  visibility: number;
};

export interface UsePoseDetectionReturn {
  landmarks: Landmark[] | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  initialize: () => void;
  detectPose: (video: HTMLVideoElement) => void;
  destroy: () => void;
}

export function usePoseDetection(): UsePoseDetectionReturn {
  const workerRef = useRef<Worker | null>(null);
  const [landmarks, setLandmarks] = useState<Landmark[] | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const frameIdRef = useRef<number | null>(null);

  // Clean up worker on unmount
  useEffect(() => {
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (workerRef.current) {
        const message: WorkerMessageIn = { type: "DESTROY" };
        workerRef.current.postMessage(message);
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  const initialize = useCallback(() => {
    if (workerRef.current || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create worker from the worker file
      workerRef.current = new Worker(
        new URL("@/workers/pose-detection.worker.ts", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e: MessageEvent<WorkerMessageOut>) => {
        const message = e.data;

        switch (message.type) {
          case "READY":
            setIsReady(true);
            setIsLoading(false);
            break;

          case "INIT_ERROR":
            setError(message.error);
            setIsLoading(false);
            break;

          case "RESULT":
            setLandmarks(message.landmarks);
            break;

          case "DETECTION_ERROR":
            console.warn("Pose detection error:", message.error);
            break;

          case "DESTROYED":
            setIsReady(false);
            setLandmarks(null);
            break;
        }
      };

      workerRef.current.onerror = (e) => {
        setError(`Worker error: ${e.message}`);
        setIsLoading(false);
      };

      // Initialize the PoseLandmarker
      const initMessage: WorkerMessageIn = { type: "INIT" };
      workerRef.current.postMessage(initMessage);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create worker";
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [isLoading]);

  const detectPose = useCallback((video: HTMLVideoElement) => {
    if (!workerRef.current || !isReady) {
      return;
    }

    // Check if video is ready
    if (video.readyState < 2) {
      return;
    }

    // Create an ImageBitmap from the video frame
    createImageBitmap(video)
      .then((imageBitmap) => {
        if (!workerRef.current) {
          imageBitmap.close();
          return;
        }

        const message: WorkerMessageIn = {
          type: "DETECT",
          imageData: imageBitmap,
          timestamp: performance.now(),
        };

        workerRef.current.postMessage(message, [imageBitmap]);
      })
      .catch((err) => {
        console.warn("Failed to create ImageBitmap:", err);
      });
  }, [isReady]);

  const destroy = useCallback(() => {
    if (frameIdRef.current) {
      cancelAnimationFrame(frameIdRef.current);
      frameIdRef.current = null;
    }

    if (workerRef.current) {
      const message: WorkerMessageIn = { type: "DESTROY" };
      workerRef.current.postMessage(message);
      workerRef.current.terminate();
      workerRef.current = null;
    }

    setIsReady(false);
    setLandmarks(null);
    setError(null);
  }, []);

  return {
    landmarks,
    isReady,
    isLoading,
    error,
    initialize,
    detectPose,
    destroy,
  };
}
