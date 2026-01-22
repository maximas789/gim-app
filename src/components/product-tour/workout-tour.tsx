"use client";

import { useEffect, useState } from "react";
import { useTour } from "./tour-provider";

interface Step {
  target: string;
  content: string;
  placement?: string;
  disableBeacon?: boolean;
  title?: string;
}

const tourSteps: Step[] = [
  {
    target: "body",
    content:
      "Welcome to GymCoach! Your AI-powered personal trainer will watch your form and give real-time voice feedback during your workout.",
    placement: "center",
    disableBeacon: true,
    title: "Welcome to GymCoach",
  },
  {
    target: '[data-tour="camera"]',
    content:
      "Position yourself sideways to the camera with your full body visible. This ensures accurate form detection for exercises like squats and deadlifts.",
    placement: "bottom",
    title: "Camera Setup",
  },
  {
    target: '[data-tour="workout-controls"]',
    content:
      "Click 'Start Workout' when you're ready. You can pause anytime and end the workout to see your summary.",
    placement: "top",
    title: "Workout Controls",
  },
  {
    target: '[data-tour="rep-counter"]',
    content:
      "Your rep count appears here. Green numbers show reps with good form, red shows reps that need improvement.",
    placement: "left",
    title: "Rep Counter",
  },
  {
    target: '[data-tour="ai-status"]',
    content:
      "This indicator shows your AI coach's connection status. When active, it watches every rep and provides voice feedback on your form.",
    placement: "right",
    title: "AI Coach Status",
  },
  {
    target: '[data-tour="manual-reps"]',
    content:
      "If the AI counting seems off, use these buttons to manually adjust your rep count. Tap + Good for proper form, + Bad for form corrections.",
    placement: "right",
    title: "Manual Rep Tracking",
  },
  {
    target: '[data-tour="mic-toggle"]',
    content:
      "Toggle your microphone to talk with your AI coach. Ask questions or request tips during your workout!",
    placement: "bottom",
    title: "Voice Communication",
  },
];

// Steps shown when workout hasn't started yet (fewer elements visible)
const preWorkoutSteps: Step[] = [
  tourSteps[0]!, // Welcome
  tourSteps[1]!, // Camera
  tourSteps[2]!, // Controls
];

interface WorkoutTourProps {
  isWorkoutActive?: boolean;
}

export function WorkoutTour({ isWorkoutActive = false }: WorkoutTourProps) {
  const {
    isRunning,
    stepIndex,
    hasCompletedTour,
    startTour,
    setStepIndex,
    completeTour,
  } = useTour();

  const [JoyrideComponent, setJoyrideComponent] = useState<React.ElementType | null>(null);

  // Dynamically import Joyride on client side only
  useEffect(() => {
    import("react-joyride").then((mod) => {
      setJoyrideComponent(() => mod.default as React.ElementType);
    });
  }, []);

  // Auto-start tour on first visit (only when not in workout)
  useEffect(() => {
    if (!hasCompletedTour && !isWorkoutActive && JoyrideComponent) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [hasCompletedTour, isWorkoutActive, startTour, JoyrideComponent]);

  const handleJoyrideCallback = (data: {
    action: string;
    index: number;
    status: string;
    type: string;
  }) => {
    const { action, index, status, type } = data;

    if (type === "step:after" && action === "next") {
      setStepIndex(index + 1);
    } else if (type === "step:after" && action === "prev") {
      setStepIndex(index - 1);
    }

    // Handle tour completion or skip
    if (status === "finished" || status === "skipped") {
      completeTour();
    }
  };

  // Use different steps based on workout state
  const steps = isWorkoutActive ? tourSteps : preWorkoutSteps;

  // Don't render until Joyride is loaded
  if (!JoyrideComponent) {
    return null;
  }

  return (
    <JoyrideComponent
      steps={steps}
      run={isRunning}
      stepIndex={stepIndex}
      continuous
      showSkipButton
      showProgress
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.7)",
          zIndex: 10000,
        },
        tooltip: {
          borderRadius: "0.5rem",
          padding: "1rem",
        },
        tooltipTitle: {
          fontSize: "1.125rem",
          fontWeight: 600,
          marginBottom: "0.5rem",
        },
        tooltipContent: {
          fontSize: "0.875rem",
          lineHeight: 1.5,
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          color: "hsl(var(--primary-foreground))",
          borderRadius: "0.375rem",
          padding: "0.5rem 1rem",
          fontSize: "0.875rem",
          fontWeight: 500,
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
          marginRight: "0.5rem",
          fontSize: "0.875rem",
        },
        buttonSkip: {
          color: "hsl(var(--muted-foreground))",
          fontSize: "0.875rem",
        },
        spotlight: {
          borderRadius: "0.5rem",
        },
      }}
      locale={{
        back: "Back",
        close: "Close",
        last: "Got it!",
        next: "Next",
        skip: "Skip tour",
      }}
    />
  );
}
