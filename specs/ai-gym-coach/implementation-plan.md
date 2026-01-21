# Implementation Plan: AI Gym Coach MVP

## Overview

Build a web app that uses MediaPipe pose detection to analyze exercise form (squats and deadlifts) and provides real-time voice feedback. Users can try without an account, but need to log in to save workout history.

---

## Phase 0: Boilerplate Cleanup

Remove unnecessary boilerplate files to start with a clean slate.

### Tasks

- [x] Delete `src/app/chat/` directory (boilerplate AI chat page)
- [x] Delete `src/app/api/chat/route.ts` (chat API endpoint)
- [x] Delete `src/app/api/diagnostics/` directory (setup checker API)
- [x] Delete `src/components/setup-checklist.tsx` (boilerplate component)
- [x] Delete `src/components/starter-prompt-modal.tsx` (boilerplate component)
- [x] Delete `src/components/ui/github-stars.tsx` (not needed)
- [x] Delete `src/hooks/use-diagnostics.ts` (boilerplate hook)
- [x] Delete `docs/` directory (boilerplate documentation)

### Technical Details

**Files to delete:**
```
src/app/chat/                      # Entire directory
src/app/api/chat/route.ts          # Single file
src/app/api/diagnostics/           # Entire directory
src/components/setup-checklist.tsx # Single file
src/components/starter-prompt-modal.tsx # Single file
src/components/ui/github-stars.tsx # Single file
src/hooks/use-diagnostics.ts       # Single file
docs/                              # Entire directory
```

