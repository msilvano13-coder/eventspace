import * as THREE from "three";

// ── Procedural floor textures (full PBR: albedo + normal + roughness) ──

export interface FloorTextureSet {
  albedo: THREE.CanvasTexture;
  normal: THREE.CanvasTexture;
  roughness: THREE.CanvasTexture;
}

/** Seeded pseudo-random for deterministic texture generation */
function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; };
}

// ── Helper: draw a quadratic bezier curve on a context ──
function drawBezier(
  ctx: CanvasRenderingContext2D,
  x0: number, y0: number,
  cx: number, cy: number,
  x1: number, y1: number,
) {
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.quadraticCurveTo(cx, cy, x1, y1);
  ctx.stroke();
}

// ── Helper: simple 2D noise (value noise via seeded random) ──
function makeNoise2D(rand: () => number, gridSize: number, size: number) {
  // Build a small grid of random values, then bilinearly interpolate
  const cols = Math.ceil(size / gridSize) + 2;
  const rows = cols;
  const grid: number[] = [];
  for (let i = 0; i < cols * rows; i++) grid.push(rand());

  return (x: number, y: number): number => {
    const gx = x / gridSize;
    const gy = y / gridSize;
    const ix = Math.floor(gx) % cols;
    const iy = Math.floor(gy) % rows;
    const fx = gx - Math.floor(gx);
    const fy = gy - Math.floor(gy);
    const ix1 = (ix + 1) % cols;
    const iy1 = (iy + 1) % rows;
    const a = grid[iy * cols + ix];
    const b = grid[iy * cols + ix1];
    const c = grid[iy1 * cols + ix];
    const d = grid[iy1 * cols + ix1];
    const top = a + (b - a) * fx;
    const bot = c + (d - c) * fx;
    return top + (bot - top) * fy;
  };
}

function generateFloorTextures(type: string, size: number): FloorTextureSet {
  // Albedo map
  const albedoCanvas = document.createElement("canvas");
  albedoCanvas.width = size;
  albedoCanvas.height = size;
  const albedoCtx = albedoCanvas.getContext("2d")!;

  // Normal map
  const normalCanvas = document.createElement("canvas");
  normalCanvas.width = size;
  normalCanvas.height = size;
  const normalCtx = normalCanvas.getContext("2d")!;
  normalCtx.fillStyle = "rgb(128, 128, 255)";
  normalCtx.fillRect(0, 0, size, size);

  // Roughness map (white = rough, black = smooth)
  const roughCanvas = document.createElement("canvas");
  roughCanvas.width = size;
  roughCanvas.height = size;
  const roughCtx = roughCanvas.getContext("2d")!;

  const rand = seededRandom(42);

  if (type === "hardwood") {
    generateHardwood(albedoCtx, normalCtx, roughCtx, size, rand);
  } else if (type === "marble") {
    generateMarble(albedoCtx, normalCtx, roughCtx, size, rand);
  } else if (type === "concrete") {
    generateConcrete(albedoCtx, normalCtx, roughCtx, size, rand);
  } else if (type === "tile") {
    generateTile(albedoCtx, normalCtx, roughCtx, size, rand);
  } else {
    // carpet (default)
    generateCarpet(albedoCtx, normalCtx, roughCtx, size, rand);
  }

  const makeTexture = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 4);
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  };

  return {
    albedo: makeTexture(albedoCanvas),
    normal: makeTexture(normalCanvas),
    roughness: makeTexture(roughCanvas),
  };
}

// ════════════════════════════════════════════════════════════════
// HARDWOOD
// ════════════════════════════════════════════════════════════════

