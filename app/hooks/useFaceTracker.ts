"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export const useFaceTracker = () => {
  // Refs for MediaPipe and browser API objects
  const faceLandmarker = useRef<FaceLandmarker | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const faceResultRef = useRef<FaceLandmarkerResult | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Component state management
  const [isTracking, setIsTracking] = useState(false);
  const [cameraError, setCameraError] = useState("");

  //#region Core Tracking Functionality
  const initializeFaceLandmarker = useCallback(async () => {
    try {
      // Load MediaPipe vision WASM files and model
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
      );

      // Configure face landmark detection
      faceLandmarker.current = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task",
          delegate: "GPU", // Prefer GPU acceleration
        },
        runningMode: "VIDEO",
        numFaces: 1, // Only track one face
        outputFaceBlendshapes: true, // Required for facial expressions
        outputFacialTransformationMatrixes: true, // For head position/rotation
      });
    } catch (error) {
      console.error("Face landmarker initialization failed:", error);
      setCameraError("Failed to load face tracking model");
    }
  }, []);

  const startFaceDetection = useCallback(async () => {
    if (!videoRef.current) return;

    try {
      // Request camera access with ideal parameters
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 }, // Optimal resolution
          height: { ideal: 480 },
          facingMode: "user", // Front-facing camera / useful for mobile devices
        },
      });

      // Store and connect media stream
      mediaStreamRef.current = stream;
      videoRef.current.srcObject = stream;

      // Wait for video metadata to load
      await new Promise<void>((resolve) => {
        if (!videoRef.current) return;
        videoRef.current.onloadedmetadata = () => resolve();
      });

      // Start video playback and clear previous errors
      await videoRef.current.play();
      setCameraError("");

      // Prediction loop using requestAnimationFrame
      const predictFrame = async () => {
        if (!faceLandmarker.current || !videoRef.current) return;

        try {
          // Perform face detection on current video frame
          const result = faceLandmarker.current.detectForVideo(
            videoRef.current,
            performance.now() // Use high-precision timestamp
          );

          // Store latest detection results
          faceResultRef.current = result;
        } catch (error) {
          console.error("Face detection error:", error);
        }

        // Continue prediction loop
        animationFrameRef.current = requestAnimationFrame(predictFrame);
      };

      // Start initial prediction loop
      animationFrameRef.current = requestAnimationFrame(predictFrame);
    } catch (error) {
      console.error("Camera access failed:", error);
      setCameraError("Camera permissions required");
      setIsTracking(false);
    }
  }, []);

  const stopFaceDetection = useCallback(() => {
    // Cleanup animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop media stream tracks
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    // Reset video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    // Clear face results
    faceResultRef.current = null;
  }, []);
  //#endregion

  //#region Public API
  const toggleTracking = useCallback(async () => {
    if (isTracking) {
      stopFaceDetection();
    } else {
      // Lazy-load face landmarker on first use
      if (!faceLandmarker.current) await initializeFaceLandmarker();
      await startFaceDetection();
    }
    setIsTracking((prev) => !prev);
  }, [
    isTracking,
    initializeFaceLandmarker,
    startFaceDetection,
    stopFaceDetection,
  ]);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      stopFaceDetection();
      faceLandmarker.current?.close();
    };
  }, [stopFaceDetection]);
  //#endregion

  return {
    toggleTracking,
    faceRef: faceResultRef,
    isTracking,
    videoRef,
    cameraError,
  };
};
