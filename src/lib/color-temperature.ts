/**
 * Color Temperature — Kelvin to RGB conversion for lighting zones.
 *
 * Based on Tanner Helland's algorithm (approximation of CIE 1931 chromaticity).
 * Valid range: 1000K (candlelight) to 15000K (overcast sky).
 */

/** Convert color temperature in Kelvin to an RGB hex string */
export function kelvinToHex(kelvin: number): string {
  const [r, g, b] = kelvinToRGB(kelvin);
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

/** Convert color temperature in Kelvin to [R, G, B] (0–255 each) */
export function kelvinToRGB(kelvin: number): [number, number, number] {
  const temp = Math.max(1000, Math.min(15000, kelvin)) / 100;

  let r: number;
  let g: number;
  let b: number;

  // Red
  if (temp <= 66) {
    r = 255;
  } else {
    r = 329.698727446 * Math.pow(temp - 60, -0.1332047592);
  }

  // Green
  if (temp <= 66) {
    g = 99.4708025861 * Math.log(temp) - 161.1195681661;
  } else {
    g = 288.1221695283 * Math.pow(temp - 60, -0.0755148492);
  }

  // Blue
  if (temp >= 66) {
    b = 255;
  } else if (temp <= 19) {
    b = 0;
  } else {
    b = 138.5177312231 * Math.log(temp - 10) - 305.0447927307;
  }

  return [
    Math.max(0, Math.min(255, Math.round(r))),
    Math.max(0, Math.min(255, Math.round(g))),
    Math.max(0, Math.min(255, Math.round(b))),
  ];
}

/** Common lighting temperature presets */
export const TEMPERATURE_PRESETS = {
  candlelight: 1800,
  warmWhite: 2700,
  softWhite: 3000,
  neutralWhite: 3500,
  coolWhite: 4000,
  daylight: 5000,
  cloudyDay: 6500,
  blueSky: 10000,
} as const;
