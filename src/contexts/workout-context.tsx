"use client";
import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

export type ExerciseType = "squat" | "deadlift";

export interface WorkoutState {
  exercise: ExerciseType | null;
  isActive: boolean;
  isPaused: boolean;
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  currentMistakes: string[];
  allMistakes: string[];
  startTime: number | null;
  elapsedSeconds: number;
}

type WorkoutAction =
  | { type: "START_WORKOUT"; exercise: ExerciseType }
  | { type: "PAUSE_WORKOUT" }
  | { type: "RESUME_WORKOUT" }
  | { type: "END_WORKOUT" }
  | { type: "COUNT_REP"; isGoodForm: boolean; mistakes: string[] }
  | { type: "SET_CURRENT_MISTAKES"; mistakes: string[] }
  | { type: "UPDATE_TIME"; elapsed: number }
  | { type: "RESET" };

const initialState: WorkoutState = {
  exercise: null,
  isActive: false,
  isPaused: false,
  totalReps: 0,
  goodFormReps: 0,
  badFormReps: 0,
  currentMistakes: [],
  allMistakes: [],
  startTime: null,
  elapsedSeconds: 0,
};

function workoutReducer(
  state: WorkoutState,
  action: WorkoutAction
): WorkoutState {
  switch (action.type) {
    case "START_WORKOUT":
      return {
        ...initialState,
        exercise: action.exercise,
        isActive: true,
        startTime: Date.now(),
      };

    case "PAUSE_WORKOUT":
      return {
        ...state,
        isPaused: true,
      };

    case "RESUME_WORKOUT":
      return {
        ...state,
        isPaused: false,
      };

    case "END_WORKOUT":
      return {
        ...state,
        isActive: false,
        isPaused: false,
      };

    case "COUNT_REP":
      return {
        ...state,
        totalReps: state.totalReps + 1,
        goodFormReps: action.isGoodForm
          ? state.goodFormReps + 1
          : state.goodFormReps,
        badFormReps: action.isGoodForm
          ? state.badFormReps
          : state.badFormReps + 1,
        allMistakes: [...new Set([...state.allMistakes, ...action.mistakes])],
        currentMistakes: [],
      };

    case "SET_CURRENT_MISTAKES":
      return {
        ...state,
        currentMistakes: action.mistakes,
      };

    case "UPDATE_TIME":
      return {
        ...state,
        elapsedSeconds: action.elapsed,
      };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

interface WorkoutContextValue {
  state: WorkoutState;
  dispatch: React.Dispatch<WorkoutAction>;
  startWorkout: (exercise: ExerciseType) => void;
  pauseWorkout: () => void;
  resumeWorkout: () => void;
  endWorkout: () => void;
  countRep: (isGoodForm: boolean, mistakes: string[]) => void;
  setCurrentMistakes: (mistakes: string[]) => void;
  reset: () => void;
}

const WorkoutContext = createContext<WorkoutContextValue | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Handle timer updates
  useEffect(() => {
    if (state.isActive && !state.isPaused && state.startTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - state.startTime!) / 1000);
        dispatch({ type: "UPDATE_TIME", elapsed });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state.isActive, state.isPaused, state.startTime]);

  const startWorkout = useCallback((exercise: ExerciseType) => {
    dispatch({ type: "START_WORKOUT", exercise });
  }, []);

  const pauseWorkout = useCallback(() => {
    dispatch({ type: "PAUSE_WORKOUT" });
  }, []);

  const resumeWorkout = useCallback(() => {
    dispatch({ type: "RESUME_WORKOUT" });
  }, []);

  const endWorkout = useCallback(() => {
    dispatch({ type: "END_WORKOUT" });
  }, []);

  const countRep = useCallback((isGoodForm: boolean, mistakes: string[]) => {
    dispatch({ type: "COUNT_REP", isGoodForm, mistakes });
  }, []);

  const setCurrentMistakes = useCallback((mistakes: string[]) => {
    dispatch({ type: "SET_CURRENT_MISTAKES", mistakes });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value: WorkoutContextValue = {
    state,
    dispatch,
    startWorkout,
    pauseWorkout,
    resumeWorkout,
    endWorkout,
    countRep,
    setCurrentMistakes,
    reset,
  };

  return (
    <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>
  );
}

export function useWorkout(): WorkoutContextValue {
  const context = useContext(WorkoutContext);
  if (!context) {
    throw new Error("useWorkout must be used within a WorkoutProvider");
  }
  return context;
}

// Helper function to format elapsed time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

// Get workout summary data for API/navigation
export function getWorkoutSummary(state: WorkoutState) {
  return {
    exerciseType: state.exercise,
    totalReps: state.totalReps,
    goodFormReps: state.goodFormReps,
    badFormReps: state.badFormReps,
    durationSeconds: state.elapsedSeconds,
    mistakes: state.allMistakes,
  };
}
