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
const ENV_GRADIENTS: Record<string, { sky: string; ground: string }> = {
  warm: { sky: "#fdf8f0", ground: "#d4c8b8" },
  cool: { sky: "#e8f0ff", ground: "#d0d4e0" },
  dramatic: { sky: "#ffe0b0", ground: "#2a2530" },
  neutral: { sky: "#f5f5f5", ground: "#e0e0e0" },
};

interface ProceduralEnvMapProps {
  mood: string;
  /** Size of the cubemap face in pixels. Quality tier controls this. */
  size?: number;
}

/**
 * Generates a procedural environment map from a gradient sphere and sets it
 * as the scene environment. This gives PBR materials something to reflect,
 * making roughness/metalness values visually meaningful.
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

    // Build a small scene with a gradient sphere
    const envScene = new ThreeScene();
    const geo = new SphereGeometry(1, 32, 16);

    // Apply vertical gradient via vertex colors
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const tempColor = new Color();

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = y * 0.5 + 0.5; // map [-1,1] → [0,1]
      tempColor.copy(groundColor).lerp(skyColor, t);
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