**Files to keep (don't touch):**
- `src/app/(auth)/` - Login, register, password reset pages
- `src/app/profile/` - User profile page
- `src/app/api/auth/` - BetterAuth routes
- `src/components/auth/` - Sign in/out components
- `src/components/ui/` - shadcn/ui components (except github-stars)
- `src/lib/` - Core infrastructure (auth, db, schema, utils)

---

## Phase 1: Database Schema

Add workout tracking table to the database.

### Tasks

- [x] Add `workout` table to `src/lib/schema.ts`
- [x] Generate database migration
- [x] Apply migration to database

### Technical Details

**Schema to add to `src/lib/schema.ts`:**

```typescript
import { pgTable, text, timestamp, integer, jsonb, uuid, index } from "drizzle-orm/pg-core";

export const workout = pgTable(
  "workout",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").references(() => user.id, { onDelete: "cascade" }), // nullable for guest display
    exerciseType: text("exercise_type").notNull(), // "squat" | "deadlift"
    totalReps: integer("total_reps").notNull().default(0),
    goodFormReps: integer("good_form_reps").notNull().default(0),
    badFormReps: integer("bad_form_reps").notNull().default(0),
    durationSeconds: integer("duration_seconds").notNull().default(0),
    mistakes: jsonb("mistakes").$type<string[]>().default([]),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("workout_user_id_idx").on(table.userId),
    index("workout_created_at_idx").on(table.createdAt),
  ]
);
```

**CLI commands:**
```bash
pnpm db:generate
pnpm db:migrate
```

**Verify with:**
```bash
pnpm db:studio
```

---

## Phase 2: Install Dependencies

Install MediaPipe for pose detection.

### Tasks

- [x] Install @mediapipe/tasks-vision package

### Technical Details

**CLI command:**
```bash
pnpm add @mediapipe/tasks-vision
```

This package provides:
- `PoseLandmarker` - Main detection class
- `FilesetResolver` - Handles model loading (WASM/GPU resources)
- Model loaded from CDN (~5MB, cached after first load)

---

## Phase 3: Core Utilities [complex]

Build the foundational utilities for pose detection and form analysis.

### Tasks

- [x] Create `src/lib/pose-utils.ts` with angle calculation functions
- [x] Create `src/lib/form-checker.ts` with squat form rules
- [x] Add deadlift form rules to `src/lib/form-checker.ts`
- [x] Create `src/workers/pose-detection.worker.ts` for background processing

### Technical Details

**`src/lib/pose-utils.ts`:**

```typescript
export type Point = { x: number; y: number; z?: number };

// MediaPipe landmark indices
export const LANDMARKS = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

// Calculate angle between three points (in degrees)
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

// Get midpoint between two points
export function getMidpoint(a: Point, b: Point): Point {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
}
```

**`src/lib/form-checker.ts`:**

```typescript
export type Exercise = "squat" | "deadlift";
export type FormIssue =
  | "knees_caving"
  | "not_deep_enough"
  | "too_deep"
  | "forward_lean"
  | "rounded_back"
  | "knees_too_far_forward";

export type Phase = "standing" | "descending" | "bottom" | "ascending";

export interface FormAnalysis {
  isGoodForm: boolean;
  issues: FormIssue[];
  phase: Phase;
  repCompleted: boolean;
}

// Voice feedback messages for each issue
export const VOICE_FEEDBACK: Record<FormIssue, string> = {
  knees_caving: "Push your knees out",
  not_deep_enough: "Go deeper",
  too_deep: "Don't go so deep",
  forward_lean: "Keep your chest up",
  rounded_back: "Straighten your back",
  knees_too_far_forward: "Sit back more",
};
```

**Squat form detection thresholds:**
- Standing: knee angle ~170-180°
- Bottom of squat: knee angle ~70-100° (proper depth)
- Knee cave: knee X position significantly inside ankle X
- Forward lean: hip angle < 30°

**Deadlift form detection thresholds:**
- Rounded back: shoulder Y position drops below hip-to-knee line
- Knees forward: knee angle changes > 20° during lift phase

**`src/workers/pose-detection.worker.ts`:**

```typescript
import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let poseLandmarker: PoseLandmarker | null = null;

self.onmessage = async (e: MessageEvent) => {
  if (e.data.type === "INIT") {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU"
      },
      runningMode: "VIDEO",
      numPoses: 1
    });
    self.postMessage({ type: "READY" });
  }

  if (e.data.type === "DETECT" && poseLandmarker) {
    const { imageData, timestamp } = e.data;
    const results = poseLandmarker.detectForVideo(imageData, timestamp);
    self.postMessage({
      type: "RESULT",
      landmarks: results?.landmarks?.[0] || null
    });
  }
};
```

---

## Phase 4: React Hooks [complex]

Create custom hooks for camera, pose detection, form checking, and voice feedback.

### Tasks

- [x] Create `src/hooks/use-camera.ts` for camera access
- [x] Create `src/hooks/use-pose-detection.ts` for MediaPipe integration
- [x] Create `src/hooks/use-form-checker.ts` for form analysis
- [x] Create `src/hooks/use-voice-feedback.ts` for text-to-speech

### Technical Details

**`src/hooks/use-camera.ts`:**

```typescript
"use client";
import { useRef, useState, useCallback } from "react";

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsActive(true);
      }
    } catch (err) {
      setError("Camera access denied");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
    }
  }, []);

  return { videoRef, isActive, error, startCamera, stopCamera };
}
```

**`src/hooks/use-voice-feedback.ts`:**

```typescript
"use client";
import { useRef, useCallback } from "react";

export function useVoiceFeedback() {
  const lastSpokenRef = useRef<Record<string, number>>({});
  const DEBOUNCE_MS = 3000; // Don't repeat same feedback within 3 seconds

  const speak = useCallback((text: string, key?: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const feedbackKey = key || text;
    const now = Date.now();
    const lastSpoken = lastSpokenRef.current[feedbackKey] || 0;

    if (now - lastSpoken < DEBOUNCE_MS) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    lastSpokenRef.current[feedbackKey] = now;
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}
```

---

## Phase 5: Workout State Management

Create context for managing workout session state.

### Tasks

- [x] Create `src/contexts/workout-context.tsx` with reducer and provider

### Technical Details

**`src/contexts/workout-context.tsx`:**

```typescript
"use client";
import { createContext, useContext, useReducer, ReactNode } from "react";

interface WorkoutState {
  exercise: "squat" | "deadlift" | null;
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
  | { type: "START_WORKOUT"; exercise: "squat" | "deadlift" }
  | { type: "PAUSE_WORKOUT" }
  | { type: "RESUME_WORKOUT" }
  | { type: "END_WORKOUT" }
  | { type: "COUNT_REP"; isGoodForm: boolean; mistakes: string[] }
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

function workoutReducer(state: WorkoutState, action: WorkoutAction): WorkoutState {
  switch (action.type) {
    case "START_WORKOUT":
      return { ...initialState, exercise: action.exercise, isActive: true, startTime: Date.now() };
    case "COUNT_REP":
      return {
        ...state,
        totalReps: state.totalReps + 1,
        goodFormReps: action.isGoodForm ? state.goodFormReps + 1 : state.goodFormReps,
        badFormReps: action.isGoodForm ? state.badFormReps : state.badFormReps + 1,
        allMistakes: [...new Set([...state.allMistakes, ...action.mistakes])],
      };
    case "END_WORKOUT":
      return { ...state, isActive: false };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

const WorkoutContext = createContext<{
  state: WorkoutState;
  dispatch: React.Dispatch<WorkoutAction>;
} | null>(null);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(workoutReducer, initialState);
  return (
    <WorkoutContext.Provider value={{ state, dispatch }}>
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (!context) throw new Error("useWorkout must be used within WorkoutProvider");
  return context;
}
```

---

## Phase 6: UI Components [complex]

Build the workout UI components.

### Tasks

- [x] Create `src/components/workout/exercise-card.tsx` for exercise selection
- [x] Create `src/components/workout/camera-view.tsx` for camera display
- [x] Create `src/components/workout/pose-overlay.tsx` for skeleton visualization
- [x] Create `src/components/workout/workout-controls.tsx` for start/stop buttons
- [x] Create `src/components/workout/rep-counter.tsx` for live rep display
- [x] Create `src/components/workout/form-indicator.tsx` for good/bad form badge
- [x] Create `src/components/workout/workout-summary-card.tsx` for results display
- [x] Create `src/components/workout/history-list.tsx` for past workouts

### Technical Details

**Component file locations:**
```
src/components/workout/
├── exercise-card.tsx         # Card with exercise icon and name
├── camera-view.tsx           # Video element with camera feed
├── pose-overlay.tsx          # Canvas overlay for skeleton
├── workout-controls.tsx      # Start/Stop/Pause buttons
├── rep-counter.tsx           # Large rep count display
├── form-indicator.tsx        # "Good Form" / "Bad Form" badge
├── workout-summary-card.tsx  # End-of-workout stats card
└── history-list.tsx          # List of saved workouts
```

**Use existing shadcn/ui components:**
- `Button` for controls
- `Card` for exercise selection and summary
- `Badge` for form indicator
- `Skeleton` for loading states

**exercise-card.tsx structure:**
```typescript
interface ExerciseCardProps {
  exercise: "squat" | "deadlift";
  onSelect: () => void;
}
```

**workout-summary-card.tsx props:**
```typescript
interface WorkoutSummaryProps {
  exerciseType: string;
  totalReps: number;
  goodFormReps: number;
  badFormReps: number;
  durationSeconds: number;
  mistakes: string[];
  onSave?: () => void;  // Only shown if logged in
  onStartNew: () => void;
}
```

---

## Phase 7: Pages [complex]

Create the application pages.

### Tasks

- [x] Replace `src/app/page.tsx` with gym coach landing page
- [x] Create `src/app/workout/page.tsx` for exercise selection
- [x] Create `src/app/workout/[exercise]/page.tsx` for live workout
- [x] Create `src/app/workout/summary/page.tsx` for workout results
- [x] Replace `src/app/dashboard/page.tsx` with workout history (or redirect to `/history`)
- [x] Create `src/app/history/page.tsx` for workout history (protected)

### Technical Details

**Page routes:**
| Route | Purpose | Auth Required |
|-------|---------|---------------|
| `/` | Landing page with "Start Workout" CTA | No |
| `/workout` | Exercise selection (Squat/Deadlift cards) | No |
| `/workout/squat` | Live squat workout | No |
| `/workout/deadlift` | Live deadlift workout | No |
| `/workout/summary` | Post-workout results | No |
| `/history` | Saved workout history | Yes |

**Landing page (`src/app/page.tsx`) structure:**
- Hero section with app name and tagline
- "Start Workout" button → `/workout`
- Brief feature list (voice feedback, form detection, rep counting)
- Login prompt for saving history

**Live workout page (`src/app/workout/[exercise]/page.tsx`):**
- Validate `exercise` param is "squat" or "deadlift"
- Wrap with `WorkoutProvider`
- Layout: Camera view (main), Rep counter (overlay), Form indicator (overlay), Controls (bottom)

**Summary page receives data via URL search params:**
```typescript
// Navigate to summary with data
router.push(`/workout/summary?data=${encodeURIComponent(JSON.stringify(workoutData))}`);
```

**History page (`src/app/history/page.tsx`):**
- Server component with auth check
- Redirect to `/login` if not authenticated
- Fetch workouts from database ordered by createdAt desc

---

## Phase 8: API Routes

Create API endpoints for saving and retrieving workouts.

### Tasks

- [x] Create `src/app/api/workouts/route.ts` for POST (save) and GET (list)

### Technical Details

**`src/app/api/workouts/route.ts`:**

```typescript
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { workout } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";

const workoutSchema = z.object({
  exerciseType: z.enum(["squat", "deadlift"]),
  totalReps: z.number().int().min(0),
  goodFormReps: z.number().int().min(0),
  badFormReps: z.number().int().min(0),
  durationSeconds: z.number().int().min(0),
  mistakes: z.array(z.string()),
});

// POST - Save a workout (requires auth)
export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = workoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  const [inserted] = await db.insert(workout).values({
    userId: session.user.id,
    ...parsed.data,
  }).returning();

  return NextResponse.json(inserted);
}

// GET - List user's workouts (requires auth)
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workouts = await db
    .select()
    .from(workout)
    .where(eq(workout.userId, session.user.id))
    .orderBy(desc(workout.createdAt))
    .limit(50);

  return NextResponse.json(workouts);
}
```

---

## Phase 9: Navigation & Branding

Update the site header with new branding and navigation.

### Tasks

- [x] Update `src/components/site-header.tsx` with new app name and navigation links

### Technical Details

**New navigation structure:**
```typescript
// Logo: "GymCoach" or similar
// Nav links:
// - "Start Workout" → /workout (always visible)
// - "History" → /history (only if logged in)
// - UserProfile component (existing - keep)
// - ModeToggle (existing - keep)
```

**Update the app name from "Starter Kit" to "GymCoach" (or user's preferred name).**

---

## Phase 10: Final Polish

Run quality checks and verify everything works.

### Tasks

- [x] Run `pnpm lint` and fix any errors
- [x] Run `pnpm typecheck` and fix any type errors
- [ ] Manually test the complete user flow

### Technical Details

**CLI commands:**
```bash
pnpm lint
pnpm typecheck
```

**Manual testing checklist:**
1. Landing page loads correctly
2. Exercise selection works (Squat/Deadlift)
3. Camera permission prompt appears
4. Camera feed displays
5. Pose detection shows skeleton overlay
6. Form feedback speaks corrections
7. Rep counter increments
8. Stop button shows summary
9. Save button works (when logged in)
10. History page shows saved workouts
11. Guest mode works (no save option)
12. Dark mode works throughout

---

## Summary

| Phase | Description | Tasks |
|-------|-------------|-------|
| 0 | Cleanup boilerplate | 8 |
| 1 | Database schema | 3 |
| 2 | Install dependencies | 1 |
| 3 | Core utilities | 4 |
| 4 | React hooks | 4 |
| 5 | State management | 1 |
| 6 | UI components | 8 |
| 7 | Pages | 6 |
| 8 | API routes | 1 |
| 9 | Navigation | 1 |
| 10 | Final polish | 3 |

**Total: 40 tasks across 11 phases**
