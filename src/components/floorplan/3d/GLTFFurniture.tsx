"use client";

import React, { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { S, H_MULT } from "./constants";
import { useGLTFCloned } from "./useAssetModel";

/**
 * Error boundary that catches GLTF loading errors and returns null,
 * allowing the parent to fall back to procedural geometry.
 */
export class GLTFErrorBoundary extends React.Component<
  { children: React.ReactNode; furnitureId: string; onError?: () => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; furnitureId: string; onError?: () => void }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }
  componentDidCatch(error: Error) {
    console.warn(`[3D] GLTF load failed for "${this.props.furnitureId}": ${error.message}`);
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}

/**
 * Inner component that loads and renders a GLTF model.
 * Must be inside a Suspense boundary (useGLTFCloned suspends via useGLTF).
 */
export function GLTFFurnitureInner({
  url,
  widthInches,
  heightInches,
  depthInches,
  color,
}: {
  url: string;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  color?: string;
}) {
  const scene = useGLTFCloned(url);
  return (
    <GLTFFurniture
      scene={scene}
      widthInches={widthInches}
      heightInches={heightInches}
      depthInches={depthInches}
      color={color}
    />
  );
}

/**
 * Renders a loaded GLTF model with proper positioning and scaling
 * to match the furniture's dimensions in the floor plan.
 *
 * Models are authored in real-world meters (Y-up, centered at origin, bottom at Y=0).
 * The floor plan uses S = 1/12 (inches to world units) with H_MULT = 1.8 for height.
 */
export function GLTFFurniture({
  scene,
  widthInches,
  heightInches,
  depthInches,
  color,
}: {
  scene: THREE.Group;
  widthInches: number;
  heightInches: number;
  depthInches: number;
  color?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);

  // Compute the scale to fit the model into the furniture's bounding box
  const { scaleVec } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene);
    const modelSize = box.getSize(new THREE.Vector3());

    // Target size in floorplan world units
    // Width and depth use S directly; height uses S * H_MULT
    const targetW = widthInches * S;
    const targetH = heightInches * S * H_MULT;
    const targetD = depthInches * S;

    // Model size is in meters. Convert to floorplan world units for scaling.
    // 1 meter = 39.3701 inches, and S = 1/12 world units per inch
    // So 1 meter = 39.3701 / 12 = 3.2808 world units
    // But we want to scale the model so that it fills the target bounding box.
    // Scale = target / modelSize (both in world units, but model is in meters)
    // We need: scaledModel * modelSize = target
    // So scale = target / modelSize

    const sx = modelSize.x > 0 ? targetW / modelSize.x : 1;
    const sy = modelSize.y > 0 ? targetH / modelSize.y : 1;
    const sz = modelSize.z > 0 ? targetD / modelSize.z : 1;

    return { scaleVec: new THREE.Vector3(sx, sy, sz) };
  }, [scene, widthInches, heightInches, depthInches]);

  // Apply color override to mat_primary material slot
  useEffect(() => {
    if (!color) return;
    const targetColor = new THREE.Color(color);
    scene.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => {
            if (m.name === "mat_primary" && "color" in m) {
              (m as THREE.MeshStandardMaterial).color.copy(targetColor);
            }
          });
        } else if (mat && mat.name === "mat_primary" && "color" in mat) {
          (mat as THREE.MeshStandardMaterial).color.copy(targetColor);
        }
      }
    });
  }, [scene, color]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} scale={scaleVec} />
    </group>
  );
}