function generateHardwood(
  albedoCtx: CanvasRenderingContext2D,
  normalCtx: CanvasRenderingContext2D,
  roughCtx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) {
  const plankW = size / 5;
  const plankH = size / 3;

  // Base roughness
  roughCtx.fillStyle = "rgb(140, 140, 140)";
  roughCtx.fillRect(0, 0, size, size);

  // 10 plank color variants for richer variation
  const baseColors = [
    "#b8956a", "#a8895e", "#c4a070", "#b09060", "#c0985c",
    "#a88050", "#c9a878", "#9e7848", "#d1b080", "#b48858",
  ];

  // Draw planks with stagger pattern (straight layout)
  for (let col = 0; col < 6; col++) {
    for (let row = 0; row < 4; row++) {
      const stagger = (row % 2) * plankW * 0.5;
      const px = col * plankW + stagger - plankW; // offset to fill edges
      const py = row * plankH;

      if (px + plankW < 0 || px > size) continue;

      const plankColor = baseColors[Math.floor(rand() * baseColors.length)];

      // Fill plank base color
      albedoCtx.fillStyle = plankColor;
      albedoCtx.fillRect(px, py, plankW - 1, plankH - 1);

      // Per-plank slight tint shift
      const tintR = Math.floor((rand() - 0.5) * 15);
      const tintG = Math.floor((rand() - 0.5) * 10);
      albedoCtx.fillStyle = `rgba(${128 + tintR}, ${100 + tintG}, 60, 0.08)`;
      albedoCtx.fillRect(px, py, plankW - 1, plankH - 1);

      // Wood grain: curved lines following plank direction
      albedoCtx.save();
      albedoCtx.beginPath();
      albedoCtx.rect(px, py, plankW - 1, plankH - 1);
      albedoCtx.clip();

      const grainPhase = rand() * Math.PI * 2;
      const grainFreq = 0.02 + rand() * 0.03;
      const grainAmp = 1.0 + rand() * 2.0;

      for (let gy = 0; gy < plankH; gy += 2.5) {
        const grainAlpha = 0.04 + rand() * 0.07;
        albedoCtx.strokeStyle = `rgba(50, 30, 15, ${grainAlpha})`;
        albedoCtx.lineWidth = 0.8 + rand() * 0.6;
        albedoCtx.beginPath();
        albedoCtx.moveTo(px + 1, py + gy);
        for (let gx = 0; gx < plankW; gx += 4) {
          const yOff = Math.sin(gx * grainFreq + grainPhase + gy * 0.008) * grainAmp;
          albedoCtx.lineTo(px + gx, py + gy + yOff);
        }
        albedoCtx.stroke();
      }

      // Knots: occasional small dark ovals (1-2 per plank, ~30% chance)
      if (rand() < 0.3) {
        const knotCount = rand() < 0.5 ? 1 : 2;
        for (let k = 0; k < knotCount; k++) {
          const kx = px + plankW * 0.15 + rand() * plankW * 0.7;
          const ky = py + plankH * 0.15 + rand() * plankH * 0.7;
          const kw = 2 + rand() * 3;
          const kh = 1.5 + rand() * 2;
          // Knot center
          albedoCtx.fillStyle = `rgba(60, 35, 15, ${0.3 + rand() * 0.25})`;
          albedoCtx.beginPath();
          albedoCtx.ellipse(kx, ky, kw, kh, rand() * Math.PI, 0, Math.PI * 2);
          albedoCtx.fill();
          // Knot ring
          albedoCtx.strokeStyle = `rgba(80, 50, 25, ${0.15 + rand() * 0.1})`;
          albedoCtx.lineWidth = 0.5;
          albedoCtx.beginPath();
          albedoCtx.ellipse(kx, ky, kw + 1.5, kh + 1, rand() * Math.PI, 0, Math.PI * 2);
          albedoCtx.stroke();
        }
      }

      albedoCtx.restore();

      // Per-plank roughness variation
      const roughVal = 125 + Math.floor(rand() * 45);
      roughCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
      roughCtx.fillRect(px, py, plankW - 1, plankH - 1);
    }
  }

  // Wear patterns in roughness: center area is smoother (high-traffic)
  const wearGrad = roughCtx.createRadialGradient(
    size * 0.5, size * 0.5, 0,
    size * 0.5, size * 0.5, size * 0.55,
  );
  wearGrad.addColorStop(0, "rgba(0, 0, 0, 0.12)"); // smoother center
  wearGrad.addColorStop(0.6, "rgba(0, 0, 0, 0.05)");
  wearGrad.addColorStop(1, "rgba(0, 0, 0, 0)");
  roughCtx.fillStyle = wearGrad;
  roughCtx.fillRect(0, 0, size, size);

  // Plank seams in normal map (sharper recessed lines)
  normalCtx.strokeStyle = "rgb(108, 128, 255)";
  normalCtx.lineWidth = 2.5;
  for (let col = -1; col < 6; col++) {
    const x = col * plankW;
    normalCtx.beginPath();
    normalCtx.moveTo(x, 0);
    normalCtx.lineTo(x, size);
    normalCtx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const stagger = (row % 2) * plankW * 0.5;
    normalCtx.beginPath();
    normalCtx.moveTo(stagger - plankW, row * plankH);
    normalCtx.lineTo(stagger + size + plankW, row * plankH);
    normalCtx.stroke();
  }

  // Seams rougher in roughness map
  roughCtx.strokeStyle = "rgb(210, 210, 210)";
  roughCtx.lineWidth = 2;
  for (let col = -1; col < 6; col++) {
    roughCtx.beginPath();
    roughCtx.moveTo(col * plankW, 0);
    roughCtx.lineTo(col * plankW, size);
    roughCtx.stroke();
  }

  // Albedo seam darkening
  albedoCtx.strokeStyle = "rgba(30, 20, 10, 0.2)";
  albedoCtx.lineWidth = 1;
  for (let col = -1; col < 6; col++) {
    albedoCtx.beginPath();
    albedoCtx.moveTo(col * plankW, 0);
    albedoCtx.lineTo(col * plankW, size);
    albedoCtx.stroke();
  }
  for (let row = 0; row < 4; row++) {
    const stagger = (row % 2) * plankW * 0.5;
    albedoCtx.beginPath();
    albedoCtx.moveTo(stagger - plankW, row * plankH);
    albedoCtx.lineTo(stagger + size + plankW, row * plankH);
    albedoCtx.stroke();
  }

  // Wood grain normal detail (curved sinusoidal lines)
  normalCtx.strokeStyle = "rgb(133, 128, 255)";
  normalCtx.lineWidth = 0.7;
  for (let y = 0; y < size; y += 3) {
    normalCtx.beginPath();
    normalCtx.moveTo(0, y);
    for (let x = 0; x < size; x += 6) {
      normalCtx.lineTo(x, y + Math.sin(x * 0.035 + y * 0.012) * 1.5 + Math.sin(x * 0.08) * 0.4);
    }
    normalCtx.stroke();
  }
}

