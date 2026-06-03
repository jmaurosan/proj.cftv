import { useState, useEffect } from 'react';
import { generateSurveillancePlaceholder } from '../services/geminiService';

/**
 * Custom hook to generate a placeholder image using Imagen AI.
 * @param prompt The prompt to generate the image.
 * @param initialUrl An optional initial URL to use before generation.
 * @returns An object containing the generated image URL and loading state.
 */
export function useImagenPlaceholder(prompt: string, initialUrl?: string) {
  const [imageUrl, setImageUrl] = useState<string>(initialUrl || '');
  const [isLoading, setIsLoading] = useState<boolean>(!initialUrl);

  useEffect(() => {
    let isMounted = true;

    async function fetchPlaceholder() {
      if (!prompt) return;
      
      setIsLoading(true);
      try {
        const url = await generateSurveillancePlaceholder(prompt);
        if (isMounted) {
          setImageUrl(url);
        }
      } catch (error) {
        console.error("Failed to generate placeholder:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchPlaceholder();

    return () => {
      isMounted = false;
    };
  }, [prompt]);

  return { imageUrl, isLoading };
}
