/**
 * Floor Plan Schema — versioning, validation, and migration.
 *
 * Every saved floor plan JSON is wrapped in an envelope:
 *   { version: number, canvas: <Fabric.js JSON> }
 *
 * Legacy (v0) floor plans stored raw Fabric.js JSON with no wrapper.
 * v1 = first versioned schema (current).
 */

export const FLOOR_PLAN_SCHEMA_VERSION = 1;

// ── Types ──

interface CanvasEnvelope {
  version: number;
  canvas: Record<string, unknown>;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ── Wrap / Unwrap ──

/** Wrap raw Fabric.js canvas JSON in a versioned envelope for storage. */
export function wrapCanvasJSON(canvasJSON: Record<string, unknown>): CanvasEnvelope {
  return { version: FLOOR_PLAN_SCHEMA_VERSION, canvas: canvasJSON };
}

/**
 * Unwrap a stored floor plan JSON string → raw Fabric.js JSON object.
 * Handles both legacy (raw Fabric JSON) and versioned envelopes.
 */
export function unwrapCanvasJSON(stored: string): Record<string, unknown> {
  try {
    // Guard against oversized payloads (10 MB limit)
    if (stored.length > 10 * 1024 * 1024) {
      console.error("[FloorPlan] JSON exceeds 10 MB size limit, returning empty canvas");
      return { objects: [] };
    }
    const parsed = JSON.parse(stored);

    // Versioned envelope
    if (parsed && typeof parsed.version === "number" && parsed.canvas) {
      return migrate(parsed).canvas;
    }

    // Legacy: raw Fabric.js JSON (has "objects" array)
    if (parsed && Array.isArray(parsed.objects)) {
      return parsed;
    }

    // Unknown shape — return as-is and let Fabric deal with it
    return parsed;
  } catch {
    return { objects: [] };
  }
}

// ── Migration ──

function migrate(envelope: CanvasEnvelope): CanvasEnvelope {
  // Currently only v1 exists. Future migrations go here:
  // if (envelope.version < 2) envelope = migrateV1toV2(envelope);
  return envelope;
}

// ── Validation ──

/** Validate a floor plan JSON string before persisting. */
export function validateFloorPlanJSON(json: string): ValidationResult {
  const errors: string[] = [];

  // Size guard (10 MB — generous but prevents abuse)
  if (json.length > 10 * 1024 * 1024) {
    errors.push("Floor plan JSON exceeds 10 MB size limit.");
    return { valid: false, errors };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    errors.push("Invalid JSON.");
    return { valid: false, errors };
  }

  if (typeof parsed !== "object" || parsed === null) {
    errors.push("Floor plan must be a JSON object.");
    return { valid: false, errors };
  }

  const obj = parsed as Record<string, unknown>;

  // Versioned envelope check
  const canvas = obj.version !== undefined ? (obj.canvas as Record<string, unknown> | undefined) : obj;

  if (!canvas || typeof canvas !== "object") {
    errors.push("Missing canvas data.");
    return { valid: false, errors };
  }

  // Canvas must have an objects array
  if (!Array.isArray((canvas as Record<string, unknown>).objects)) {
    errors.push("Canvas missing objects array.");
  }

  // Object count sanity check (> 5000 objects is likely corrupted)
  const objects = (canvas as Record<string, unknown>).objects;
  if (Array.isArray(objects) && objects.length > 5000) {
    errors.push(`Too many canvas objects (${objects.length}). Maximum is 5000.`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Serialize canvas to a validated, versioned JSON string.
 * Returns null if validation fails (caller should handle gracefully).
 */
export function serializeFloorPlan(canvasJSON: Record<string, unknown>): string | null {
  const envelope = wrapCanvasJSON(canvasJSON);
  const json = JSON.stringify(envelope);
  const { valid } = validateFloorPlanJSON(json);
  return valid ? json : null;
}
