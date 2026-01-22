"use client";
import { useRef, useCallback, useState } from "react";
import { type FormIssue, VOICE_FEEDBACK } from "@/lib/form-checker";

export interface UseVoiceFeedbackReturn {
  speak: (text: string, key?: string) => void;
  speakIssue: (issue: FormIssue) => void;
  speakRepComplete: (isGoodForm: boolean) => void;
  stop: () => void;
  isSpeaking: boolean;
  isSupported: boolean;
  setEnabled: (enabled: boolean) => void;
  isEnabled: boolean;
}

const DEBOUNCE_MS = 3000; // Don't repeat same feedback within 3 seconds
const REP_FEEDBACK_DEBOUNCE_MS = 1500; // Shorter debounce for rep feedback

// Check for speech synthesis support (runs once at module load)
function checkSpeechSupport(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function useVoiceFeedback(): UseVoiceFeedbackReturn {
  const lastSpokenRef = useRef<Record<string, number>>({});
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isEnabled, setEnabled] = useState(true);

  // Compute support status on each render (safe since it's synchronous)
  const isSupported = checkSpeechSupport();

  const speak = useCallback(
    (text: string, key?: string) => {
      if (!isSupported || !isEnabled) return;

      const feedbackKey = key || text;
      const now = Date.now();
      const lastSpoken = lastSpokenRef.current[feedbackKey] || 0;

      if (now - lastSpoken < DEBOUNCE_MS) return;

      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      utterance.lang = "en-US"; // Always use English

      // Find an English voice - prefer Google/Natural voices, but accept any English voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (voice) =>
          voice.lang.startsWith("en") &&
          (voice.name.includes("Google") || voice.name.includes("Natural"))
      );
      const anyEnglishVoice = voices.find((voice) => voice.lang.startsWith("en"));

      if (preferredVoice) {
        utterance.voice = preferredVoice;
      } else if (anyEnglishVoice) {
        utterance.voice = anyEnglishVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
      lastSpokenRef.current[feedbackKey] = now;
    },
    [isSupported, isEnabled]
  );

  const speakIssue = useCallback(
    (issue: FormIssue) => {
      const message = VOICE_FEEDBACK[issue];
      if (message) {
        speak(message, issue);
      }
    },
    [speak]
  );

  const speakRepComplete = useCallback(
    (isGoodForm: boolean) => {
      const now = Date.now();
      const lastSpoken = lastSpokenRef.current["rep_complete"] || 0;

      if (now - lastSpoken < REP_FEEDBACK_DEBOUNCE_MS) return;

      const message = isGoodForm ? "Good rep!" : "Watch your form";
      speak(message, "rep_complete");
    },
    [speak]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  return {
    speak,
    speakIssue,
    speakRepComplete,
    stop,
    isSpeaking,
    isSupported,
    setEnabled,
    isEnabled,
  };
}
