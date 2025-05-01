'use server';
/**
 * @fileOverview Extracts text from an image using a multimodal AI model.
 *
 * - extractTextFromImage - A function that handles the image text extraction process.
 * - ExtractTextFromImageInput - The input type for the extractTextFromImage function.
 * - ExtractTextFromImageOutput - The return type for the extractTextFromImage function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ExtractTextFromImageInputSchema = z.object({
  imageDataUri: z
    .string()
    .describe(
      "An image containing text, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTextFromImageInput = z.infer<typeof ExtractTextFromImageInputSchema>;

const ExtractTextFromImageOutputSchema = z.object({
  extractedText: z.string().describe('The text extracted from the image.'),
});
export type ExtractTextFromImageOutput = z.infer<typeof ExtractTextFromImageOutputSchema>;

export async function extractTextFromImage(input: ExtractTextFromImageInput): Promise<ExtractTextFromImageOutput> {
  return extractTextFromImageFlow(input);
}

// Use a model capable of understanding images, like gemini-1.5-flash-latest
const extractTextPrompt = ai.definePrompt({
  name: 'extractTextFromImagePrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Explicitly use a vision-capable model
  input: {
    schema: ExtractTextFromImageInputSchema,
  },
  output: {
    schema: ExtractTextFromImageOutputSchema,
  },
  prompt: `Extract all the text visible in the following image. Preserve formatting like line breaks as accurately as possible.

Image: {{media url=imageDataUri}}`,
});

const extractTextFromImageFlow = ai.defineFlow<
  typeof ExtractTextFromImageInputSchema,
  typeof ExtractTextFromImageOutputSchema
>(
  {
    name: 'extractTextFromImageFlow',
    inputSchema: ExtractTextFromImageInputSchema,
    outputSchema: ExtractTextFromImageOutputSchema,
  },
  async input => {
    const {output} = await extractTextPrompt(input);
    // Basic check if output is null or empty and provide a default response
    if (!output || !output.extractedText) {
        console.warn("OCR flow returned no text or null output.");
        return { extractedText: "" };
      }
    return output;
  }
);
