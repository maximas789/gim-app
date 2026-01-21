"use client";

import { use, useEffect, useRef, useCallback, useState } from "react";
import Link from "next/link";
import { useRouter, notFound } from "next/navigation";
import { ArrowLeft, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CameraView } from "@/components/workout/camera-view";
import { FormIndicator } from "@/components/workout/form-indicator";
import { PoseOverlay } from "@/components/workout/pose-overlay";
import { RepCounter } from "@/components/workout/rep-counter";
import { WorkoutControls } from "@/components/workout/workout-controls";
import {
  WorkoutProvider,
  useWorkout,
  formatTime,
  type ExerciseType,
} from "@/contexts/workout-context";
import { useCamera } from "@/hooks/use-camera";
import { useFormChecker } from "@/hooks/use-form-checker";
import { usePoseDetection } from "@/hooks/use-pose-detection";
import { useVoiceFeedback } from "@/hooks/use-voice-feedback";

const VALID_EXERCISES: ExerciseType[] = ["squat", "deadlift"];

interface WorkoutContentProps {
  exercise: ExerciseType;
}

function WorkoutContent({ exercise }: WorkoutContentProps) {
  const router = useRouter();
  const { state, startWorkout, pauseWorkout, resumeWorkout, endWorkout } =
    useWorkout();

  // Camera setup
  const { videoRef, isActive: cameraActive, error: cameraError, isLoading: cameraLoading, startCamera, stopCamera } =
    useCamera();

  // Pose detection
  const {
    landmarks,
    isReady: poseReady,
    isLoading: poseLoading,
    error: poseError,
    initialize: initializePose,
    detectPose,
    destroy: destroyPose,
  } = usePoseDetection();

  // Form checking
  const {
    analysis,
    repCount,
    goodFormCount,
    badFormCount,
    allMistakes,
    analyzeLandmarks,
  } = useFormChecker(exercise);

  // Voice feedback
  const { speakIssue, speakRepComplete, stop: stopSpeech, isEnabled: voiceEnabled, setEnabled: setVoiceEnabled } =
    useVoiceFeedback();

  // Video dimensions for overlay
  const [videoDimensions, setVideoDimensions] = useState({ width: 640, height: 480 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Animation frame ref for detection loop
  const animationRef = useRef<number | null>(null);
  const lastDetectionRef = useRef<number>(0);

  // Track previous rep count for voice feedback
  const prevRepCountRef = useRef(0);

  // Handle video dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setVideoDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Initialize camera and pose detection when starting
  const handleStart = useCallback(async () => {
    await startCamera();
    initializePose();
    startWorkout(exercise);
  }, [startCamera, initializePose, startWorkout, exercise]);

  // Detection loop
  useEffect(() => {
    if (!state.isActive || state.isPaused || !cameraActive || !poseReady) {
      return;
    }

    const runDetection = () => {
      const now = performance.now();
      // Limit to ~15 FPS for performance
      if (now - lastDetectionRef.current >= 66) {
        if (videoRef.current) {
          detectPose(videoRef.current);
        }
        lastDetectionRef.current = now;
      }
      animationRef.current = requestAnimationFrame(runDetection);
    };

    animationRef.current = requestAnimationFrame(runDetection);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [state.isActive, state.isPaused, cameraActive, poseReady, detectPose, videoRef]);

  // Analyze landmarks when they change
  useEffect(() => {
    if (landmarks && state.isActive && !state.isPaused) {
      const result = analyzeLandmarks(landmarks);

      // Voice feedback for issues
      if (result && result.issues.length > 0 && result.issues[0]) {
        speakIssue(result.issues[0]);
      }
    }
  }, [landmarks, state.isActive, state.isPaused, analyzeLandmarks, speakIssue]);

  // Voice feedback when rep completes
  useEffect(() => {
    if (repCount > prevRepCountRef.current) {
      const wasGoodForm = goodFormCount > (prevRepCountRef.current > 0 ? prevRepCountRef.current - (goodFormCount - 1) : 0);
      speakRepComplete(wasGoodForm);
    }
    prevRepCountRef.current = repCount;
  }, [repCount, goodFormCount, speakRepComplete]);

  // Handle pause
  const handlePause = useCallback(() => {
    pauseWorkout();
  }, [pauseWorkout]);

  // Handle resume
  const handleResume = useCallback(() => {
    resumeWorkout();
  }, [resumeWorkout]);

  // Handle stop - navigate to summary
  const handleStop = useCallback(() => {
    // Stop detection
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    stopSpeech();
    stopCamera();
    destroyPose();
    endWorkout();

    // Get workout summary data
    const summaryData = {
      exerciseType: exercise,
      totalReps: repCount,
      goodFormReps: goodFormCount,
      badFormReps: badFormCount,
      durationSeconds: state.elapsedSeconds,
      mistakes: allMistakes,
    };

    // Navigate to summary with data
    router.push(`/workout/summary?data=${encodeURIComponent(JSON.stringify(summaryData))}`);
  }, [
    stopSpeech,
    stopCamera,
    destroyPose,
    endWorkout,
    exercise,
    repCount,
    goodFormCount,
    badFormCount,
    state.elapsedSeconds,
    allMistakes,
    router,
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      stopSpeech();
      stopCamera();
      destroyPose();
    };
  }, [stopSpeech, stopCamera, destroyPose]);

  const isInitializing = cameraLoading || poseLoading;
  const hasError = cameraError || poseError;

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
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setVoiceEnabled(!voiceEnabled)}
          title={voiceEnabled ? "Mute voice feedback" : "Enable voice feedback"}
        >
          {voiceEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 relative" ref={containerRef}>
        {/* Camera view */}
        <CameraView
          ref={videoRef}
          isActive={cameraActive}
          className="w-full h-full"
        />

        {/* Pose overlay */}
        {landmarks && cameraActive && (
          <PoseOverlay
            landmarks={landmarks}
            width={videoDimensions.width}
            height={videoDimensions.height}
            isGoodForm={analysis?.isGoodForm ?? true}
          />
        )}

        {/* Loading overlay */}
        {isInitializing && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                {cameraLoading ? "Starting camera..." : "Loading pose detection..."}
              </p>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {hasError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center max-w-md px-4">
              <p className="text-red-500 mb-4">{cameraError || poseError}</p>
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

            {/* Form indicator - top left */}
            {analysis && (
              <div className="absolute top-4 left-4">
                <FormIndicator
                  isGoodForm={analysis.isGoodForm}
                  issues={analysis.issues}
                />
              </div>
            )}
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
