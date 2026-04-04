"use client";

import * as THREE from "three";

export const GOBO_PATTERNS = [
  { id: "leaves", label: "Leaves" },
  { id: "stars", label: "Stars" },
  { id: "damask", label: "Damask" },
  { id: "geometric", label: "Geometric" },
  { id: "branches", label: "Branches" },
  { id: "dots", label: "Dots" },
] as const;

export type GoboPatternId = (typeof GOBO_PATTERNS)[number]["id"];

const textureCache = new Map<string, THREE.Texture>();

/** Generate a gobo pattern texture procedurally via canvas */
export function getGoboTexture(pattern: string): THREE.Texture {
  if (textureCache.has(pattern)) return textureCache.get(pattern)!;

  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Black background (blocked light)
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, size, size);

  // White areas = where light passes through
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";

  switch (pattern) {
    case "leaves": {
      // Leaf shapes scattered
      for (let i = 0; i < 12; i++) {
        const cx = Math.sin(i * 2.3 + 1) * 80 + size / 2;
        const cy = Math.cos(i * 1.7 + 2) * 80 + size / 2;
        const angle = (i * 137.5 * Math.PI) / 180;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.ellipse(0, 0, 15, 35, 0, 0, Math.PI * 2);
        ctx.fill();
        // Leaf vein
        ctx.strokeStyle = "#000";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -30);
        ctx.lineTo(0, 30);
        ctx.stroke();
        ctx.strokeStyle = "#fff";
        ctx.restore();
      }
      break;
    }
    case "stars": {
      for (let i = 0; i < 15; i++) {
        const cx = ((i * 73 + 31) % size);
        const cy = ((i * 97 + 47) % size);
        const r = 10 + (i % 3) * 8;
        drawStar(ctx, cx, cy, 5, r, r * 0.4);
      }
      break;
    }
    case "damask": {
      // Repeating ornamental pattern
      const cellSize = 64;
      for (let row = 0; row < size / cellSize; row++) {
        for (let col = 0; col < size / cellSize; col++) {
          const cx = col * cellSize + cellSize / 2;
          const cy = row * cellSize + cellSize / 2;
          ctx.save();
          ctx.translate(cx, cy);
          // Diamond shape with curves
          ctx.beginPath();
          ctx.moveTo(0, -25);
          ctx.quadraticCurveTo(20, -10, 0, 10);
          ctx.quadraticCurveTo(-20, -10, 0, -25);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(0, 25);
          ctx.quadraticCurveTo(20, 10, 0, -10);
          ctx.quadraticCurveTo(-20, 10, 0, 25);
          ctx.fill();
          ctx.restore();
        }
      }
      break;
    }
    case "geometric": {
      // Concentric circles and radial lines
      const center = size / 2;
      ctx.lineWidth = 3;
      for (let r = 20; r < size / 2; r += 30) {
        ctx.beginPath();
        ctx.arc(center, center, r, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (let a = 0; a < 12; a++) {
        const angle = (a * Math.PI) / 6;
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.lineTo(center + Math.cos(angle) * 120, center + Math.sin(angle) * 120);
        ctx.stroke();
      }
      break;
    }
    case "branches": {
      // Tree branch silhouettes
      ctx.lineWidth = 2;
      drawBranch(ctx, size / 2, size, -Math.PI / 2, 60, 6);
      break;
    }
    case "dots": {
      // Scattered bokeh-like dots
      for (let i = 0; i < 30; i++) {
        const cx = ((i * 83 + 17) % size);
        const cy = ((i * 61 + 43) % size);
        const r = 5 + (i % 4) * 5;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default: {
      // Fallback: simple circle cutout
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(pattern, texture);
  return texture;
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, points: number, outerR: number, innerR: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

function drawBranch(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, length: number, depth: number) {
  if (depth <= 0 || length < 4) return;
  const endX = x + Math.cos(angle) * length;
  const endY = y + Math.sin(angle) * length;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  // Branch left and right
  drawBranch(ctx, endX, endY, angle - 0.5, length * 0.7, depth - 1);
  drawBranch(ctx, endX, endY, angle + 0.4, length * 0.65, depth - 1);
}

/** Clean up all cached textures */
export function disposeGoboTextures() {
  textureCache.forEach((tex) => tex.dispose());
  textureCache.clear();
}
