import {
  type Point,
  LANDMARKS,
  getKneeAngle,
  getHipAngle,
  getTorsoAngle,
  getMidpoint,
} from "./pose-utils";

export type Exercise = "squat" | "deadlift";

export type FormIssue =
  | "knees_caving"
  | "not_deep_enough"
  | "too_deep"
  | "forward_lean"
  | "rounded_back"
  | "knees_too_far_forward"
  | "lockout_incomplete";

export type Phase = "standing" | "descending" | "bottom" | "ascending";

export interface FormAnalysis {
  isGoodForm: boolean;
  issues: FormIssue[];
  phase: Phase;
  repCompleted: boolean;
  kneeAngle: number;
  hipAngle: number;
}

// Voice feedback messages for each issue
export const VOICE_FEEDBACK: Record<FormIssue, string> = {
  knees_caving: "Push your knees out",
  not_deep_enough: "Go deeper",
  too_deep: "Don't go so deep",
  forward_lean: "Keep your chest up",
  rounded_back: "Straighten your back",
  knees_too_far_forward: "Sit back more",
  lockout_incomplete: "Stand up fully",
};

// Thresholds for squat form detection
const SQUAT_THRESHOLDS = {
  STANDING_KNEE_ANGLE: 165, // Above this = standing
  BOTTOM_KNEE_ANGLE_MIN: 70, // Below this = too deep
  BOTTOM_KNEE_ANGLE_MAX: 100, // Above this at bottom = not deep enough
  DESCENDING_THRESHOLD: 150, // Below standing, above bottom
  FORWARD_LEAN_ANGLE: 45, // Torso angle from vertical
  KNEE_CAVE_THRESHOLD: 0.05, // Knee X inside ankle X by this ratio
};

// Thresholds for deadlift form detection
const DEADLIFT_THRESHOLDS = {
  STANDING_HIP_ANGLE: 165, // Above this = standing
  BOTTOM_HIP_ANGLE: 90, // Around this at bottom position
  ROUNDED_BACK_THRESHOLD: 30, // Shoulder drops below expected line
  KNEE_TRAVEL_MAX: 20, // Max degrees knee angle should change during lift
};

type Landmark = { x: number; y: number; z?: number; visibility?: number };

interface PhaseTracker {
  previousPhase: Phase;
  previousKneeAngle: number;
  repInProgress: boolean;
  bottomReached: boolean;
  initialKneeAngle: number | null;
}

// Helper to safely get a landmark as a Point
function getLandmark(landmarks: Landmark[], index: number): Point {
  const lm = landmarks[index];
  if (!lm) {
    return { x: 0, y: 0 };
  }
  const point: Point = { x: lm.x, y: lm.y };
  if (lm.z !== undefined) {
    point.z = lm.z;
  }
  return point;
}

// Create a new phase tracker
export function createPhaseTracker(): PhaseTracker {
  return {
    previousPhase: "standing",
    previousKneeAngle: 180,
    repInProgress: false,
    bottomReached: false,
    initialKneeAngle: null,
  };
}

// Analyze squat form from landmarks
export function analyzeSquatForm(
  landmarks: Landmark[],
  tracker: PhaseTracker
): FormAnalysis {
  const issues: FormIssue[] = [];

  // Get relevant landmarks using safe accessor
  const leftShoulder = getLandmark(landmarks, LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARKS.RIGHT_SHOULDER);
  const leftHip = getLandmark(landmarks, LANDMARKS.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARKS.RIGHT_HIP);
  const leftKnee = getLandmark(landmarks, LANDMARKS.LEFT_KNEE);
  const rightKnee = getLandmark(landmarks, LANDMARKS.RIGHT_KNEE);
  const leftAnkle = getLandmark(landmarks, LANDMARKS.LEFT_ANKLE);
  const rightAnkle = getLandmark(landmarks, LANDMARKS.RIGHT_ANKLE);

  // Calculate midpoints for symmetrical analysis
  const shoulder = getMidpoint(leftShoulder, rightShoulder);
  const hip = getMidpoint(leftHip, rightHip);
  const knee = getMidpoint(leftKnee, rightKnee);
  const ankle = getMidpoint(leftAnkle, rightAnkle);

  // Calculate angles
  const kneeAngle = getKneeAngle(hip, knee, ankle);
  const hipAngle = getHipAngle(shoulder, hip, knee);
  const torsoAngle = getTorsoAngle(shoulder, hip);

  // Determine phase
  let phase: Phase = "standing";
  let repCompleted = false;

  if (kneeAngle >= SQUAT_THRESHOLDS.STANDING_KNEE_ANGLE) {
    phase = "standing";
    // Check if rep was completed (came back up from bottom)
    if (tracker.bottomReached && tracker.repInProgress) {
      repCompleted = true;
      tracker.repInProgress = false;
      tracker.bottomReached = false;
    }
  } else if (kneeAngle <= SQUAT_THRESHOLDS.BOTTOM_KNEE_ANGLE_MAX) {
    phase = "bottom";
    tracker.bottomReached = true;
    tracker.repInProgress = true;
  } else if (kneeAngle < tracker.previousKneeAngle) {
    phase = "descending";
    if (!tracker.repInProgress) {
      tracker.repInProgress = true;
    }
  } else {
    phase = "ascending";
  }

  // Check form issues based on phase
  if (phase === "bottom") {
    // Check depth
    if (kneeAngle > SQUAT_THRESHOLDS.BOTTOM_KNEE_ANGLE_MAX) {
      issues.push("not_deep_enough");
    } else if (kneeAngle < SQUAT_THRESHOLDS.BOTTOM_KNEE_ANGLE_MIN) {
      issues.push("too_deep");
    }
  }

  // Check for knee cave (knees collapsing inward)
  const leftKneeAnkleOffset = leftKnee.x - leftAnkle.x;
  const rightKneeAnkleOffset = rightKnee.x - rightAnkle.x;
  // In a frontal view, knees caving means they move toward center more than ankles
  if (
    phase !== "standing" &&
    Math.abs(leftKneeAnkleOffset - rightKneeAnkleOffset) >
      SQUAT_THRESHOLDS.KNEE_CAVE_THRESHOLD
  ) {
    issues.push("knees_caving");
  }

  // Check for excessive forward lean
  if (
    phase !== "standing" &&
    torsoAngle > SQUAT_THRESHOLDS.FORWARD_LEAN_ANGLE
  ) {
    issues.push("forward_lean");
  }

  // Check if knees are too far forward (past toes)
  if (phase === "bottom" || phase === "descending") {
    const kneeForwardAmount = knee.x - ankle.x;
    // This is a simplified check - in reality depends on camera angle
    if (Math.abs(kneeForwardAmount) > 0.15) {
      issues.push("knees_too_far_forward");
    }
  }

  // Update tracker
  tracker.previousPhase = phase;
  tracker.previousKneeAngle = kneeAngle;

  return {
    isGoodForm: issues.length === 0,
    issues,
    phase,
    repCompleted,
    kneeAngle,
    hipAngle,
  };
}

