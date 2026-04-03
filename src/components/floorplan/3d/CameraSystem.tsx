"use client";

import { useMemo, useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { CameraPreset } from "./constants";

// ── Wall collision types & helpers ──

export interface WallSegment {
  x1: number;
  z1: number;
  x2: number;
  z2: number;
}

const WALL_BUFFER = 0.3;

/**
 * 2D line-segment intersection test.
 * Returns true if segment (p1->p2) intersects segment (p3->p4).
 */
function segmentsIntersect(
  p1x: number, p1z: number, p2x: number, p2z: number,
  p3x: number, p3z: number, p4x: number, p4z: number,
): boolean {
  const d1x = p2x - p1x;
  const d1z = p2z - p1z;
  const d2x = p4x - p3x;
  const d2z = p4z - p3z;
  const denom = d1x * d2z - d1z * d2x;
  if (Math.abs(denom) < 1e-10) return false; // parallel
  const t = ((p3x - p1x) * d2z - (p3z - p1z) * d2x) / denom;
  const u = ((p3x - p1x) * d1z - (p3z - p1z) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Compute the closest point on a line segment to a given point.
 * Returns the signed distance from the wall (negative = inside buffer).
 */
function pointToSegmentDist(
  px: number, pz: number,
  ax: number, az: number, bx: number, bz: number,
): number {
  const dx = bx - ax;
  const dz = bz - az;
  const lenSq = dx * dx + dz * dz;
  if (lenSq < 1e-10) return Math.sqrt((px - ax) ** 2 + (pz - az) ** 2);
  let t = ((px - ax) * dx + (pz - az) * dz) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const closestX = ax + t * dx;
  const closestZ = az + t * dz;
  return Math.sqrt((px - closestX) ** 2 + (pz - closestZ) ** 2);
}

/**
 * Given a desired new position, resolve wall collisions by sliding along walls.
 * Modifies newX/newZ in place via the returned object.
 */
function resolveWallCollisions(
  oldX: number, oldZ: number,
  newX: number, newZ: number,
  walls: WallSegment[],
): { x: number; z: number } {
  let x = newX;
  let z = newZ;

  for (const wall of walls) {
    // Check if the movement path crosses this wall
    const crosses = segmentsIntersect(
      oldX, oldZ, x, z,
      wall.x1, wall.z1, wall.x2, wall.z2,
    );

    // Also check if we're too close to the wall
    const dist = pointToSegmentDist(x, z, wall.x1, wall.z1, wall.x2, wall.z2);

    if (crosses || dist < WALL_BUFFER) {
      // Wall tangent direction
      const wallDx = wall.x2 - wall.x1;
      const wallDz = wall.z2 - wall.z1;
      const wallLen = Math.sqrt(wallDx * wallDx + wallDz * wallDz);
      if (wallLen < 1e-10) continue;
      const tx = wallDx / wallLen;
      const tz = wallDz / wallLen;

      // Project movement onto wall tangent (slide along wall)
      const moveDx = x - oldX;
      const moveDz = z - oldZ;
      const dot = moveDx * tx + moveDz * tz;
      x = oldX + dot * tx;
      z = oldZ + dot * tz;

      // Push away from wall if still too close
      const distAfter = pointToSegmentDist(x, z, wall.x1, wall.z1, wall.x2, wall.z2);
      if (distAfter < WALL_BUFFER) {
        // Wall normal (perpendicular to tangent)
        const nx = -tz;
        const nz = tx;
        // Determine which side the old position is on
        const sideCheck = (oldX - wall.x1) * nx + (oldZ - wall.z1) * nz;
        const sign = sideCheck >= 0 ? 1 : -1;
        const pushDist = WALL_BUFFER - distAfter;
        x += sign * nx * pushDist;
        z += sign * nz * pushDist;
      }
    }
  }
  return { x, z };
}

// ── Walkthrough Controls ──

/** First-person walkthrough controls: WASD to move, mouse-drag to look around */
export function WalkthroughControls({
  cx,
  cz,
  span,
  wallSegments,
}: {
  cx: number;
  cz: number;
  span: number;
  wallSegments?: WallSegment[];
}) {
  const { camera, gl } = useThree();
  const keys = useRef<Set<string>>(new Set());
  const yaw = useRef(0);
  const pitch = useRef(-0.1);
  const dragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const initialized = useRef(false);

  // 66 inches (5'6" eye level) x S (1/12) x H_MULT (1.8) = 9.9 world units
  const EYE_HEIGHT = 66 * (1 / 12) * 1.8;
  const MOVE_SPEED = 5.0;
  const LOOK_SENSITIVITY = 0.003;

  // Initialize camera position on mount
  useEffect(() => {
    if (!initialized.current) {
      const dist = Math.max(span * 0.3, 4);
      camera.position.set(cx + dist, EYE_HEIGHT, cz + dist);
      yaw.current = Math.atan2(-(cx - camera.position.x), -(cz - camera.position.z));
      initialized.current = true;
    }
  }, [camera, cx, cz, span]);

  // Keyboard listeners
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => { keys.current.add(e.code); };
    const onUp = (e: KeyboardEvent) => { keys.current.delete(e.code); };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, []);

  // Mouse-drag look
  useEffect(() => {
    const canvas = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        dragging.current = true;
        lastMouse.current = { x: e.clientX, y: e.clientY };
      }
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      lastMouse.current = { x: e.clientX, y: e.clientY };
      yaw.current -= dx * LOOK_SENSITIVITY;
      pitch.current = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, pitch.current - dy * LOOK_SENSITIVITY));
    };
    const onMouseUp = () => { dragging.current = false; };
    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [gl]);

  // Reusable vectors — avoid allocating 3 Vector3s per frame (180/sec at 60fps)
  const _forward = useMemo(() => new THREE.Vector3(), []);
  const _right = useMemo(() => new THREE.Vector3(), []);
  const _lookTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    const speed = MOVE_SPEED * dt;

    // Direction vectors from yaw (reuse pre-allocated vectors)
    _forward.set(-Math.sin(yaw.current), 0, -Math.cos(yaw.current));
    _right.set(_forward.z, 0, -_forward.x);

    const oldX = camera.position.x;
    const oldZ = camera.position.z;
    let newX = oldX;
    let newZ = oldZ;

    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) {
      newX += _forward.x * speed;
      newZ += _forward.z * speed;
    }
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) {
      newX -= _forward.x * speed;
      newZ -= _forward.z * speed;
    }
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) {
      newX += _right.x * speed;
      newZ += _right.z * speed;
    }
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) {
      newX -= _right.x * speed;
      newZ -= _right.z * speed;
    }

    // Apply wall collision if wall segments are provided
    if (wallSegments && wallSegments.length > 0 && (newX !== oldX || newZ !== oldZ)) {
      const resolved = resolveWallCollisions(oldX, oldZ, newX, newZ, wallSegments);
      newX = resolved.x;
      newZ = resolved.z;
    }

    camera.position.x = newX;
    camera.position.z = newZ;

    // Lock to eye height
    camera.position.y = EYE_HEIGHT;

    // Apply look direction (reuse pre-allocated vector)
    _lookTarget.set(
      camera.position.x - Math.sin(yaw.current) * Math.cos(pitch.current),
      camera.position.y + Math.sin(pitch.current),
      camera.position.z - Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(_lookTarget);
  });

  return null;
}

