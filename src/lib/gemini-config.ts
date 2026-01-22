// Gemini Live API Configuration for GymCoach

export const GEMINI_CONFIG = {
  // Model that supports bidiGenerateContent (real-time streaming)
  MODEL: "gemini-2.0-flash-exp",

  // WebSocket endpoint for Gemini Live API
  WEBSOCKET_URL:
    "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",

  // Video settings
  VIDEO_FPS: 1, // Gemini processes at 1 FPS
  VIDEO_QUALITY: 0.7, // JPEG quality (0-1)
  VIDEO_MAX_WIDTH: 640, // Max width for video frames

  // Audio settings
  AUDIO_INPUT_SAMPLE_RATE: 16000, // 16kHz for input
  AUDIO_OUTPUT_SAMPLE_RATE: 24000, // 24kHz for output

  // Session settings
  SESSION_TIMEOUT_MS: 10 * 60 * 1000, // 10 minutes max session
} as const;

export type ExerciseType = "squat" | "deadlift";

// System prompt for the AI gym coach
export function getGymCoachSystemPrompt(exercise: ExerciseType): string {
  const exerciseGuidance =
    exercise === "squat"
      ? `### For Squats:
- Knee tracking over toes (not caving inward)
- Depth (thighs parallel to floor or below)
- Back position (straight, not rounded)
- Chest up, not leaning too far forward
- Weight distribution (heels on ground)`
      : `### For Deadlifts:
- Back position (neutral spine, not rounded)
- Bar path (close to body)
- Hip hinge pattern (push hips back)
- Lockout at top (full hip extension)
- Head position (neutral, not looking up)`;

  return `You are an expert personal trainer and gym coach providing real-time exercise form feedback through video observation.

## Your Role
- Watch the user perform exercises via live video feed
- Provide immediate, concise voice corrections when you see form issues
- Encourage good form with brief positive feedback
- Count repetitions and announce them

## Exercise Being Performed
The user is performing: **${exercise.toUpperCase()}**

## Key Form Points to Watch

${exerciseGuidance}

## Communication Style
- Keep corrections SHORT (3-7 words max): "Push your knees out", "Chest up", "Go deeper"
- Speak in second person: "You're..." not "The user is..."
- Be encouraging but direct
- Don't over-explain - quick cues only
- Announce rep completions: "Good rep!", "That's 5!", "Nice form on that one"
- If form is good, stay mostly quiet or give brief praise like "Looking good"
- Don't repeat the same correction within 5 seconds

## Audio Interaction
- The user may ask questions or request clarification
- Keep responses brief during exercise
- Longer explanations only when user is clearly resting

## Important Notes
- You are seeing video at approximately 1 frame per second
- Focus on overall form patterns, not micro-movements
- If you can't see the user clearly, ask them to adjust camera position
- Prioritize safety - if you see dangerous form, be emphatic about corrections
- Start by greeting the user and confirming you can see them ready to exercise`;
}

// Voice configuration for natural-sounding speech
export const VOICE_CONFIG = {
  voiceName: "Aoede", // Natural-sounding voice
} as const;

// Response modality configuration
export const RESPONSE_CONFIG = {
  responseModalities: ["AUDIO"] as const,
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: VOICE_CONFIG.voiceName,
      },
    },
  },
} as const;