// Analyze deadlift form from landmarks
export function analyzeDeadliftForm(
  landmarks: Landmark[],
  tracker: PhaseTracker
): FormAnalysis {
  const issues: FormIssue[] = [];

  // Get relevant landmarks using safe accessor
  const leftShoulder = getLandmark(landmarks, LANDMARKS.LEFT_SHOULDER);
  const rightShoulder = getLandmark(landmarks, LANDMARKS.RIGHT_SHOULDER);
  const leftHip = getLandmark(landmarks, LANDMARKS.LEFT_HIP);
  const rightHip = getLandmark(landmarks, LANDMARKS.RIGHT_HIP);
  const leftKnee = getLandmark(landmarks, LANDMARKS.LEFT_KNEE);
  const rightKnee = getLandmark(landmarks, LANDMARKS.RIGHT_KNEE);
  const leftAnkle = getLandmark(landmarks, LANDMARKS.LEFT_ANKLE);
  const rightAnkle = getLandmark(landmarks, LANDMARKS.RIGHT_ANKLE);

  // Calculate midpoints
  const shoulder = getMidpoint(leftShoulder, rightShoulder);
  const hip = getMidpoint(leftHip, rightHip);
  const knee = getMidpoint(leftKnee, rightKnee);
  const ankle = getMidpoint(leftAnkle, rightAnkle);

  // Calculate angles
  const kneeAngle = getKneeAngle(hip, knee, ankle);
  const hipAngle = getHipAngle(shoulder, hip, knee);

  // Track initial knee angle for the rep
  if (tracker.initialKneeAngle === null) {
    tracker.initialKneeAngle = kneeAngle;
  }

  // Determine phase based on hip angle (deadlift is hip-hinge dominant)
  let phase: Phase = "standing";
  let repCompleted = false;

  if (hipAngle >= DEADLIFT_THRESHOLDS.STANDING_HIP_ANGLE) {
    phase = "standing";
    if (tracker.bottomReached && tracker.repInProgress) {
      repCompleted = true;
      tracker.repInProgress = false;
      tracker.bottomReached = false;
      tracker.initialKneeAngle = null;
    }
  } else if (hipAngle <= DEADLIFT_THRESHOLDS.BOTTOM_HIP_ANGLE + 20) {
    phase = "bottom";
    tracker.bottomReached = true;
    tracker.repInProgress = true;
  } else if (hipAngle < tracker.previousKneeAngle) {
    // Using previousKneeAngle to store previous hip angle for deadlift
    phase = "descending";
    if (!tracker.repInProgress) {
      tracker.repInProgress = true;
      tracker.initialKneeAngle = kneeAngle;
    }
  } else {
    phase = "ascending";
  }

  // Check for rounded back
  // In a side view, shoulder should stay above or in line with hip
  // A significant drop in shoulder Y relative to hip indicates rounding
  const shoulderHipDiff = shoulder.y - hip.y;
  if (phase !== "standing" && shoulderHipDiff > DEADLIFT_THRESHOLDS.ROUNDED_BACK_THRESHOLD / 100) {
    issues.push("rounded_back");
  }

  // Check for excessive knee movement during lift
  if (
    phase === "ascending" &&
    tracker.initialKneeAngle !== null &&
    Math.abs(kneeAngle - tracker.initialKneeAngle) >
      DEADLIFT_THRESHOLDS.KNEE_TRAVEL_MAX
  ) {
    // Knees straightened too much too early or bent during lift
    issues.push("knees_too_far_forward");
  }

  // Check for incomplete lockout at top
  if (
    phase === "standing" &&
    hipAngle < DEADLIFT_THRESHOLDS.STANDING_HIP_ANGLE - 5
  ) {
    issues.push("lockout_incomplete");
  }

  // Update tracker (using kneeAngle field to store hip angle for deadlift)
  tracker.previousPhase = phase;
  tracker.previousKneeAngle = hipAngle;

  return {
    isGoodForm: issues.length === 0,
    issues,
    phase,
    repCompleted,
    kneeAngle,
    hipAngle,
  };
}

// Main form analysis function that routes to the appropriate exercise checker
export function analyzeForm(
  exercise: Exercise,
  landmarks: Landmark[],
  tracker: PhaseTracker
): FormAnalysis {
  if (exercise === "squat") {
    return analyzeSquatForm(landmarks, tracker);
  } else {
    return analyzeDeadliftForm(landmarks, tracker);
  }
}
