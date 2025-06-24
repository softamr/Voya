
'use server';
/**
 * @fileOverview A Genkit flow to generate hotel images based on a text prompt.
 *
 * - generateHotelImage - A function that handles hotel image generation.
 * - GenerateHotelImageInput - The input type for the generateHotelImage function.
 * - GenerateHotelImageOutput - The return type for the generateHotelImage function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateHotelImageInputSchema = z.object({
  prompt: z.string().describe("A text prompt used to generate an image for a hotel, typically 1-3 descriptive keywords (e.g., 'modern lobby', 'beach view sunset', 'hotel exterior night')."),
});
export type GenerateHotelImageInput = z.infer<typeof GenerateHotelImageInputSchema>;

const GenerateHotelImageOutputSchema = z.object({
  imageUrl: z.string().describe("The generated image as a data URI. Format: 'data:image/png;base64,<encoded_data>'."),
});
export type GenerateHotelImageOutput = z.infer<typeof GenerateHotelImageOutputSchema>;

export async function generateHotelImage(input: GenerateHotelImageInput): Promise<GenerateHotelImageOutput> {
  return generateHotelImageFlow(input);
}

const generateHotelImageFlow = ai.defineFlow(
  {
    name: 'generateHotelImageFlow',
    inputSchema: GenerateHotelImageInputSchema,
    outputSchema: GenerateHotelImageOutputSchema,
  },
  async (input) => {
    const { media } = await ai.generate({
      model: 'googleai/gemini-2.0-flash-exp', // Specific model for image generation
      prompt: `Generate a photorealistic image of a hotel scene described as: ${input.prompt}. Focus on high quality and common hotel aesthetics.`,
      config: {
        responseModalities: ['TEXT', 'IMAGE'], // Must include both for current experimental API
         safetySettings: [ // Adjusted safety settings if needed, default might be too restrictive for generic scenes
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      },
    });

    if (!media || !media.url) {
      throw new Error('Image generation failed to return a valid media URL.');
    }
    
    // Log the first few characters of the data URI to verify format, not the whole thing.
    console.log('Generated image data URI (first 100 chars):', media.url.substring(0, 100));

    return { imageUrl: media.url };
  }
);
