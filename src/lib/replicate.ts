import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
});

export interface GenerationInput {
  imageUrl: string;            // Public URL of the venue photo
  prompt: string;              // Style prompt
  negativePrompt: string;      // Negative prompt
  strength: number;            // 0-1, how much to transform
  guidanceScale: number;       // Typically 7-12
  controlnetMode: string;      // canny | depth
  seed?: number;               // Optional seed for reproducibility
}

export interface GenerationResult {
  id: string;              // Replicate prediction ID
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output?: string | string[];
  error?: string;
  metrics?: { predict_time?: number };
}

/**
 * Generate a styled venue image using Flux Dev img2img.
 * Lower prompt_strength = more structural preservation from the original venue photo.
 * When a floor plan is provided, layout details are woven into the prompt.
 */
export async function createGeneration(input: GenerationInput): Promise<GenerationResult> {
  const prediction = await replicate.predictions.create({
    model: "black-forest-labs/flux-dev" as `${string}/${string}`,
    input: {
      image: input.imageUrl,
      prompt: input.prompt,
      guidance: input.guidanceScale,
      prompt_strength: input.strength,
      num_outputs: 1,
      num_inference_steps: 28,
      output_format: "webp",
      output_quality: 95,
      ...(input.seed != null ? { seed: input.seed } : {}),
    },
  });

  return {
    id: prediction.id,
    status: prediction.status as GenerationResult["status"],
    output: prediction.output as string[] | undefined,
    error: prediction.error as string | undefined,
  };
}

/**
 * Poll a prediction by ID.
 */
export async function getGeneration(predictionId: string): Promise<GenerationResult> {
  const prediction = await replicate.predictions.get(predictionId);
  return {
    id: prediction.id,
    status: prediction.status as GenerationResult["status"],
    output: prediction.output as string[] | undefined,
    error: prediction.error as string | undefined,
    metrics: prediction.metrics as GenerationResult["metrics"],
  };
}

/**
 * Cancel a running prediction.
 */
export async function cancelGeneration(predictionId: string): Promise<void> {
  await replicate.predictions.cancel(predictionId);
}
