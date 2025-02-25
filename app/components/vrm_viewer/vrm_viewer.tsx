"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { VRMLoaderPlugin, VRMUtils, VRM } from "@pixiv/three-vrm";
import { useFaceTracker } from "../../hooks/useFaceTracker";
import {
  calculateHorizontalRotation,
  calculateVerticalRotation,
} from "../../utils/calculateHeadRotation";

export default function VrmViewer() {
  // Refs for Three.js objects
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const vrmRef = useRef<VRM | null>(null);
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());

  // Face tracking and state management
  const { toggleTracking, faceRef, isTracking, videoRef, cameraError } =
    useFaceTracker();
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);

  // Camera reset functionality
  const resetControls = () => {
    if (controlsRef.current && cameraRef.current) {
      cameraRef.current.position.set(0.0, 1.3, 1.5);
      controlsRef.current.target.set(0.0, 1.3, 0.0);
      controlsRef.current.update();
    }
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    //#region Three.js Scene Setup
    // Initialize WebGL renderer with performance settings
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(window.devicePixelRatio);

    // Create scene and basic lighting
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Configure main camera
    const camera = new THREE.PerspectiveCamera(
      30,
      window.innerWidth / window.innerHeight,
      0.1,
      20
    );
    camera.position.set(0.0, 1.3, 1.5);
    cameraRef.current = camera;

    // Set up orbital controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controlsRef.current = controls;
    controls.screenSpacePanning = true;
    controls.target.set(0.0, 1.3, 0.0);
    controls.update();

    // Add directional light and visual helpers
    const light = new THREE.DirectionalLight(0xffffff, Math.PI);
    light.position.set(1.0, 1.0, 1.0).normalize();

    scene.add(light, new THREE.GridHelper(10, 10), new THREE.AxesHelper(5));
    //#endregion

    //#region VRM Model Loading
    const loader = new GLTFLoader();
    loader.crossOrigin = "anonymous";
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      "/models/holo.vrm",
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;

        // Optimize VRM model
        VRMUtils.removeUnnecessaryVertices(gltf.scene);
        VRMUtils.combineSkeletons(gltf.scene);
        VRMUtils.combineMorphs(vrm);

        // Configure model settings
        vrm.scene.traverse((obj) => (obj.frustumCulled = false));
        vrm.scene.rotation.y = Math.PI; // Rotate 180 degrees to face camera
        scene.add(vrm.scene);

        setLoadingProgress(null);
      },
      (progress) =>
        setLoadingProgress((progress.loaded / progress.total) * 100),
      (error) => {
        console.error("VRM load error:", error);
        setLoadingProgress(null);
      }
    );
    //#endregion

    //#region Window Resize Handler
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial sizing
    //#endregion

    //#region Animation Loop
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();
      const landmarks = faceRef.current?.faceLandmarks?.[0];

      // Update VRM model state
      if (vrmRef.current) {
        vrmRef.current.update(delta);
        const neckBone = vrmRef.current.humanoid?.getNormalizedBoneNode("neck");

        if (neckBone) {
          if (landmarks) {
            // Apply calculated rotations from face tracking
            neckBone.rotation.x = calculateVerticalRotation(
              landmarks,
              vrmRef.current
            );
            neckBone.rotation.y = calculateHorizontalRotation(
              landmarks,
              vrmRef.current
            );
          } else {
            // Reset to neutral position when no face detected
            neckBone.rotation.set(0, 0, 0);
          }
        }
      }

      // Update scene
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    //#endregion

    // Cleanup resources
    return () => {
      renderer.dispose();
      controls.dispose();
      scene.clear();
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <div className="relative w-full h-screen">
      <canvas ref={canvasRef} className="w-full h-screen bg-secondary" />

      {/* Loading overlay with progress indicator */}
      {loadingProgress !== null && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <p className="font-space-grotesk text-primary text-xl">
            Loading model... {Math.round(loadingProgress)}%
          </p>
        </div>
      )}

      {/* Webcam preview panel */}
      <div
        className="absolute top-4 right-4 w-48 h-36 bg-secondary rounded-lg overflow-hidden"
        style={{ display: isTracking ? "block" : "none" }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          muted
          playsInline
          style={{ transform: "scaleX(-1)" }}
        />
        {!videoRef.current?.srcObject && (
          <div className="absolute inset-0 flex items-center justify-center text-primary">
            <p>Initializing camera...</p>
          </div>
        )}
      </div>

      {/* Error display */}
      {cameraError && (
        <div className="absolute top-4 left-4 z-20 p-4 bg-red-500 text-white rounded-lg">
          {cameraError}
        </div>
      )}

      {/* Control buttons container */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
        <button
          onClick={toggleTracking}
          className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-opacity-80 transition-all"
        >
          {isTracking ? "Stop Tracking" : "Start Face Tracking"}
        </button>
        <button
          onClick={resetControls}
          className="px-4 py-2 bg-primary text-secondary rounded-lg hover:bg-opacity-80 transition-all"
        >
          Reset Camera
        </button>
      </div>
    </div>
  );
}