// ════════════════════════════════════════════════════════════════
// MARBLE
// ════════════════════════════════════════════════════════════════

function generateMarble(
  albedoCtx: CanvasRenderingContext2D,
  normalCtx: CanvasRenderingContext2D,
  roughCtx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) {
  // Base: warm white
  albedoCtx.fillStyle = "#e8e0d0";
  albedoCtx.fillRect(0, 0, size, size);

  // Deeper cloudy base variation with more depth
  const noise = makeNoise2D(rand, 30, size);
  for (let i = 0; i < 90; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 15 + rand() * 70;
    const grad = albedoCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    const noiseVal = noise(cx, cy);
    const depth = noiseVal * 0.2;
    const toneR = Math.floor(215 + rand() * 30 - depth * 40);
    const toneG = Math.floor(210 + rand() * 25 - depth * 35);
    const toneB = Math.floor(195 + rand() * 30 - depth * 30);
    grad.addColorStop(0, `rgba(${toneR}, ${toneG}, ${toneB}, ${0.08 + rand() * 0.14})`);
    grad.addColorStop(1, `rgba(${toneR}, ${toneG}, ${toneB}, 0)`);
    albedoCtx.fillStyle = grad;
    albedoCtx.fillRect(0, 0, size, size);
  }

  // Base roughness: very smooth (polished marble)
  roughCtx.fillStyle = "rgb(35, 35, 35)";
  roughCtx.fillRect(0, 0, size, size);

  // Polish variation: smoother center, slightly rougher at edges and near vein regions
  const polishGrad = roughCtx.createRadialGradient(
    size * 0.5, size * 0.5, 0,
    size * 0.5, size * 0.5, size * 0.6,
  );
  polishGrad.addColorStop(0, "rgba(0, 0, 0, 0.06)"); // center more polished
  polishGrad.addColorStop(1, "rgba(128, 128, 128, 0.04)"); // edges slightly rougher
  roughCtx.fillStyle = polishGrad;
  roughCtx.fillRect(0, 0, size, size);

  // Primary veins -- smooth bezier curves instead of random walk
  for (let i = 0; i < 5; i++) {
    const x0 = rand() * size * 0.3;
    const y0 = rand() * size;
    const x1 = size * 0.7 + rand() * size * 0.3;
    const y1 = rand() * size;
    const cpx = size * 0.3 + rand() * size * 0.4;
    const cpy = (y0 + y1) * 0.5 + (rand() - 0.5) * size * 0.5;

    const lineW = 1.2 + rand() * 2.5;
    const alpha = 0.2 + rand() * 0.22;
    const r = 130 + Math.floor(rand() * 35);
    const g = 120 + Math.floor(rand() * 25);
    const b = 105 + Math.floor(rand() * 25);

    // Albedo vein
    albedoCtx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    albedoCtx.lineWidth = lineW;
    drawBezier(albedoCtx, x0, y0, cpx, cpy, x1, y1);

    // Normal vein (slight indent)
    normalCtx.strokeStyle = "rgb(118, 128, 255)";
    normalCtx.lineWidth = lineW * 0.8;
    drawBezier(normalCtx, x0, y0, cpx, cpy, x1, y1);

    // Roughness: veins are slightly rougher
    roughCtx.strokeStyle = "rgb(65, 65, 65)";
    roughCtx.lineWidth = lineW * 1.2;
    drawBezier(roughCtx, x0, y0, cpx, cpy, x1, y1);

    // Branch veins off the main vein
    const branchCount = 2 + Math.floor(rand() * 3);
    for (let b2 = 0; b2 < branchCount; b2++) {
      const t = 0.2 + rand() * 0.6;
      // point on curve at parameter t (approx)
      const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cpx + t * t * x1;
      const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cpy + t * t * y1;
      const bex = bx + (rand() - 0.5) * size * 0.35;
      const bey = by + (rand() - 0.3) * size * 0.25;
      const bcpx = (bx + bex) * 0.5 + (rand() - 0.5) * size * 0.15;
      const bcpy = (by + bey) * 0.5 + (rand() - 0.5) * size * 0.15;

      const bAlpha = 0.08 + rand() * 0.1;
      const bw = 0.4 + rand() * 1.0;

      albedoCtx.strokeStyle = `rgba(155, 145, 130, ${bAlpha})`;
      albedoCtx.lineWidth = bw;
      drawBezier(albedoCtx, bx, by, bcpx, bcpy, bex, bey);

      normalCtx.strokeStyle = "rgb(123, 128, 255)";
      normalCtx.lineWidth = bw * 0.6;
      drawBezier(normalCtx, bx, by, bcpx, bcpy, bex, bey);
    }
  }

  // Secondary fine veins (also bezier)
  for (let i = 0; i < 10; i++) {
    const x0 = rand() * size;
    const y0 = rand() * size;
    const x1 = x0 + (rand() - 0.5) * size * 0.6;
    const y1 = y0 + (rand() - 0.3) * size * 0.4;
    const cpx = (x0 + x1) * 0.5 + (rand() - 0.5) * size * 0.2;
    const cpy = (y0 + y1) * 0.5 + (rand() - 0.5) * size * 0.2;

    albedoCtx.strokeStyle = `rgba(160, 150, 135, ${0.06 + rand() * 0.1})`;
    albedoCtx.lineWidth = 0.3 + rand() * 0.7;
    drawBezier(albedoCtx, x0, y0, cpx, cpy, x1, y1);

    normalCtx.strokeStyle = "rgb(125, 128, 255)";
    normalCtx.lineWidth = 0.4;
    drawBezier(normalCtx, x0, y0, cpx, cpy, x1, y1);
  }

  // Gold/warm flecks scattered across surface
  for (let i = 0; i < 40; i++) {
    const fx = rand() * size;
    const fy = rand() * size;
    const fs = 0.5 + rand() * 1.5;
    const goldR = 200 + Math.floor(rand() * 40);
    const goldG = 175 + Math.floor(rand() * 40);
    const goldB = 100 + Math.floor(rand() * 50);
    albedoCtx.fillStyle = `rgba(${goldR}, ${goldG}, ${goldB}, ${0.1 + rand() * 0.15})`;
    albedoCtx.beginPath();
    albedoCtx.arc(fx, fy, fs, 0, Math.PI * 2);
    albedoCtx.fill();
  }
}

