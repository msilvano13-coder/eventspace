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
    const plankW = size / 5;
    const plankH = size / 3;
    // Base roughness
    roughCtx.fillStyle = "rgb(140, 140, 140)";
    roughCtx.fillRect(0, 0, size, size);

    // Draw individual planks with color variation
    const baseColors = ["#b8956a", "#a8895e", "#c4a070", "#b09060", "#c0985c", "#a88050"];
    for (let col = 0; col < 5; col++) {
      for (let row = 0; row < 4; row++) {
        const stagger = (row % 2) * plankW * 0.5;
        const px = col * plankW + stagger;
        const py = row * plankH;
        const plankColor = baseColors[Math.floor(rand() * baseColors.length)];
        // Slight hue/brightness shift per plank
        albedoCtx.fillStyle = plankColor;
        albedoCtx.fillRect(px, py, plankW - 1, plankH - 1);

        // Wood grain within plank — subtle horizontal lines
        for (let gy = 0; gy < plankH; gy += 3) {
          const grainAlpha = 0.03 + rand() * 0.06;
          albedoCtx.fillStyle = `rgba(60, 40, 20, ${grainAlpha})`;
          albedoCtx.fillRect(px + 2, py + gy, plankW - 4, 1.5);
        }

        // Per-plank roughness variation
        const roughVal = 130 + Math.floor(rand() * 40);
        roughCtx.fillStyle = `rgb(${roughVal}, ${roughVal}, ${roughVal})`;
        roughCtx.fillRect(px, py, plankW - 1, plankH - 1);
      }
    }

    // Plank seams in normal map (recessed)
    normalCtx.strokeStyle = "rgb(115, 128, 255)";
    normalCtx.lineWidth = 2;
    for (let col = 1; col < 5; col++) {
      normalCtx.beginPath();
      normalCtx.moveTo(col * plankW, 0);
      normalCtx.lineTo(col * plankW, size);
      normalCtx.stroke();
    }
    for (let row = 0; row < 4; row++) {
      const stagger = (row % 2) * plankW * 0.5;
      normalCtx.beginPath();
      normalCtx.moveTo(stagger, row * plankH);
      normalCtx.lineTo(stagger + size, row * plankH);
      normalCtx.stroke();
    }
    // Seams are rougher (gaps catch light)
    roughCtx.strokeStyle = "rgb(200, 200, 200)";
    roughCtx.lineWidth = 2;
    for (let col = 1; col < 5; col++) {
      roughCtx.beginPath(); roughCtx.moveTo(col * plankW, 0); roughCtx.lineTo(col * plankW, size); roughCtx.stroke();
    }
    // Wood grain normal detail
    normalCtx.strokeStyle = "rgb(132, 128, 255)";
    normalCtx.lineWidth = 0.8;
    for (let y = 0; y < size; y += 3.5) {
      normalCtx.beginPath();
      normalCtx.moveTo(0, y);
      for (let x = 0; x < size; x += 8) {
        normalCtx.lineTo(x, y + Math.sin(x * 0.04 + y * 0.015) * 1.2);
      }
      normalCtx.stroke();
    }

  } else if (type === "marble") {
    // Base: warm white with subtle cloudy variation
    albedoCtx.fillStyle = "#e8e0d0";
    albedoCtx.fillRect(0, 0, size, size);
    // Cloudy base variation
    for (let i = 0; i < 60; i++) {
      const cx = rand() * size, cy = rand() * size;
      const r = 20 + rand() * 60;
      const grad = albedoCtx.createRadialGradient(cx, cy, 0, cx, cy, r);
      const tone = rand() > 0.5 ? "rgba(220,215,200," : "rgba(240,235,225,";
      grad.addColorStop(0, tone + (0.1 + rand() * 0.15) + ")");
      grad.addColorStop(1, tone + "0)");
      albedoCtx.fillStyle = grad;
      albedoCtx.fillRect(0, 0, size, size);
    }
    // Base roughness: very smooth
    roughCtx.fillStyle = "rgb(40, 40, 40)";
    roughCtx.fillRect(0, 0, size, size);
    // Primary veins — darker gray with color
    for (let i = 0; i < 6; i++) {
      let cx = rand() * size, cy = rand() * size;
      albedoCtx.strokeStyle = `rgba(${140 + Math.floor(rand() * 30)}, ${130 + Math.floor(rand() * 20)}, ${115 + Math.floor(rand() * 20)}, ${0.25 + rand() * 0.2})`;
      albedoCtx.lineWidth = 1 + rand() * 2;
      normalCtx.strokeStyle = "rgb(120, 128, 255)";
      normalCtx.lineWidth = 1.5;
      roughCtx.strokeStyle = "rgb(70, 70, 70)";
      roughCtx.lineWidth = 1.5;
      albedoCtx.beginPath(); normalCtx.beginPath(); roughCtx.beginPath();
      albedoCtx.moveTo(cx, cy); normalCtx.moveTo(cx, cy); roughCtx.moveTo(cx, cy);
      for (let j = 0; j < 25; j++) {
        cx += (rand() - 0.5) * size * 0.14;
        cy += (rand() - 0.3) * size * 0.09;
        albedoCtx.lineTo(cx, cy); normalCtx.lineTo(cx, cy); roughCtx.lineTo(cx, cy);
      }
      albedoCtx.stroke(); normalCtx.stroke(); roughCtx.stroke();
    }
    // Secondary fine veins
    for (let i = 0; i < 12; i++) {
      let cx = rand() * size, cy = rand() * size;
      albedoCtx.strokeStyle = `rgba(160, 150, 135, ${0.1 + rand() * 0.12})`;
      albedoCtx.lineWidth = 0.5 + rand();
      normalCtx.strokeStyle = "rgb(124, 128, 255)";
      normalCtx.lineWidth = 0.5;
      albedoCtx.beginPath(); normalCtx.beginPath();
      albedoCtx.moveTo(cx, cy); normalCtx.moveTo(cx, cy);
      for (let j = 0; j < 15; j++) {
        cx += (rand() - 0.5) * size * 0.1;
        cy += (rand() - 0.4) * size * 0.07;
        albedoCtx.lineTo(cx, cy); normalCtx.lineTo(cx, cy);
      }
      albedoCtx.stroke(); normalCtx.stroke();
    }

  } else if (type === "concrete") {
    // Concrete: gray base with aggregate speckle
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
      // Albedo: gray speckle
      const base = 150 + noise;
      albedoData.data[i] = base; albedoData.data[i + 1] = base; albedoData.data[i + 2] = base + 5; albedoData.data[i + 3] = 255;
      // Normal: subtle surface noise
      normalData.data[i] = 128 + (rand() - 0.5) * 10;
      normalData.data[i + 1] = 128 + (rand() - 0.5) * 10;
      // Roughness: mostly rough with some smooth spots
      roughData.data[i] = 180 + (rand() - 0.5) * 30;
      roughData.data[i + 1] = roughData.data[i]; roughData.data[i + 2] = roughData.data[i];
    }
    albedoCtx.putImageData(albedoData, 0, 0);
    normalCtx.putImageData(normalData, 0, 0);
    roughCtx.putImageData(roughData, 0, 0);
    // Control joints (saw cuts)
    const jointSpacing = size / 3;
    albedoCtx.strokeStyle = "rgba(80, 80, 80, 0.4)"; albedoCtx.lineWidth = 1.5;
    normalCtx.strokeStyle = "rgb(115, 128, 255)"; normalCtx.lineWidth = 2;
    for (let x = jointSpacing; x < size; x += jointSpacing) {
      albedoCtx.beginPath(); albedoCtx.moveTo(x, 0); albedoCtx.lineTo(x, size); albedoCtx.stroke();
      normalCtx.beginPath(); normalCtx.moveTo(x, 0); normalCtx.lineTo(x, size); normalCtx.stroke();
    }
    for (let y = jointSpacing; y < size; y += jointSpacing) {
      albedoCtx.beginPath(); albedoCtx.moveTo(0, y); albedoCtx.lineTo(size, y); albedoCtx.stroke();
      normalCtx.beginPath(); normalCtx.moveTo(0, y); normalCtx.lineTo(size, y); normalCtx.stroke();
    }

  } else {
    // Carpet: solid color, high roughness, no detail
    albedoCtx.fillStyle = "#8a7b6b";
    albedoCtx.fillRect(0, 0, size, size);
    roughCtx.fillStyle = "rgb(240, 240, 240)";
    roughCtx.fillRect(0, 0, size, size);
    // Subtle fiber texture in normal map
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x += 2) {
        const nr = 128 + (rand() - 0.5) * 6;
        const ng = 128 + (rand() - 0.5) * 6;
        normalCtx.fillStyle = `rgb(${nr}, ${ng}, 255)`;
        normalCtx.fillRect(x, y, 2, 1);
      }
    }
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
