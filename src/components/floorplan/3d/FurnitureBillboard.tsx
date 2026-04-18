"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { S, H_MULT } from "./constants";

// Fragment shader keys out the dark studio background from raw product renders
// by mapping luminance to alpha. Thresholds are tuned for the existing asset
// library (RGB ~30–45 background, ~50+ lightest object shadows).
const fragmentShader = `
  uniform sampler2D map;
  uniform float thresholdLow;
  uniform float thresholdHigh;
  uniform float opacity;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(map, vUv);
    float lum = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    float alpha = smoothstep(thresholdLow, thresholdHigh, lum) * opacity;
    if (alpha < 0.01) discard;
    gl_FragColor = vec4(tex.rgb, alpha);
  }
`;

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/**
 * Camera-facing textured plane — "billboard impostor" for assets that have a
 * raw perspective render (.webp) but no polished GLTF (or when GLTFs are
 * disabled by the quality tier).
 *
 * The plane is anchored at the object's footprint (Y=0 = floor) and stands
 * upright at the object's physical height. It always faces the camera on its
 * Y axis (like a tree billboard), so the rendered perspective reads correctly
 * from typical 3D view angles.
 */
export function FurnitureBillboard({
  url,
  widthInches,
  heightInches,
  depthInches,
}: {
  url: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useTexture(url);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  }, [texture]);

  // Billboard width = widest of footprint (width/depth). Height is physical.
  // We inflate the plane slightly so rendered shadows/feathering below the
  // object don't get clipped at the floor.
  const { planeW, planeH } = useMemo(() => {
    const footprintMax = Math.max(widthInches, depthInches);
    const planeW = footprintMax * S * 1.2;
    const planeH = heightInches * S * H_MULT * 1.15;
    return { planeW, planeH };
  }, [widthInches, heightInches, depthInches]);

  const uniforms = useMemo(
    () => ({
      map: { value: texture },
      thresholdLow: { value: 0.11 },
      thresholdHigh: { value: 0.24 },
      opacity: { value: 1.0 },
    }),
    [texture]
  );

  // Face the camera on Y axis each frame (billboard impostor behavior).
  // We hook directly on the group's matrix rather than via useFrame to avoid
  // re-entering React's render cycle for every piece of furniture.
  useEffect(() => {
    if (!groupRef.current) return;
    const group = groupRef.current;
    const prevOnBeforeRender = group.onBeforeRender;
    group.onBeforeRender = (renderer, scene, camera, geometry, material, groupHint) => {
      const camPos = camera.position;
      const worldPos = new THREE.Vector3();
      group.getWorldPosition(worldPos);
      const dx = camPos.x - worldPos.x;
      const dz = camPos.z - worldPos.z;
      // Local Y rotation that points +Z toward the camera.
      // Parent may already rotate us for object orientation; we counter that
      // here by using world-space targeting against the local matrix.
      const parent = group.parent;
      const parentYaw = parent ? new THREE.Euler().setFromQuaternion(parent.getWorldQuaternion(new THREE.Quaternion()), "YXZ").y : 0;
      group.rotation.y = Math.atan2(dx, dz) - parentYaw;
      if (prevOnBeforeRender) prevOnBeforeRender(renderer, scene, camera, geometry, material, groupHint);
    };
    return () => {
      group.onBeforeRender = prevOnBeforeRender;
    };
  }, []);

  return (
    <group ref={groupRef}>
      <mesh position={[0, planeH / 2, 0]}>
        <planeGeometry args={[planeW, planeH]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

/** Error boundary — a broken texture shouldn't break the whole scene */
export class BillboardErrorBoundary extends React.Component<
  { children: React.ReactNode; furnitureId: string },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; furnitureId: string }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn(`[3D] Billboard failed for "${this.props.furnitureId}": ${error.message}`);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