// ════════════════════════════════════════════════════════════════
// CONCRETE
// ════════════════════════════════════════════════════════════════

function generateConcrete(
  albedoCtx: CanvasRenderingContext2D,
  normalCtx: CanvasRenderingContext2D,
  roughCtx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) {
  // Gray base
  albedoCtx.fillStyle = "#a0a0a0";
  albedoCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = "rgb(190, 190, 190)";
  roughCtx.fillRect(0, 0, size, size);

  // Pixel-level noise for all three maps
  const albedoData = albedoCtx.getImageData(0, 0, size, size);
  const normalData = normalCtx.getImageData(0, 0, size, size);
  const roughData = roughCtx.getImageData(0, 0, size, size);
  for (let i = 0; i < albedoData.data.length; i += 4) {
    const noise = (rand() - 0.5) * 30;
    const base = 150 + noise;
    albedoData.data[i] = base;
    albedoData.data[i + 1] = base;
    albedoData.data[i + 2] = base + 5;
    albedoData.data[i + 3] = 255;
    normalData.data[i] = 128 + (rand() - 0.5) * 12;
    normalData.data[i + 1] = 128 + (rand() - 0.5) * 12;
    roughData.data[i] = 180 + (rand() - 0.5) * 30;
    roughData.data[i + 1] = roughData.data[i];
    roughData.data[i + 2] = roughData.data[i];
  }
  albedoCtx.putImageData(albedoData, 0, 0);
  normalCtx.putImageData(normalData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);

  // Aggregate particles: tiny light and dark speckles
  for (let i = 0; i < 120; i++) {
    const ax = rand() * size;
    const ay = rand() * size;
    const ar = 0.5 + rand() * 1.5;
    const isLight = rand() > 0.5;
    if (isLight) {
      albedoCtx.fillStyle = `rgba(200, 195, 190, ${0.3 + rand() * 0.3})`;
    } else {
      albedoCtx.fillStyle = `rgba(90, 85, 80, ${0.2 + rand() * 0.25})`;
    }
    albedoCtx.beginPath();
    albedoCtx.arc(ax, ay, ar, 0, Math.PI * 2);
    albedoCtx.fill();
    // Aggregate bump in normal map
    normalCtx.fillStyle = isLight ? "rgb(135, 135, 255)" : "rgb(122, 122, 255)";
    normalCtx.beginPath();
    normalCtx.arc(ax, ay, ar * 0.8, 0, Math.PI * 2);
    normalCtx.fill();
  }

  // Surface staining: slightly darker amorphous patches
  for (let i = 0; i < 5; i++) {
    const sx = rand() * size;
    const sy = rand() * size;
    const sr = 15 + rand() * 35;
    const grad = albedoCtx.createRadialGradient(sx, sy, 0, sx, sy, sr);
    grad.addColorStop(0, `rgba(80, 78, 75, ${0.06 + rand() * 0.08})`);
    grad.addColorStop(0.6, `rgba(90, 88, 85, ${0.03 + rand() * 0.04})`);
    grad.addColorStop(1, "rgba(100, 100, 100, 0)");
    albedoCtx.fillStyle = grad;
    albedoCtx.fillRect(0, 0, size, size);
  }

  // Hairline cracks: 1-2 subtle random cracks
  const crackCount = 1 + (rand() > 0.5 ? 1 : 0);
  for (let c = 0; c < crackCount; c++) {
    let cx = rand() * size;
    let cy = rand() * size;
    const angle = rand() * Math.PI;
    const crackLen = size * 0.2 + rand() * size * 0.3;
    const steps = Math.floor(crackLen / 3);

    albedoCtx.strokeStyle = `rgba(70, 68, 65, ${0.15 + rand() * 0.1})`;
    albedoCtx.lineWidth = 0.5;
    normalCtx.strokeStyle = "rgb(115, 120, 255)";
    normalCtx.lineWidth = 0.8;
    roughCtx.strokeStyle = "rgb(210, 210, 210)";
    roughCtx.lineWidth = 0.5;

    albedoCtx.beginPath();
    normalCtx.beginPath();
    roughCtx.beginPath();
    albedoCtx.moveTo(cx, cy);
    normalCtx.moveTo(cx, cy);
    roughCtx.moveTo(cx, cy);

    for (let s = 0; s < steps; s++) {
      cx += Math.cos(angle + (rand() - 0.5) * 0.5) * 3;
      cy += Math.sin(angle + (rand() - 0.5) * 0.5) * 3;
      albedoCtx.lineTo(cx, cy);
      normalCtx.lineTo(cx, cy);
      roughCtx.lineTo(cx, cy);
    }
    albedoCtx.stroke();
    normalCtx.stroke();
    roughCtx.stroke();
  }

  // Control joints (expansion joints -- sharper in normal map)
  const jointSpacing = size / 3;
  albedoCtx.strokeStyle = "rgba(75, 75, 75, 0.45)";
  albedoCtx.lineWidth = 1.5;
  normalCtx.strokeStyle = "rgb(108, 128, 255)";
  normalCtx.lineWidth = 3;
  roughCtx.strokeStyle = "rgb(215, 215, 215)";
  roughCtx.lineWidth = 2;
  for (let x = jointSpacing; x < size; x += jointSpacing) {
    albedoCtx.beginPath(); albedoCtx.moveTo(x, 0); albedoCtx.lineTo(x, size); albedoCtx.stroke();
    normalCtx.beginPath(); normalCtx.moveTo(x, 0); normalCtx.lineTo(x, size); normalCtx.stroke();
    roughCtx.beginPath(); roughCtx.moveTo(x, 0); roughCtx.lineTo(x, size); roughCtx.stroke();
  }
  for (let y = jointSpacing; y < size; y += jointSpacing) {
    albedoCtx.beginPath(); albedoCtx.moveTo(0, y); albedoCtx.lineTo(size, y); albedoCtx.stroke();
    normalCtx.beginPath(); normalCtx.moveTo(0, y); normalCtx.lineTo(size, y); normalCtx.stroke();
    roughCtx.beginPath(); roughCtx.moveTo(0, y); roughCtx.lineTo(size, y); roughCtx.stroke();
  }
}

