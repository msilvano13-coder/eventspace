/**
 * Claude Vision scene analysis — the intelligence layer.
 *
 * Claude sees the venue photo, understands the floor plan layout data,
 * and writes a detailed, scene-aware prompt that tells the image model
 * exactly where to place furniture relative to the visible architecture.
 */

export interface SceneAnalysisInput {
  venuePhotoUrl: string;          // Signed URL of the venue photo
  floorPlanData: FloorPlanItem[]; // Furniture items from the floor plan
  designDescription: string;      // Free-text description from the planner (e.g. "chiavari chairs cream, burgundy linens")
}

export interface FloorPlanItem {
  type: string;     // e.g. "Round Table (60\")", "Chair", "Bar"
  count: number;    // How many of this item
}

export interface SceneAnalysisResult {
  prompt: string;          // The generated image prompt
  negativePrompt: string;  // Enhanced negative prompt
}

/**
 * Send the venue photo + floor plan data to Claude Vision.
 * Claude analyzes the photo and writes a spatially-aware image generation prompt.
 */
export async function analyzeScene(input: SceneAnalysisInput): Promise<SceneAnalysisResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback: return the description as-is if no API key configured
    console.warn("[scene-analysis] No ANTHROPIC_API_KEY — using basic prompt");
    return {
      prompt: input.designDescription,
      negativePrompt: "blurry, distorted, cartoon, illustration, low quality",
    };
  }

  // Build the furniture inventory string
  const furnitureList = input.floorPlanData
    .map((item) => `${item.count}x ${item.type}`)
    .join(", ");

  // Fetch the image and convert to base64
  const imageResponse = await fetch(input.venuePhotoUrl);
  const imageBuffer = await imageResponse.arrayBuffer();
  const base64Image = Buffer.from(imageBuffer).toString("base64");
  const contentType = imageResponse.headers.get("content-type") || "image/jpeg";

  const systemPrompt = `You are an expert wedding venue stylist and AI image generation prompt engineer. Your job is to analyze a venue photo and write a detailed image generation prompt that will transform the empty venue into a beautifully decorated space.

You must:
1. Preserve the exact venue architecture from the photo (walls, ceiling, floor, windows, doors, beams, columns)
2. Place furniture items according to the provided inventory, positioning them naturally within the visible space
3. Apply the chosen style and color palette consistently
4. Maintain realistic lighting consistent with the original photo
5. Describe the scene from the exact camera angle visible in the photo

Output ONLY the image generation prompt. No explanations, no markdown, no labels.`;

  const userPrompt = `Analyze this wedding venue photo and generate a detailed image generation prompt.

FURNITURE TO PLACE IN THIS VENUE:
${furnitureList || "No specific furniture — focus on styling and decor only"}

PLANNER'S DESIGN VISION:
${input.designDescription}

Write a detailed, vivid prompt for an AI image-to-image model that will:
- Keep the exact room architecture, perspective, and camera angle from the original photo
- Place the listed furniture naturally in the visible space, considering the room's depth and layout
- Apply the planner's design vision with specific decor details (centerpieces, linens, lighting, florals, colors, chair styles, etc.)
- Describe materials, textures, and lighting quality
- Be specific about spatial relationships ("in the center of the room", "along the far wall", "beneath the chandelier")

The prompt should read as a single, flowing description of the decorated venue scene.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: contentType,
                data: base64Image,
              },
            },
            {
              type: "text",
              text: userPrompt,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[scene-analysis] Claude API error:", response.status, errorText);
    return {
      prompt: input.designDescription,
      negativePrompt: "blurry, distorted, cartoon, illustration, low quality",
    };
  }

  const data = await response.json();
  const generatedPrompt = data.content?.[0]?.text?.trim();

  if (!generatedPrompt) {
    console.error("[scene-analysis] Empty response from Claude");
    return {
      prompt: input.designDescription,
      negativePrompt: "blurry, distorted, cartoon, illustration, low quality",
    };
  }

  // Enhanced negative prompt
  const enhancedNegative = [
    "blurry, distorted, warped architecture, wrong perspective, cartoon, illustration, anime",
    "low quality, pixelated, watermark, text overlay, logo, unrealistic lighting",
    "floating objects, deformed furniture, extra limbs, people, humans, faces, bodies",
  ].join(", ");

  return {
    prompt: generatedPrompt,
    negativePrompt: enhancedNegative,
  };
}