// ── Camera Animator ──

/** Smoothly animates camera to preset positions using spring-damped interpolation */
export function CameraAnimator({
  preset,
  cx,
  cz,
  span,
  orbitControlsRef,
}: {
  preset: CameraPreset;
  cx: number;
  cz: number;
  span: number;
  orbitControlsRef?: React.RefObject<any>;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const targetLookAt = useRef(new THREE.Vector3(cx, 0, cz));
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const lookVelocity = useRef(new THREE.Vector3(0, 0, 0));
  const animating = useRef(false);
  const prevPreset = useRef(preset);

  // Auto-rotate state for presentation preset
  const autoRotateAngle = useRef(0);
  const autoRotateActive = useRef(false);
  const lastInteractionTime = useRef(0);
  const AUTO_ROTATE_SPEED = 0.1; // rad/sec
  const AUTO_ROTATE_RESUME_DELAY = 3.0; // seconds

  // Spring parameters: stiffness controls snap, damping controls overshoot
  const STIFFNESS = 4.0;
  const DAMPING = 5.0;

  useEffect(() => {
    if (preset === prevPreset.current) return;
    prevPreset.current = preset;

    const dist = Math.max(span * 0.75, 8);
    // Default look-at target is the center
    targetLookAt.current.set(cx, 0, cz);

    switch (preset) {
      case "birds-eye":
        targetPos.current.set(cx, dist * 1.2, cz + 0.01);
        break;
      case "eye-level":
        targetPos.current.set(cx + dist * 0.7, 66 * (1 / 12) * 1.8, cz + dist * 0.7);
        break;
      case "presentation":
        targetPos.current.set(cx + dist * 0.35, dist * 0.25, cz + dist * 0.5);
        // Enable auto-rotate after animation settles
        autoRotateActive.current = false;
        autoRotateAngle.current = Math.atan2(
          dist * 0.35, // x offset
          dist * 0.5,  // z offset
        );
        break;
      default:
        targetPos.current.set(cx + dist * 0.5, dist * 0.45, cz + dist * 0.7);
        break;
    }
    velocity.current.set(0, 0, 0);
    lookVelocity.current.set(0, 0, 0);
    animating.current = true;
    // Disable auto-rotate when switching away from presentation
    if (preset !== "presentation") {
      autoRotateActive.current = false;
    }
  }, [preset, cx, cz, span, camera]);

  // Track user interaction to pause auto-rotate
  useEffect(() => {
    if (preset !== "presentation") return;
    const onInteraction = () => {
      lastInteractionTime.current = performance.now() / 1000;
      autoRotateActive.current = false;
    };
    window.addEventListener("pointerdown", onInteraction);
    window.addEventListener("wheel", onInteraction);
    return () => {
      window.removeEventListener("pointerdown", onInteraction);
      window.removeEventListener("wheel", onInteraction);
    };
  }, [preset]);

  useFrame((_, delta) => {
    // Clamp delta to avoid instability on tab-switch or lag spikes
    const dt = Math.min(delta, 0.05);

    if (animating.current) {
      // Spring force on camera position
      const dx = camera.position.x - targetPos.current.x;
      const dy = camera.position.y - targetPos.current.y;
      const dz = camera.position.z - targetPos.current.z;

      velocity.current.x += (-STIFFNESS * dx - DAMPING * velocity.current.x) * dt;
      velocity.current.y += (-STIFFNESS * dy - DAMPING * velocity.current.y) * dt;
      velocity.current.z += (-STIFFNESS * dz - DAMPING * velocity.current.z) * dt;

      camera.position.x += velocity.current.x * dt;
      camera.position.y += velocity.current.y * dt;
      camera.position.z += velocity.current.z * dt;

      // Spring force on orbit target (look-at point)
      if (orbitControlsRef?.current) {
        const ctrl = orbitControlsRef.current;
        const tlx = ctrl.target.x - targetLookAt.current.x;
        const tly = ctrl.target.y - targetLookAt.current.y;
        const tlz = ctrl.target.z - targetLookAt.current.z;

        lookVelocity.current.x += (-STIFFNESS * tlx - DAMPING * lookVelocity.current.x) * dt;
        lookVelocity.current.y += (-STIFFNESS * tly - DAMPING * lookVelocity.current.y) * dt;
        lookVelocity.current.z += (-STIFFNESS * tlz - DAMPING * lookVelocity.current.z) * dt;

        ctrl.target.x += lookVelocity.current.x * dt;
        ctrl.target.y += lookVelocity.current.y * dt;
        ctrl.target.z += lookVelocity.current.z * dt;
      }

      const posDist = camera.position.distanceTo(targetPos.current);
      const speed = velocity.current.length();
      if (posDist < 0.02 && speed < 0.01) {
        camera.position.copy(targetPos.current);
        velocity.current.set(0, 0, 0);
        lookVelocity.current.set(0, 0, 0);
        animating.current = false;

        // Start auto-rotate for presentation preset after animation settles
        if (preset === "presentation") {
          autoRotateActive.current = true;
          lastInteractionTime.current = performance.now() / 1000;
        }
      }
    }

    // Auto-rotate for presentation preset
    if (preset === "presentation" && !animating.current) {
      const now = performance.now() / 1000;
      const timeSinceInteraction = now - lastInteractionTime.current;

      // Resume auto-rotate after delay
      if (!autoRotateActive.current && timeSinceInteraction > AUTO_ROTATE_RESUME_DELAY) {
        autoRotateActive.current = true;
        // Sync angle to current camera position
        autoRotateAngle.current = Math.atan2(
          camera.position.x - cx,
          camera.position.z - cz,
        );
      }

      if (autoRotateActive.current) {
        autoRotateAngle.current += AUTO_ROTATE_SPEED * dt;
        const dist = Math.max(span * 0.75, 8);
        const radius = Math.sqrt(
          (dist * 0.35) ** 2 + (dist * 0.5) ** 2,
        );
        camera.position.x = cx + Math.sin(autoRotateAngle.current) * radius;
        camera.position.z = cz + Math.cos(autoRotateAngle.current) * radius;
        // Keep the same height
        camera.position.y = dist * 0.25;

        // Update orbit controls target to keep looking at center
        if (orbitControlsRef?.current) {
          orbitControlsRef.current.target.set(cx, 0, cz);
        }
      }
    }
  });

  return null;
}

// ── FPS Counter (Dev Mode Only) ──

export function FPSCounter() {
  const [fps, setFps] = useState(0);
  const frameTimes = useRef<number[]>([]);
  const lastUpdate = useRef(0);

  useFrame(() => {
    const now = performance.now();
    frameTimes.current.push(now);

    // Keep only the last 60 frame timestamps for rolling average
    if (frameTimes.current.length > 60) {
      frameTimes.current.shift();
    }

    // Update display every 500ms to avoid re-render thrash
    if (now - lastUpdate.current > 500 && frameTimes.current.length > 2) {
      const times = frameTimes.current;
      const elapsed = times[times.length - 1] - times[0];
      const avgFps = Math.round(((times.length - 1) / elapsed) * 1000);
      setFps(avgFps);
      lastUpdate.current = now;
    }
  });

  if (process.env.NODE_ENV !== "development") return null;

  return (
    <Html
      style={{
        position: "fixed",
        bottom: "8px",
        left: "8px",
        fontFamily: "monospace",
        fontSize: "11px",
        color: "#0f0",
        background: "rgba(0,0,0,0.6)",
        padding: "2px 6px",
        borderRadius: "3px",
        pointerEvents: "none",
        zIndex: 9999,
        userSelect: "none",
      }}
    >
      {fps} FPS
    </Html>
  );
}