// ════════════════════════════════════════════════════════════════
// CARPET
// ════════════════════════════════════════════════════════════════

function generateCarpet(
  albedoCtx: CanvasRenderingContext2D,
  normalCtx: CanvasRenderingContext2D,
  roughCtx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) {
  // Base carpet color
  albedoCtx.fillStyle = "#8a7b6b";
  albedoCtx.fillRect(0, 0, size, size);
  roughCtx.fillStyle = "rgb(240, 240, 240)";
  roughCtx.fillRect(0, 0, size, size);

  // Color variation: lighter and darker patches (soft blobs)
  const patchNoise = makeNoise2D(rand, 40, size);
  for (let i = 0; i < 20; i++) {
    const cx = rand() * size;
    const cy = rand() * size;
    const r = 20 + rand() * 50;
    const nVal = patchNoise(cx, cy);
    const grad = albedoCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
    if (nVal > 0.5) {
      // lighter patch
      grad.addColorStop(0, `rgba(160, 148, 132, ${0.06 + rand() * 0.08})`);
    } else {
      // darker patch
      grad.addColorStop(0, `rgba(100, 88, 72, ${0.06 + rand() * 0.08})`);
    }
    grad.addColorStop(1, "rgba(138, 123, 107, 0)");
    albedoCtx.fillStyle = grad;
    albedoCtx.fillRect(0, 0, size, size);
  }

  // Pile height variation: soft pattern via noise
  const pileNoise = makeNoise2D(rand, 25, size);

  // Fiber direction: slight diagonal bias in normal map
  // We use pixel-level manipulation for fibers
  const normalData = normalCtx.getImageData(0, 0, size, size);
  const roughData = roughCtx.getImageData(0, 0, size, size);
  const albedoData = albedoCtx.getImageData(0, 0, size, size);

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = (py * size + px) * 4;

      // Fiber noise with diagonal bias (45-degree lean)
      const fiberRand = rand();
      const diagonalBias = 0.15; // lean direction
      const nr = 128 + (fiberRand - 0.5) * 8 + diagonalBias * 6;
      const ng = 128 + (fiberRand - 0.5) * 8 + diagonalBias * 6;

      // Pile height variation modulates normal strength
      const pileVal = pileNoise(px, py);
      const pileStr = 0.7 + pileVal * 0.6;

      normalData.data[idx] = Math.min(255, Math.max(0, nr * pileStr + 128 * (1 - pileStr)));
      normalData.data[idx + 1] = Math.min(255, Math.max(0, ng * pileStr + 128 * (1 - pileStr)));
      // B channel stays ~255
      normalData.data[idx + 2] = 255;
      normalData.data[idx + 3] = 255;

      // Slight roughness variation from pile height
      const baseRough = roughData.data[idx];
      roughData.data[idx] = Math.min(255, baseRough - Math.floor(pileVal * 15));
      roughData.data[idx + 1] = roughData.data[idx];
      roughData.data[idx + 2] = roughData.data[idx];

      // Very subtle albedo lightening from pile height (raised fibers catch more light)
      const liftBrightness = pileVal * 8;
      albedoData.data[idx] = Math.min(255, albedoData.data[idx] + liftBrightness);
      albedoData.data[idx + 1] = Math.min(255, albedoData.data[idx + 1] + liftBrightness);
      albedoData.data[idx + 2] = Math.min(255, albedoData.data[idx + 2] + liftBrightness);
    }
  }

  normalCtx.putImageData(normalData, 0, 0);
  roughCtx.putImageData(roughData, 0, 0);
  albedoCtx.putImageData(albedoData, 0, 0);
}

