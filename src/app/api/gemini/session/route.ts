import { NextResponse } from "next/server";
import { GEMINI_CONFIG, getGymCoachSystemPrompt, RESPONSE_CONFIG } from "@/lib/gemini-config";
import type { ExerciseType } from "@/lib/gemini-config";

// GET - Get Gemini Live session configuration
// Note: For production, this should generate ephemeral tokens instead of returning the API key
export async function GET(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API key not configured" },
      { status: 500 }
    );
  }

  // Get exercise type from query params
  const { searchParams } = new URL(request.url);
  const exercise = searchParams.get("exercise") as ExerciseType | null;

  if (!exercise || !["squat", "deadlift"].includes(exercise)) {
    return NextResponse.json(
      { error: "Invalid exercise type. Must be 'squat' or 'deadlift'" },
      { status: 400 }
    );
  }

  // Build the WebSocket URL with API key
  const wsUrl = `${GEMINI_CONFIG.WEBSOCKET_URL}?key=${apiKey}`;

  // Build the setup configuration for the Gemini Live session
  const setupConfig = {
    model: `models/${GEMINI_CONFIG.MODEL}`,
    generationConfig: {
      responseModalities: RESPONSE_CONFIG.responseModalities,
      speechConfig: RESPONSE_CONFIG.speechConfig,
    },
    systemInstruction: {
      parts: [{ text: getGymCoachSystemPrompt(exercise) }],
    },
  };

  return NextResponse.json({
    wsUrl,
    setupConfig,
    settings: {
      videoFps: GEMINI_CONFIG.VIDEO_FPS,
      videoQuality: GEMINI_CONFIG.VIDEO_QUALITY,
      videoMaxWidth: GEMINI_CONFIG.VIDEO_MAX_WIDTH,
      audioInputSampleRate: GEMINI_CONFIG.AUDIO_INPUT_SAMPLE_RATE,
      audioOutputSampleRate: GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE,
    },
  });
}
