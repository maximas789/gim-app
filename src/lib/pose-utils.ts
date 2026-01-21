export type Point = { x: number; y: number; z?: number };

// MediaPipe landmark indices
export const LANDMARKS = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// Calculate angle between three points (in degrees)
// Point b is the vertex of the angle
export function calculateAngle(a: Point, b: Point, c: Point): number {
  const radians =
    Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
  let degrees = Math.abs((radians * 180) / Math.PI);
  if (degrees > 180) degrees = 360 - degrees;
  return degrees;
}

// Get midpoint between two points
export function getMidpoint(a: Point, b: Point): Point {
  const result: Point = {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2,
  };
  if (a.z !== undefined && b.z !== undefined) {
    result.z = (a.z + b.z) / 2;
  }
  return result;
}

// Calculate distance between two points
export function getDistance(a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Check if a point is visible (MediaPipe returns visibility score)
export function isVisible(
  landmark: { x: number; y: number; z?: number; visibility?: number },
  threshold = 0.5
): boolean {
  return (landmark.visibility ?? 1) >= threshold;
}

// Get knee angle (hip-knee-ankle)
export function getKneeAngle(
  hip: Point,
  knee: Point,
  ankle: Point
): number {
  return calculateAngle(hip, knee, ankle);
}

// Get hip angle (shoulder-hip-knee)
export function getHipAngle(
  shoulder: Point,
  hip: Point,
  knee: Point
): number {
  return calculateAngle(shoulder, hip, knee);
}

// Get torso angle relative to vertical
export function getTorsoAngle(shoulder: Point, hip: Point): number {
  // Create a vertical reference point above the hip
  const verticalPoint: Point = { x: hip.x, y: hip.y - 1 };
  return calculateAngle(verticalPoint, hip, shoulder);
}
