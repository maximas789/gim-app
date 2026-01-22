"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { AudioPlayer, AudioRecorder, videoFrameToBase64 } from "@/lib/audio-utils";
import type { ExerciseType } from "@/lib/gemini-config";
import {
  GeminiLiveClient,
  type GeminiConnectionState,
  type GeminiSessionResponse,
} from "@/lib/gemini-live-client";

export interface UseGeminiLiveOptions {
  exercise: ExerciseType;
  onError?: (error: Error) => void;
}

export interface UseGeminiLiveReturn {
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  connectionState: GeminiConnectionState;
  isConnected: boolean;

  // Media streaming
  startStreaming: (videoElement: HTMLVideoElement) => void;
  stopStreaming: () => void;
  isStreaming: boolean;

  // Audio control
  isSpeaking: boolean;
  setMicEnabled: (enabled: boolean) => void;
  isMicEnabled: boolean;
}

export function useGeminiLive(options: UseGeminiLiveOptions): UseGeminiLiveReturn {
  const { exercise, onError } = options;

  // State
  const [connectionState, setConnectionState] =
    useState<GeminiConnectionState>("disconnected");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMicEnabled, setIsMicEnabled] = useState(true);

  // Refs for persistent objects
  const clientRef = useRef<GeminiLiveClient | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const audioRecorderRef = useRef<AudioRecorder | null>(null);
  const videoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const sessionResponseRef = useRef<GeminiSessionResponse | null>(null);

  // Initialize audio player
  useEffect(() => {
    audioPlayerRef.current = new AudioPlayer();
    return () => {
      audioPlayerRef.current?.stop();
    };
  }, []);

  // Fetch session configuration from our API
  const fetchSessionConfig = useCallback(async (): Promise<GeminiSessionResponse> => {
    const response = await fetch(`/api/gemini/session?exercise=${exercise}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to get session configuration");
    }
    return response.json();
  }, [exercise]);

  // Connect to Gemini Live
  const connect = useCallback(async () => {
    try {
      // Fetch session config
      const sessionResponse = await fetchSessionConfig();
      sessionResponseRef.current = sessionResponse;

      // Create client with handlers
      const client = new GeminiLiveClient({
        onAudioResponse: (base64Audio) => {
          // Play audio through AudioPlayer
          setIsSpeaking(true);
          audioPlayerRef.current?.playBase64PCM(base64Audio);
          // Reset speaking state after a delay (audio chunks are small)
          setTimeout(() => setIsSpeaking(false), 500);
        },
        onTextResponse: () => {
          // Text responses are logged for debugging if needed
          // Currently Gemini Live only returns audio
        },
        onConnectionChange: (state) => {
          setConnectionState(state);
        },
        onError: (error) => {
          console.error("Gemini error:", error);
          onError?.(error);
        },
        onInterrupted: () => {
          // User started speaking, stop current audio
          audioPlayerRef.current?.stop();
          setIsSpeaking(false);
        },
      });

      clientRef.current = client;

      // Connect to Gemini
      await client.connect(sessionResponse);
    } catch (error) {
      console.error("Failed to connect to Gemini:", error);
      setConnectionState("error");
      onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }, [fetchSessionConfig, onError]);

  // Disconnect from Gemini
  const disconnect = useCallback(() => {
    // Stop streaming first
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    // Stop audio recorder
    audioRecorderRef.current?.stop();
    audioRecorderRef.current = null;

    // Stop audio player
    audioPlayerRef.current?.stop();

    // Disconnect client
    clientRef.current?.disconnect();
    clientRef.current = null;

    setIsStreaming(false);
    setIsSpeaking(false);
  }, []);

  // Start streaming video and audio to Gemini
  const startStreaming = useCallback(
    (videoElement: HTMLVideoElement) => {
      if (!clientRef.current?.isReady()) {
        console.error("Cannot start streaming: not connected");
        return;
      }

      videoElementRef.current = videoElement;
      const settings = clientRef.current.getSettings();
      if (!settings) return;

      // Start video frame capture interval
      const frameInterval = 1000 / settings.videoFps; // Convert FPS to interval
      videoIntervalRef.current = setInterval(() => {
        if (videoElementRef.current && clientRef.current?.isReady()) {
          try {
            const base64Frame = videoFrameToBase64(
              videoElementRef.current,
              settings.videoMaxWidth,
              settings.videoQuality
            );
            clientRef.current.sendVideo(base64Frame);
          } catch (error) {
            console.error("Error capturing video frame:", error);
          }
        }
      }, frameInterval);

      // Start audio recording
      const recorder = new AudioRecorder();
      audioRecorderRef.current = recorder;

      recorder
        .start((base64Audio) => {
          if (isMicEnabled && clientRef.current?.isReady()) {
            clientRef.current.sendAudio(base64Audio);
          }
        })
        .catch((error) => {
          console.error("Failed to start audio recording:", error);
          onError?.(error);
        });

      setIsStreaming(true);
    },
    [isMicEnabled, onError]
  );

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (videoIntervalRef.current) {
      clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }

    audioRecorderRef.current?.stop();
    audioRecorderRef.current = null;

    videoElementRef.current = null;
    setIsStreaming(false);
  }, []);

  // Update mic enabled state
  const handleSetMicEnabled = useCallback((enabled: boolean) => {
    setIsMicEnabled(enabled);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    // Connection
    connect,
    disconnect,
    connectionState,
    isConnected: connectionState === "connected",

    // Streaming
    startStreaming,
    stopStreaming,
    isStreaming,

    // Audio
    isSpeaking,
    setMicEnabled: handleSetMicEnabled,
    isMicEnabled,
  };
}
