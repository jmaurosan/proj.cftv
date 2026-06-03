import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini AI client using Vite's environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const ai = API_KEY ? new GoogleGenAI({ apiKey: API_KEY }) : null;

/**
 * Generates a placeholder image using Imagen AI for surveillance contexts.
 * @param prompt The description of the image to generate.
 * @returns A promise that resolves to a base64 data URL of the generated image.
 */
export async function generateSurveillancePlaceholder(prompt: string): Promise<string> {
  const fallbackUrl = `https://picsum.photos/seed/${encodeURIComponent(prompt)}/1280/720?blur=2`;

  // Fallback if no API Key is provided
  if (!ai) {
    console.warn("GEMINI_API_KEY not found. Using fallback placeholder.");
    return fallbackUrl;
  }

  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Tactical surveillance style, CCTV feed aesthetic, ${prompt}, high contrast, security monitoring theme`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64EncodeString = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64EncodeString}`;
    }
    
    throw new Error("No image generated");
  } catch (error) {
    console.error("Error generating image with Imagen AI:", error);
    // Return fallback if generation fails
    return fallbackUrl;
  }
}

/**
 * Generates a specific placeholder for a camera feed.
 */
export async function generateCameraFeedPlaceholder(cameraName: string, location: string): Promise<string> {
  const prompt = `Security camera view of ${location}, showing ${cameraName} perspective, night vision or low light tactical look`;
  return generateSurveillancePlaceholder(prompt);
}

/**
 * Generates a status indicator image for a DVR.
 */
export async function generateDVRStatusPlaceholder(dvrName: string): Promise<string> {
  const prompt = `Technical dashboard showing status for DVR ${dvrName}, server rack environment, glowing status lights, tactical interface`;
  return generateSurveillancePlaceholder(prompt);
}

