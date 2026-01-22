// Audio utilities for Gemini Live API
// Handles PCM conversion and audio playback

import { GEMINI_CONFIG } from "./gemini-config";

/**
 * Convert Float32Array audio samples to 16-bit PCM encoded as base64
 * Gemini expects: 16-bit PCM, mono, 16kHz
 */
export function float32ToBase64PCM(float32Array: Float32Array): string {
  // Convert Float32 (-1 to 1) to Int16 (-32768 to 32767)
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp and convert
    const sample = Math.max(-1, Math.min(1, float32Array[i] ?? 0));
    int16Array[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
  }

  // Convert to base64
  const uint8Array = new Uint8Array(int16Array.buffer);
  let binary = "";
  for (let i = 0; i < uint8Array.length; i++) {
    binary += String.fromCharCode(uint8Array[i] ?? 0);
  }
  return btoa(binary);
}

/**
 * Convert base64-encoded 16-bit PCM to Float32Array for playback
 * Gemini outputs: 16-bit PCM, mono, 24kHz
 */
export function base64PCMToFloat32(base64: string): Float32Array {
  // Decode base64 to binary
  const binary = atob(base64);
  const uint8Array = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    uint8Array[i] = binary.charCodeAt(i);
  }

  // Convert to Int16
  const int16Array = new Int16Array(uint8Array.buffer);

  // Convert Int16 to Float32
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    const sample = int16Array[i] ?? 0;
    float32Array[i] = sample / (sample < 0 ? 0x8000 : 0x7fff);
  }

  return float32Array;
}

/**
 * Audio playback manager using Web Audio API
 * Plays back audio chunks received from Gemini
 */
export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private scheduledTime: number = 0;
  private isPlaying: boolean = false;

  constructor() {
    // AudioContext will be created on first play (must be after user interaction)
  }

  private ensureContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new AudioContext({
        sampleRate: GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE,
      });
    }
    return this.audioContext;
  }

  /**
   * Queue an audio chunk for playback
   */
  playChunk(float32Data: Float32Array): void {
    const ctx = this.ensureContext();

    // Resume context if suspended (browser autoplay policy)
    if (ctx.state === "suspended") {
      ctx.resume();
    }

    // Create audio buffer
    const audioBuffer = ctx.createBuffer(
      1, // mono
      float32Data.length,
      GEMINI_CONFIG.AUDIO_OUTPUT_SAMPLE_RATE
    );
    audioBuffer.getChannelData(0).set(float32Data);

    // Create source node
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);

    // Schedule playback
    const now = ctx.currentTime;
    const startTime = Math.max(now, this.scheduledTime);
    source.start(startTime);

    // Update scheduled time for next chunk
    this.scheduledTime = startTime + audioBuffer.duration;
    this.isPlaying = true;

    // Mark as not playing when done
    source.onended = () => {
      if (ctx.currentTime >= this.scheduledTime - 0.1) {
        this.isPlaying = false;
      }
    };
  }

  /**
   * Play base64-encoded PCM audio from Gemini response
   */
  playBase64PCM(base64: string): void {
    const float32Data = base64PCMToFloat32(base64);
    this.playChunk(float32Data);
  }

  /**
   * Stop all audio playback
   */
  stop(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.scheduledTime = 0;
    this.isPlaying = false;
  }

  /**
   * Check if audio is currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

/**
 * Audio recorder for capturing microphone input
 * Captures audio at 16kHz for Gemini
 */
export class AudioRecorder {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private onAudioData: ((data: string) => void) | null = null;

  /**
   * Start recording audio from microphone
   * @param onAudioData Callback that receives base64-encoded PCM chunks
   */
  async start(onAudioData: (data: string) => void): Promise<void> {
    this.onAudioData = onAudioData;

    // Get microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: GEMINI_CONFIG.AUDIO_INPUT_SAMPLE_RATE,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });

    // Create audio context at correct sample rate
    this.audioContext = new AudioContext({
      sampleRate: GEMINI_CONFIG.AUDIO_INPUT_SAMPLE_RATE,
    });

    // Create source from microphone
    const source = this.audioContext.createMediaStreamSource(this.mediaStream);

    // Create processor to capture audio chunks
    // Note: ScriptProcessorNode is deprecated but AudioWorklet requires more setup
    // Using 4096 buffer size for ~256ms chunks at 16kHz
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (event) => {
      const inputData = event.inputBuffer.getChannelData(0);
      const base64 = float32ToBase64PCM(inputData);
      this.onAudioData?.(base64);
    };

    // Connect the audio graph
    source.connect(this.processor);
    this.processor.connect(this.audioContext.destination);
  }

  /**
   * Stop recording
   */
  stop(): void {
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.onAudioData = null;
  }
}

/**
 * Convert a canvas frame to base64 JPEG for Gemini
 */
export function canvasToBase64JPEG(
  canvas: HTMLCanvasElement,
  quality: number = GEMINI_CONFIG.VIDEO_QUALITY
): string {
  const dataUrl = canvas.toDataURL("image/jpeg", quality);
  // Remove the "data:image/jpeg;base64," prefix
  const parts = dataUrl.split(",");
  return parts[1] ?? "";
}

/**
 * Resize video frame if needed and convert to base64
 */
export function videoFrameToBase64(
  video: HTMLVideoElement,
  maxWidth: number = GEMINI_CONFIG.VIDEO_MAX_WIDTH,
  quality: number = GEMINI_CONFIG.VIDEO_QUALITY
): string {
  // Calculate dimensions maintaining aspect ratio
  let width = video.videoWidth;
  let height = video.videoHeight;

  if (width > maxWidth) {
    const ratio = maxWidth / width;
    width = maxWidth;
    height = Math.round(height * ratio);
  }

  // Create canvas for resize
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to get canvas context");
  }

  // Draw video frame
  ctx.drawImage(video, 0, 0, width, height);

  // Convert to base64
  return canvasToBase64JPEG(canvas, quality);
}