// ════════════════════════════════════════════════════════════════
// TILE (new floor type)
// ════════════════════════════════════════════════════════════════

function generateTile(
  albedoCtx: CanvasRenderingContext2D,
  normalCtx: CanvasRenderingContext2D,
  roughCtx: CanvasRenderingContext2D,
  size: number,
  rand: () => number,
) {
  const tileCount = 4; // 4x4 tile grid
  const tileSize = size / tileCount;
  const groutWidth = Math.max(1.5, size * 0.012);

  // Base: cream/white
  albedoCtx.fillStyle = "#f0ece4";
  albedoCtx.fillRect(0, 0, size, size);

  // Base roughness: medium (between marble and concrete)
  roughCtx.fillStyle = "rgb(90, 90, 90)";
  roughCtx.fillRect(0, 0, size, size);

  // Draw individual tiles with glaze variation
  for (let row = 0; row < tileCount; row++) {
    for (let col = 0; col < tileCount; col++) {
      const tx = col * tileSize + groutWidth * 0.5;
      const ty = row * tileSize + groutWidth * 0.5;
      const tw = tileSize - groutWidth;
      const th = tileSize - groutWidth;

      // Per-tile glaze color variation
      const tintShift = (rand() - 0.5) * 12;
      const r = Math.floor(240 + tintShift);
      const g = Math.floor(236 + tintShift - rand() * 4);
      const b = Math.floor(228 + tintShift - rand() * 6);
      albedoCtx.fillStyle = `rgb(${r}, ${g}, ${b})`;
      albedoCtx.fillRect(tx, ty, tw, th);

      // Subtle glaze sheen variation per tile (lighter center)
      const glazeGrad = albedoCtx.createRadialGradient(
        tx + tw * 0.5, ty + th * 0.5, 0,
        tx + tw * 0.5, ty + th * 0.5, tw * 0.5,
      );
      glazeGrad.addColorStop(0, `rgba(255, 252, 248, ${0.04 + rand() * 0.06})`);
      glazeGrad.addColorStop(1, "rgba(255, 252, 248, 0)");
      albedoCtx.fillStyle = glazeGrad;
      albedoCtx.fillRect(tx, ty, tw, th);

      // Per-tile roughness variation (some tiles slightly more matte)
      const tileRough = 80 + Math.floor(rand() * 30);
      roughCtx.fillStyle = `rgb(${tileRough}, ${tileRough}, ${tileRough})`;
      roughCtx.fillRect(tx, ty, tw, th);

      // Very subtle surface noise per tile
      for (let i = 0; i < 8; i++) {
        const nx = tx + rand() * tw;
        const ny = ty + rand() * th;
        const ns = 1 + rand() * 3;
        albedoCtx.fillStyle = `rgba(${220 + Math.floor(rand() * 20)}, ${216 + Math.floor(rand() * 20)}, ${210 + Math.floor(rand() * 15)}, ${0.03 + rand() * 0.04})`;
        albedoCtx.beginPath();
        albedoCtx.arc(nx, ny, ns, 0, Math.PI * 2);
        albedoCtx.fill();
      }
    }
  }

  // Grout lines in albedo (darker)
  albedoCtx.fillStyle = "rgba(160, 155, 145, 1)";
  for (let i = 0; i <= tileCount; i++) {
    // Vertical grout
    albedoCtx.fillRect(i * tileSize - groutWidth * 0.5, 0, groutWidth, size);
    // Horizontal grout
    albedoCtx.fillRect(0, i * tileSize - groutWidth * 0.5, size, groutWidth);
  }

  // Grout lines in normal map (recessed)
  normalCtx.fillStyle = "rgb(110, 128, 255)";
  for (let i = 0; i <= tileCount; i++) {
    normalCtx.fillRect(i * tileSize - groutWidth * 0.7, 0, groutWidth * 1.4, size);
    normalCtx.fillRect(0, i * tileSize - groutWidth * 0.7, size, groutWidth * 1.4);
  }

  // Grout in roughness (grout is rougher than tile)
  roughCtx.fillStyle = "rgb(180, 180, 180)";
  for (let i = 0; i <= tileCount; i++) {
    roughCtx.fillRect(i * tileSize - groutWidth * 0.5, 0, groutWidth, size);
    roughCtx.fillRect(0, i * tileSize - groutWidth * 0.5, size, groutWidth);
  }

  // Tile edge bevels in normal map (slight highlight on top/left, shadow on bottom/right)
  for (let row = 0; row < tileCount; row++) {
    for (let col = 0; col < tileCount; col++) {
      const tx = col * tileSize + groutWidth * 0.5;
      const ty = row * tileSize + groutWidth * 0.5;
      const tw = tileSize - groutWidth;
      const th = tileSize - groutWidth;
      const bevel = Math.max(1, groutWidth * 0.6);

      // Top edge highlight
      normalCtx.fillStyle = "rgb(128, 140, 255)";
      normalCtx.fillRect(tx, ty, tw, bevel);
      // Left edge highlight
      normalCtx.fillStyle = "rgb(140, 128, 255)";
      normalCtx.fillRect(tx, ty, bevel, th);
      // Bottom edge shadow
      normalCtx.fillStyle = "rgb(128, 116, 255)";
      normalCtx.fillRect(tx, ty + th - bevel, tw, bevel);
      // Right edge shadow
      normalCtx.fillStyle = "rgb(116, 128, 255)";
      normalCtx.fillRect(tx + tw - bevel, ty, bevel, th);
    }
  }
}

// ════════════════════════════════════════════════════════════════
// Cache + public API
// ════════════════════════════════════════════════════════════════

/** Cache of generated floor texture sets by type+size */
export const floorTextureCache = new Map<string, FloorTextureSet>();

export function getFloorTextures(type: string, size: number): FloorTextureSet {
  const key = `${type}-${size}`;
  let set = floorTextureCache.get(key);
  if (!set) {
    set = generateFloorTextures(type, size);
    floorTextureCache.set(key, set);
  }
  return set;
}
