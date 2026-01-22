"use client";

import { use, useEffect, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import {
  ArrowLeft,
  Mic,
  MicOff,
  Wifi,
  WifiOff,
  Loader2,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraView } from "@/components/workout/camera-view";
import { RepCounter } from "@/components/workout/rep-counter";
import { WorkoutControls } from "@/components/workout/workout-controls";
import {
  WorkoutProvider,
  useWorkout,
  formatTime,
  type ExerciseType,
} from "@/contexts/workout-context";
import { useCamera } from "@/hooks/use-camera";
import { useGeminiLive } from "@/hooks/use-gemini-live";

const VALID_EXERCISES: ExerciseType[] = ["squat", "deadlift"];

interface WorkoutContentProps {
  exercise: ExerciseType;
}

function WorkoutContent({ exercise }: WorkoutContentProps) {
  const router = useRouter();
  const { state, startWorkout, pauseWorkout, resumeWorkout, endWorkout } =
    useWorkout();

  // Camera setup
  const {
    videoRef,
    isActive: cameraActive,
    error: cameraError,
    isLoading: cameraLoading,
    startCamera,
    stopCamera,
  } = useCamera();

  // Gemini Live for AI coaching
  const {
    connect: connectGemini,
    disconnect: disconnectGemini,
    connectionState,
    isConnected,
    startStreaming,
    stopStreaming,
    isStreaming,
    isSpeaking,
    isMicEnabled,
    setMicEnabled,
  } = useGeminiLive({
    exercise,
    onError: (error) => {
      console.error("Gemini error:", error);
      setGeminiError(error.message);
    },
  });

  // Manual rep tracking (Gemini will announce reps verbally, user can also track manually)
  const [repCount, setRepCount] = useState(0);
  const [goodFormCount, setGoodFormCount] = useState(0);
  const [badFormCount, setBadFormCount] = useState(0);
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Initialize camera and Gemini when starting
  const handleStart = useCallback(async () => {
    setGeminiError(null);
    try {
      // Start camera first
      await startCamera();

      // Connect to Gemini
      await connectGemini();

      // Start workout timer
      startWorkout(exercise);
    } catch (error) {
      console.error("Failed to start workout:", error);
      if (error instanceof Error) {
        setGeminiError(error.message);
      }
    }
  }, [startCamera, connectGemini, startWorkout, exercise, setGeminiError]);

  // Start streaming when camera is active and Gemini is connected
  useEffect(() => {
    if (cameraActive && isConnected && state.isActive && !state.isPaused) {
      const videoElement = videoRef.current;
      if (videoElement) {
        startStreaming(videoElement);
      }
    } else if (isStreaming && (state.isPaused || !state.isActive)) {
      stopStreaming();
    }
  }, [
    cameraActive,
    isConnected,
    state.isActive,
    state.isPaused,
    startStreaming,
    stopStreaming,
    isStreaming,
    videoRef,
  ]);

  // Handle pause
  const handlePause = useCallback(() => {
    pauseWorkout();
    stopStreaming();
  }, [pauseWorkout, stopStreaming]);

  // Handle resume
  const handleResume = useCallback(() => {
    resumeWorkout();
    const videoElement = videoRef.current;
    if (videoElement && isConnected) {
      startStreaming(videoElement);
    }
  }, [resumeWorkout, startStreaming, isConnected, videoRef]);

  // Handle stop - navigate to summary
  const handleStop = useCallback(() => {
    // Stop everything
    stopStreaming();
    disconnectGemini();
    stopCamera();
    endWorkout();

    // Get workout summary data
    const summaryData = {
      exerciseType: exercise,
      totalReps: repCount,
      goodFormReps: goodFormCount,
      badFormReps: badFormCount,
      durationSeconds: state.elapsedSeconds,
      mistakes: [] as string[],
    };

    // Navigate to summary with data
    router.push(
      `/workout/summary?data=${encodeURIComponent(JSON.stringify(summaryData))}`
    );
  }, [
    stopStreaming,
    disconnectGemini,
    stopCamera,
    endWorkout,
    exercise,
    repCount,
    goodFormCount,
    badFormCount,
    state.elapsedSeconds,
    router,
  ]);

  // Manual rep tracking
  const addGoodRep = useCallback(() => {
    setRepCount((prev) => prev + 1);
    setGoodFormCount((prev) => prev + 1);
  }, [setRepCount, setGoodFormCount]);

  const addBadRep = useCallback(() => {
    setRepCount((prev) => prev + 1);
    setBadFormCount((prev) => prev + 1);
  }, [setRepCount, setBadFormCount]);

  const removeRep = useCallback(() => {
    if (repCount > 0) {
      setRepCount((prev) => prev - 1);
      // Remove from good form if possible, otherwise from bad
      if (goodFormCount > 0) {
        setGoodFormCount((prev) => prev - 1);
      } else if (badFormCount > 0) {
        setBadFormCount((prev) => prev - 1);
      }
    }
  }, [repCount, goodFormCount, badFormCount, setRepCount, setGoodFormCount, setBadFormCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
      disconnectGemini();
      stopCamera();
    };
  }, [stopStreaming, disconnectGemini, stopCamera]);

  const isInitializing = cameraLoading || connectionState === "connecting";
  const hasError = cameraError || geminiError;

  // Connection status display
  const getConnectionStatus = () => {
    switch (connectionState) {
      case "connecting":
        return { text: "Connecting to AI coach...", color: "text-yellow-500" };
      case "connected":
        return { text: "AI Coach Active", color: "text-green-500" };
      case "error":
        return { text: "Connection Error", color: "text-red-500" };
      default:
        return { text: "Disconnected", color: "text-muted-foreground" };
    }
  };

  const connectionStatus = getConnectionStatus();

  return (
    <main className="flex-1 flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/workout">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-xl font-semibold capitalize">{exercise}</h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1.5">
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-muted-foreground" />
            )}
            <span className={`text-xs ${connectionStatus.color}`}>
              {connectionStatus.text}
            </span>
          </div>
          {/* Speaking indicator */}
          {isSpeaking && (
            <span className="text-xs text-blue-500 animate-pulse">
              Speaking...
            </span>
          )}
          {/* Mic toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMicEnabled(!isMicEnabled)}
            title={isMicEnabled ? "Mute microphone" : "Enable microphone"}
            disabled={!isConnected}
          >
            {isMicEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 relative">
        {/* Camera view */}
        <CameraView
          ref={videoRef}
          isActive={cameraActive}
          className="w-full h-full"
        />

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {cameraLoading
                  ? "Starting camera..."
                  : "Connecting to AI coach..."}
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && !isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center max-w-md px-4">
              <p className="text-red-500 mb-4">{cameraError || geminiError}</p>
              <Button onClick={handleStart}>Try Again</Button>
            </div>
          </div>
        )}

        {/* Workout UI overlays (only when active) */}
        {state.isActive && (
          <>
            {/* Rep counter - top right */}
            <div className="absolute top-4 right-4">
              <RepCounter
                totalReps={repCount}
                goodFormReps={goodFormCount}
                badFormReps={badFormCount}
                elapsedTime={formatTime(state.elapsedSeconds)}
              />
            </div>

            {/* AI Status indicator - top left */}
            <div className="absolute top-4 left-4">
              <div className="bg-background/90 backdrop-blur rounded-lg p-3 shadow-lg">
                <div className="flex items-center gap-2 mb-2">
                  {isConnected ? (
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {isConnected ? "AI Coach Active" : "AI Disconnected"}
                  </span>
                </div>
                {isConnected && (
                  <p className="text-xs text-muted-foreground">
                    Watching your form in real-time
                  </p>
                )}
              </div>
            </div>

            {/* Manual rep buttons - bottom left */}
            <div className="absolute bottom-4 left-4">
              <div className="bg-background/90 backdrop-blur rounded-lg p-2 shadow-lg">
                <p className="text-xs text-muted-foreground mb-2 text-center">
                  Manual Rep Count
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={removeRep}
                    disabled={repCount === 0}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addGoodRep}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Good
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={addBadRep}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Bad
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Controls */}
      <div className="px-4 py-4 border-t bg-background">
        <WorkoutControls
          isActive={state.isActive}
          isPaused={state.isPaused}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStop={handleStop}
        />
      </div>
    </main>
  );
}

interface PageProps {
  params: Promise<{ exercise: string }>;
}

export default function WorkoutExercisePage({ params }: PageProps) {
  const { exercise } = use(params);

  // Validate exercise type
  if (!VALID_EXERCISES.includes(exercise as ExerciseType)) {
    notFound();
  }

  return (
    <WorkoutProvider>
      <WorkoutContent exercise={exercise as ExerciseType} />
    </WorkoutProvider>
  );
}
