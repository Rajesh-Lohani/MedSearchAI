'use server';

/**
 * @fileOverview Provides a conversational interface to ask questions about a medical report.
 *
 * - chatWithReport - A function that handles answering questions based on the report context.
 * - ChatWithReportInput - The input type for the chatWithReport function.
 * - ChatWithReportOutput - The return type for the chatWithReport function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const ChatWithReportInputSchema = z.object({
  reportText: z.string().describe('The full text content of the medical report.'),
  question: z.string().describe('The user\'s question about the medical report.'),
});
export type ChatWithReportInput = z.infer<typeof ChatWithReportInputSchema>;

const ChatWithReportOutputSchema = z.object({
  answer: z.string().describe('The answer to the user\'s question based on the report context.'),
});
export type ChatWithReportOutput = z.infer<typeof ChatWithReportOutputSchema>;

export async function chatWithReport(input: ChatWithReportInput): Promise<ChatWithReportOutput> {
  return chatWithReportFlow(input);
}

const chatWithReportPrompt = ai.definePrompt({
  name: 'chatWithReportPrompt',
  input: {
    schema: ChatWithReportInputSchema,
  },
  output: {
    schema: ChatWithReportOutputSchema,
  },
  prompt: `You are a helpful medical assistant AI. You will answer questions based *only* on the provided medical report context. Do not use any external knowledge or make assumptions beyond what is stated in the report. If the answer cannot be found in the report, state that clearly.

Medical Report Context:
---
{{{reportText}}}
---

User Question: {{{question}}}

Based *only* on the report provided above, answer the user's question. If the information is not present in the report, say "I cannot answer that question based on the provided report."`,
});

const chatWithReportFlow = ai.defineFlow<
  typeof ChatWithReportInputSchema,
  typeof ChatWithReportOutputSchema
>(
  {
    name: 'chatWithReportFlow',
    inputSchema: ChatWithReportInputSchema,
    outputSchema: ChatWithReportOutputSchema,
  },
  async input => {
    // Basic check for overly long report text - consider chunking or more sophisticated handling if needed
    const MAX_REPORT_LENGTH = 30000; // Adjust as needed based on model limits
    if (input.reportText.length > MAX_REPORT_LENGTH) {
        console.warn(`Report text truncated for chat flow due to length: ${input.reportText.length} characters.`);
        input.reportText = input.reportText.substring(0, MAX_REPORT_LENGTH);
    }

    const {output} = await chatWithReportPrompt(input);
    return output!;
  }
);
