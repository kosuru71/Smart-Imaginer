import { GoogleGenAI, Modality } from "@google/genai";
import type { ImageFile, AspectRatio, GeminiImageResponse } from '../types';

export const editImageWithGemini = async (
  originalImage: ImageFile,
  prompt: string,
  negativePrompt: string,
  aspectRatio: AspectRatio
): Promise<GeminiImageResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Combine prompts for better results
  const fullPrompt = `
    ${prompt}.
    Generate the image in a ${aspectRatio} aspect ratio.
    Negative prompt: ${negativePrompt}, blurry, ugly, distorted, text, watermark, low quality, bad anatomy.
    Ensure the resulting image is high quality and photorealistic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: originalImage.base64,
              mimeType: originalImage.mimeType,
            },
          },
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    
    throw new Error("No image data found in the Gemini API response.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return Promise.reject(new Error(`Failed to generate image: ${error.message}`));
    }
    return Promise.reject(new Error("An unknown error occurred while generating the image."));
  }
};

export const createImageWithGemini = async (
  prompt: string,
  negativePrompt: string,
  aspectRatio: AspectRatio
): Promise<GeminiImageResponse> => {
  if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
  }
  
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Combine prompts for better results
  const fullPrompt = `
    ${prompt}.
    Generate the image in a ${aspectRatio} aspect ratio.
    Negative prompt: ${negativePrompt}, blurry, ugly, distorted, text, watermark, low quality, bad anatomy.
    Ensure the resulting image is high quality and photorealistic.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
        responseModalities: [Modality.IMAGE],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData) {
        return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
      }
    }
    
    throw new Error("No image data found in the Gemini API response.");

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error instanceof Error) {
        return Promise.reject(new Error(`Failed to generate image: ${error.message}`));
    }
    return Promise.reject(new Error("An unknown error occurred while generating the image."));
  }
};
