"use client";

import { useMemo, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import type { CameraPreset } from "./constants";

/** First-person walkthrough controls: WASD to move, mouse-drag to look around */
export function WalkthroughControls({ cx, cz, span }: { cx: number; cz: number; span: number }) {
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

    if (keys.current.has("KeyW") || keys.current.has("ArrowUp")) camera.position.addScaledVector(_forward, speed);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown")) camera.position.addScaledVector(_forward, -speed);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft")) camera.position.addScaledVector(_right, speed);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight")) camera.position.addScaledVector(_right, -speed);

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

/** Smoothly animates camera to preset positions using spring-damped interpolation */
export function CameraAnimator({
  preset,
  cx,
  cz,
  span,
}: {
  preset: CameraPreset;
  cx: number;
  cz: number;
  span: number;
}) {
  const { camera } = useThree();
  const targetPos = useRef(new THREE.Vector3());
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const animating = useRef(false);
  const prevPreset = useRef(preset);

  // Spring parameters: stiffness controls snap, damping controls overshoot
  const STIFFNESS = 4.0;
  const DAMPING = 5.0;

  useEffect(() => {
    if (preset === prevPreset.current) return;
    prevPreset.current = preset;

    const dist = Math.max(span * 0.75, 8);
    switch (preset) {
      case "birds-eye":
        targetPos.current.set(cx, dist * 1.2, cz + 0.01);
        break;
      case "eye-level":
        targetPos.current.set(cx + dist * 0.7, 66 * (1 / 12) * 1.8, cz + dist * 0.7);
        break;
      case "presentation":
        targetPos.current.set(cx + dist * 0.35, dist * 0.25, cz + dist * 0.5);
        break;
      default:
        targetPos.current.set(cx + dist * 0.5, dist * 0.45, cz + dist * 0.7);
        break;
    }
    velocity.current.set(0, 0, 0);
    animating.current = true;
  }, [preset, cx, cz, span, camera]);

  useFrame((_, delta) => {
    if (!animating.current) return;
    // Clamp delta to avoid instability on tab-switch or lag spikes
    const dt = Math.min(delta, 0.05);

    // Spring force: F = -stiffness * displacement - damping * velocity
    const dx = camera.position.x - targetPos.current.x;
    const dy = camera.position.y - targetPos.current.y;
    const dz = camera.position.z - targetPos.current.z;

    velocity.current.x += (-STIFFNESS * dx - DAMPING * velocity.current.x) * dt;
    velocity.current.y += (-STIFFNESS * dy - DAMPING * velocity.current.y) * dt;
    velocity.current.z += (-STIFFNESS * dz - DAMPING * velocity.current.z) * dt;

    camera.position.x += velocity.current.x * dt;
    camera.position.y += velocity.current.y * dt;
    camera.position.z += velocity.current.z * dt;

    const dist = camera.position.distanceTo(targetPos.current);
    const speed = velocity.current.length();
    if (dist < 0.02 && speed < 0.01) {
      camera.position.copy(targetPos.current);
      velocity.current.set(0, 0, 0);
      animating.current = false;
    }
  });

  return null;
}
