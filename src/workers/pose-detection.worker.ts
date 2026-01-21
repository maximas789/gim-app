import { PoseLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";

let poseLandmarker: PoseLandmarker | null = null;
let isInitializing = false;

// Message types
export type WorkerMessageIn =
  | { type: "INIT" }
  | { type: "DETECT"; imageData: ImageBitmap; timestamp: number }
  | { type: "DESTROY" };

export type WorkerMessageOut =
  | { type: "READY" }
  | { type: "INIT_ERROR"; error: string }
  | {
      type: "RESULT";
      landmarks: Array<{ x: number; y: number; z: number; visibility: number }> | null;
      timestamp: number;
    }
  | { type: "DETECTION_ERROR"; error: string }
  | { type: "DESTROYED" };

// Handle incoming messages
self.onmessage = async (e: MessageEvent<WorkerMessageIn>) => {
  const message = e.data;

  switch (message.type) {
    case "INIT":
      await initializePoseLandmarker();
      break;

    case "DETECT":
      await detectPose(message.imageData, message.timestamp);
      break;

    case "DESTROY":
      destroyPoseLandmarker();
      break;
  }
};

async function initializePoseLandmarker() {
  if (poseLandmarker || isInitializing) {
    return;
  }

  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    const response: WorkerMessageOut = { type: "READY" };
    self.postMessage(response);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown initialization error";
    const response: WorkerMessageOut = {
      type: "INIT_ERROR",
      error: errorMessage,
    };
    self.postMessage(response);
  } finally {
    isInitializing = false;
  }
}

async function detectPose(imageBitmap: ImageBitmap, timestamp: number) {
  if (!poseLandmarker) {
    const response: WorkerMessageOut = {
      type: "DETECTION_ERROR",
      error: "PoseLandmarker not initialized",
    };
    self.postMessage(response);
    return;
  }

  try {
    // Create an OffscreenCanvas from the ImageBitmap
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext("2d");

    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.drawImage(imageBitmap, 0, 0);

    const results = poseLandmarker.detectForVideo(canvas, timestamp);

    const landmarks = results?.landmarks?.[0]
      ? results.landmarks[0].map((lm) => ({
          x: lm.x,
          y: lm.y,
          z: lm.z ?? 0,
          visibility: lm.visibility ?? 1,
        }))
      : null;

    const response: WorkerMessageOut = {
      type: "RESULT",
      landmarks,
      timestamp,
    };
    self.postMessage(response);

    // Close the ImageBitmap to free memory
    imageBitmap.close();
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown detection error";
    const response: WorkerMessageOut = {
      type: "DETECTION_ERROR",
      error: errorMessage,
    };
    self.postMessage(response);
  }
}

function destroyPoseLandmarker() {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
  const response: WorkerMessageOut = { type: "DESTROYED" };
  self.postMessage(response);
}
