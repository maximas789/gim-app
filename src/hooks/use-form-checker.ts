"use client";
import { useRef, useCallback, useState } from "react";
import {
  type Exercise,
  type FormAnalysis,
  type Phase,
  analyzeForm,
  createPhaseTracker,
} from "@/lib/form-checker";
import type { Landmark } from "./use-pose-detection";

export interface UseFormCheckerReturn {
  analysis: FormAnalysis | null;
  currentPhase: Phase;
  repCount: number;
  goodFormCount: number;
  badFormCount: number;
  allMistakes: string[];
  analyzeLandmarks: (landmarks: Landmark[]) => FormAnalysis | null;
  reset: () => void;
}

export function useFormChecker(exercise: Exercise): UseFormCheckerReturn {
  const trackerRef = useRef(createPhaseTracker());
  const [analysis, setAnalysis] = useState<FormAnalysis | null>(null);
  const [currentPhase, setCurrentPhase] = useState<Phase>("standing");
  const [repCount, setRepCount] = useState(0);
  const [goodFormCount, setGoodFormCount] = useState(0);
  const [badFormCount, setBadFormCount] = useState(0);
  const [allMistakes, setAllMistakes] = useState<string[]>([]);

  // Track issues accumulated during current rep
  const currentRepIssuesRef = useRef<Set<string>>(new Set());

  const analyzeLandmarks = useCallback(
    (landmarks: Landmark[]): FormAnalysis | null => {
      if (!landmarks || landmarks.length === 0) {
        return null;
      }

      const result = analyzeForm(exercise, landmarks, trackerRef.current);

      setAnalysis(result);
      setCurrentPhase(result.phase);

      // Accumulate issues during the rep
      if (result.issues.length > 0) {
        result.issues.forEach((issue) => {
          currentRepIssuesRef.current.add(issue);
        });
      }

      // Handle rep completion
      if (result.repCompleted) {
        setRepCount((prev) => prev + 1);

        // Determine if this was a good or bad rep based on accumulated issues
        const hadIssues = currentRepIssuesRef.current.size > 0;

        if (hadIssues) {
          setBadFormCount((prev) => prev + 1);
          // Add unique mistakes to the overall list
          setAllMistakes((prev) => {
            const newMistakes = Array.from(currentRepIssuesRef.current);
            const uniqueMistakes = new Set([...prev, ...newMistakes]);
            return Array.from(uniqueMistakes);
          });
        } else {
          setGoodFormCount((prev) => prev + 1);
        }

        // Reset issues for next rep
        currentRepIssuesRef.current.clear();
      }

      return result;
    },
    [exercise]
  );

  const reset = useCallback(() => {
    trackerRef.current = createPhaseTracker();
    currentRepIssuesRef.current.clear();
    setAnalysis(null);
    setCurrentPhase("standing");
    setRepCount(0);
    setGoodFormCount(0);
    setBadFormCount(0);
    setAllMistakes([]);
  }, []);

  return {
    analysis,
    currentPhase,
    repCount,
    goodFormCount,
    badFormCount,
    allMistakes,
    analyzeLandmarks,
    reset,
  };
}
