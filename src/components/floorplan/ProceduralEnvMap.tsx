"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import {
  PMREMGenerator,
  Scene as ThreeScene,
  Color,
  Mesh,
  SphereGeometry,
  MeshBasicMaterial,
  BackSide,
  Float32BufferAttribute,
} from "three";

// Mood-driven gradient colors for the environment map
// Now includes a horizon band and key-light spot for richer reflections
const ENV_GRADIENTS: Record<string, { sky: string; ground: string; horizon: string; keySpot: string }> = {
  warm: { sky: "#fdf8f0", ground: "#d4c8b8", horizon: "#f5e8d0", keySpot: "#fff5e0" },
  cool: { sky: "#e8f0ff", ground: "#d0d4e0", horizon: "#dce4f0", keySpot: "#f0f4ff" },
  dramatic: { sky: "#ffe0b0", ground: "#2a2530", horizon: "#8a6040", keySpot: "#ffe8c0" },
  neutral: { sky: "#f5f5f5", ground: "#e0e0e0", horizon: "#ebebeb", keySpot: "#ffffff" },
};

interface ProceduralEnvMapProps {
  mood: string;
  /** Size of the cubemap face in pixels. Quality tier controls this. */
  size?: number;
}

/**
 * Generates a procedural environment map from a gradient sphere with studio-style
 * lighting bands and sets it as the scene environment. This gives PBR materials
 * something to reflect, making roughness/metalness values visually meaningful.
 *
 * Renders nothing — returns null.
 */
export default function ProceduralEnvMap({ mood, size = 128 }: ProceduralEnvMapProps) {
  const { gl, scene } = useThree();
  const prevTextureRef = useRef<ReturnType<PMREMGenerator["fromScene"]> | null>(null);

  useEffect(() => {
    const gradient = ENV_GRADIENTS[mood] ?? ENV_GRADIENTS.warm;
    const skyColor = new Color(gradient.sky);
    const groundColor = new Color(gradient.ground);
    const horizonColor = new Color(gradient.horizon);
    const keySpotColor = new Color(gradient.keySpot);

    // Build a small scene with a gradient sphere
    const envScene = new ThreeScene();
    const geo = new SphereGeometry(1, 48, 24);

    // Apply vertical gradient via vertex colors with horizon band and key-light spot
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const tempColor = new Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const t = y * 0.5 + 0.5; // map [-1,1] → [0,1]

      // Base gradient: ground → horizon → sky with a sharper horizon band
      if (t < 0.4) {
        // Below horizon — ground color
        tempColor.copy(groundColor).lerp(horizonColor, t / 0.4);
      } else if (t < 0.55) {
        // Horizon band — brighter, creates a visible reflection line
        const horizonT = (t - 0.4) / 0.15;
        const brightened = horizonColor.clone().lerp(keySpotColor, 0.3);
        tempColor.copy(horizonColor).lerp(brightened, Math.sin(horizonT * Math.PI));
      } else {
        // Above horizon — sky
        tempColor.copy(horizonColor).lerp(skyColor, (t - 0.55) / 0.45);
      }

      // Key-light spot — bright area in upper-right quadrant for directional reflections
      const spotAngle = Math.atan2(z, x);
      const spotElevation = Math.asin(y);
      const targetAngle = Math.PI * 0.25; // 45° azimuth
      const targetElev = Math.PI * 0.3;   // ~55° elevation
      const angleDist = Math.abs(spotAngle - targetAngle);
      const elevDist = Math.abs(spotElevation - targetElev);
      const spotDist = Math.sqrt(angleDist * angleDist + elevDist * elevDist);
      if (spotDist < 0.6) {
        const spotStrength = 1 - spotDist / 0.6;
        tempColor.lerp(keySpotColor, spotStrength * 0.35);
      }

      colors[i * 3] = tempColor.r;
      colors[i * 3 + 1] = tempColor.g;
      colors[i * 3 + 2] = tempColor.b;
    }

    geo.setAttribute("color", new Float32BufferAttribute(colors, 3));
    const mat = new MeshBasicMaterial({ vertexColors: true, side: BackSide });
    const sphere = new Mesh(geo, mat);
    sphere.scale.setScalar(100);
    envScene.add(sphere);

    // Generate prefiltered env map
    const pmrem = new PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();
    const envTexture = pmrem.fromScene(envScene, 0, 0.1, 1000);

    // Dispose previous texture before setting new one
    if (prevTextureRef.current) {
      prevTextureRef.current.texture.dispose();
    }
    prevTextureRef.current = envTexture;

    // Set as scene environment (all PBR materials pick this up automatically)
    scene.environment = envTexture.texture;

    // Cleanup temp objects
    geo.dispose();
    mat.dispose();
    pmrem.dispose();

    return () => {
      if (prevTextureRef.current) {
        scene.environment = null;
        prevTextureRef.current.texture.dispose();
        prevTextureRef.current = null;
      }
    };
  }, [gl, scene, mood, size]);

  return null;
}
