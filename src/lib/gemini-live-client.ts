// Gemini Live API WebSocket Client
// Handles real-time bidirectional communication with Gemini

export type GeminiConnectionState =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export interface GeminiSetupConfig {
  model: string;
  generationConfig: {
    responseModalities: readonly string[];
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: string;
        };
      };
    };
  };
  systemInstruction: {
    parts: { text: string }[];
  };
}

export interface GeminiSessionSettings {
  videoFps: number;
  videoQuality: number;
  videoMaxWidth: number;
  audioInputSampleRate: number;
  audioOutputSampleRate: number;
}

export interface GeminiSessionResponse {
  wsUrl: string;
  setupConfig: GeminiSetupConfig;
  settings: GeminiSessionSettings;
}

export interface GeminiLiveClientOptions {
  onAudioResponse?: (base64Audio: string) => void;
  onTextResponse?: (text: string) => void;
  onConnectionChange?: (state: GeminiConnectionState) => void;
  onError?: (error: Error) => void;
  onInterrupted?: () => void;
}

/**
 * WebSocket client for Gemini Live API (bidiGenerateContent)
 */
export class GeminiLiveClient {
  private ws: WebSocket | null = null;
  private state: GeminiConnectionState = "disconnected";
  private options: GeminiLiveClientOptions;
  private settings: GeminiSessionSettings | null = null;
  private setupComplete: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor(options: GeminiLiveClientOptions = {}) {
    this.options = options;
  }

  /**
   * Connect to Gemini Live API
   */
  async connect(sessionResponse: GeminiSessionResponse): Promise<void> {
    if (this.ws) {
      this.disconnect();
    }

    this.settings = sessionResponse.settings;
    this.setState("connecting");

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(sessionResponse.wsUrl);

        this.ws.onopen = () => {
          // Send setup message immediately after connection
          this.sendSetup(sessionResponse.setupConfig);
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data, resolve);
        };

        this.ws.onerror = (event) => {
          console.error("Gemini WebSocket error:", event);
          this.setState("error");
          this.options.onError?.(new Error("WebSocket connection error"));
          reject(new Error("WebSocket connection error"));
        };

        this.ws.onclose = (event) => {
          console.warn("Gemini WebSocket closed:", event.code, event.reason);

          // If we were connected and closed unexpectedly, try to reconnect
          if (
            this.state === "connected" &&
            this.reconnectAttempts < this.maxReconnectAttempts
          ) {
            this.reconnectAttempts++;
            console.warn(
              `Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`
            );
            // Note: Reconnection would need the session response again
          }

          this.setState("disconnected");
          this.setupComplete = false;
        };
      } catch (error) {
        this.setState("error");
        reject(error);
      }
    });
  }

  /**
   * Send setup configuration to initialize the session
   */
  private sendSetup(config: GeminiSetupConfig): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error("Cannot send setup: WebSocket not open");
      return;
    }

    const setupMessage = {
      setup: config,
    };

    this.ws.send(JSON.stringify(setupMessage));
  }

  /**
   * Handle incoming messages from Gemini
   */
  private handleMessage(data: string, connectResolve?: () => void): void {
    try {
      const message = JSON.parse(data);

      // Setup complete acknowledgment
      if (message.setupComplete) {
        this.setupComplete = true;
        this.setState("connected");
        this.reconnectAttempts = 0;
        connectResolve?.();
        return;
      }

      // Server content (audio/text responses)
      if (message.serverContent) {
        const content = message.serverContent;

        // Check if this is an interruption (user started speaking)
        if (content.interrupted) {
          this.options.onInterrupted?.();
          return;
        }

        // Check if turn is complete
        if (content.turnComplete) {
          // Turn is done, no more content for this response
          return;
        }

        // Process model turn content
        if (content.modelTurn?.parts) {
          for (const part of content.modelTurn.parts) {
            // Handle audio response
            if (part.inlineData?.mimeType?.startsWith("audio/")) {
              this.options.onAudioResponse?.(part.inlineData.data);
            }

            // Handle text response (if any)
            if (part.text) {
              this.options.onTextResponse?.(part.text);
            }
          }
        }
      }

      // Tool calls (not used for gym coach, but handle gracefully)
      if (message.toolCall) {
        console.warn("Received tool call (not implemented):", message.toolCall);
      }
    } catch (error) {
      console.error("Error parsing Gemini message:", error, data);
    }
  }

  /**
   * Send audio data to Gemini
   * @param base64Audio Base64-encoded 16-bit PCM audio
   */
  sendAudio(base64Audio: string): void {
    if (!this.isReady()) {
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio,
          },
        ],
      },
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Send video frame to Gemini
   * @param base64Image Base64-encoded JPEG image
   */
  sendVideo(base64Image: string): void {
    if (!this.isReady()) {
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: "image/jpeg",
            data: base64Image,
          },
        ],
      },
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Send both audio and video in a single message
   */
  sendMediaChunks(audio?: string, video?: string): void {
    if (!this.isReady()) {
      return;
    }

    const mediaChunks: { mimeType: string; data: string }[] = [];

    if (audio) {
      mediaChunks.push({
        mimeType: "audio/pcm;rate=16000",
        data: audio,
      });
    }

    if (video) {
      mediaChunks.push({
        mimeType: "image/jpeg",
        data: video,
      });
    }

    if (mediaChunks.length === 0) {
      return;
    }

    const message = {
      realtimeInput: {
        mediaChunks,
      },
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Send text message to Gemini (for user questions)
   */
  sendText(text: string): void {
    if (!this.isReady()) {
      return;
    }

    const message = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [{ text }],
          },
        ],
        turnComplete: true,
      },
    };

    this.ws!.send(JSON.stringify(message));
  }

  /**
   * Disconnect from Gemini
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState("disconnected");
    this.setupComplete = false;
  }

  /**
   * Check if client is ready to send/receive
   */
  isReady(): boolean {
    return (
      this.ws !== null &&
      this.ws.readyState === WebSocket.OPEN &&
      this.setupComplete
    );
  }

  /**
   * Get current connection state
   */
  getState(): GeminiConnectionState {
    return this.state;
  }

  /**
   * Get session settings
   */
  getSettings(): GeminiSessionSettings | null {
    return this.settings;
  }

  private setState(state: GeminiConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.options.onConnectionChange?.(state);
    }
  }
}
