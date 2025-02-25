import * as THREE from "three";
import { NormalizedLandmark } from "@mediapipe/tasks-vision";
import { VRM } from "@pixiv/three-vrm";

// MediaPipe face landmark indices for key facial features
const LANDMARK_INDICES = {
  NOSE_TIP: 1,
  FOREHEAD: 10,
  CHIN: 152,
  LEFT_EAR: 127,
  RIGHT_EAR: 356,
} as const;

// Rotation calculation constants
const ROTATION = {
  VERTICAL: {
    AMPLIFICATION: 1.2,
    RANGE: Math.PI / 4, // ±45 degrees
    SMOOTHING: 0.15,
  },
  HORIZONTAL: {
    RANGE: Math.PI / 3, // ±60 degrees
    SMOOTHING: 0.15,
  },
} as const;

/**
 * Converts MediaPipe's normalized coordinates to Three.js NDC (-1 to 1)
 * @param val Normalized coordinate value (0-1)
 * @returns Coordinate in Three.js Normalized Device Coordinates (-1 to 1)
 */
const convertToNDC = (val: number): number => val * 2 - 1;

/**
 * Calculates vertical head rotation (pitch) based on facial landmarks
 * @param landmarks MediaPipe face landmarks array
 * @param vrm VRM model reference
 * @returns Smoothed vertical rotation value for neck bone
 */
export const calculateVerticalRotation = (
  landmarks: NormalizedLandmark[],
  vrm: VRM
): number => {
  // Extract key landmarks for vertical calculation
  const nose = landmarks[LANDMARK_INDICES.NOSE_TIP];
  const forehead = landmarks[LANDMARK_INDICES.FOREHEAD];
  const chin = landmarks[LANDMARK_INDICES.CHIN];

  // Convert landmarks to Three.js coordinate system
  const nosePos = new THREE.Vector3(
    convertToNDC(nose.x),
    convertToNDC(nose.y),
    nose.z
  );

  const foreheadPos = new THREE.Vector3(
    convertToNDC(forehead.x),
    convertToNDC(forehead.y),
    forehead.z
  );

  const chinPos = new THREE.Vector3(
    convertToNDC(chin.x),
    convertToNDC(chin.y),
    chin.z
  );

  // Calculate vertical relationships
  const faceCenterY = (foreheadPos.y + chinPos.y) / 2;
  const verticalDeviation = nosePos.y - faceCenterY;
  const faceHeight = chinPos.y - foreheadPos.y;

  // Calculate normalized vertical ratio and convert to angle
  const verticalRatio = THREE.MathUtils.clamp(
    verticalDeviation / faceHeight,
    -1,
    1
  );
  let angle = Math.asin(verticalRatio);

  // Apply model-specific adjustments
  angle *= ROTATION.VERTICAL.AMPLIFICATION;
  angle = THREE.MathUtils.clamp(
    angle,
    -ROTATION.VERTICAL.RANGE,
    ROTATION.VERTICAL.RANGE
  );
  angle *= -1; // Invert axis for natural head movement

  // Smooth rotation transition
  const currentRotation =
    vrm.humanoid?.getNormalizedBoneNode("neck")?.rotation.x || 0;
  return THREE.MathUtils.lerp(
    currentRotation,
    angle,
    ROTATION.VERTICAL.SMOOTHING
  );
};

/**
 * Calculates horizontal head rotation (yaw) based on facial landmarks
 * @param landmarks MediaPipe face landmarks array
 * @param vrm VRM model reference
 * @returns Smoothed horizontal rotation value for neck bone
 */
export const calculateHorizontalRotation = (
  landmarks: NormalizedLandmark[],
  vrm: VRM
): number => {
  // Extract ear landmarks for horizontal calculation
  const leftEar = landmarks[LANDMARK_INDICES.LEFT_EAR];
  const rightEar = landmarks[LANDMARK_INDICES.RIGHT_EAR];

  // Convert landmarks to Three.js coordinate system
  const leftPos = new THREE.Vector3(
    convertToNDC(leftEar.x),
    convertToNDC(leftEar.y),
    leftEar.z
  );

  const rightPos = new THREE.Vector3(
    convertToNDC(rightEar.x),
    convertToNDC(rightEar.y),
    rightEar.z
  );

  // Calculate horizontal orientation vector between ears
  const earVector = new THREE.Vector3().subVectors(rightPos, leftPos);

  // Calculate angle relative to X-axis and adjust for coordinate system
  let angle = Math.atan2(earVector.z, earVector.x);
  angle = -angle; // Invert for Three.js right-handed system
  angle = THREE.MathUtils.clamp(
    angle,
    -ROTATION.HORIZONTAL.RANGE,
    ROTATION.HORIZONTAL.RANGE
  );

  // Smooth rotation transition
  const currentRotation =
    vrm.humanoid?.getNormalizedBoneNode("neck")?.rotation.y || 0;
  return THREE.MathUtils.lerp(
    currentRotation,
    angle,
    ROTATION.HORIZONTAL.SMOOTHING
  );
};
