'use server';

/**
 * @fileOverview Summarizes medical reports by extracting key findings, diagnoses, and treatment recommendations.
 *
 * - summarizeReport - A function that handles the report summarization process.
 * - SummarizeReportInput - The input type for the summarizeReport function.
 * - SummarizeReportOutput - The return type for the summarizeReport function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const SummarizeReportInputSchema = z.object({
  reportText: z.string().describe('The text content of the medical report.'),
});
export type SummarizeReportInput = z.infer<typeof SummarizeReportInputSchema>;

const SummarizeReportOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the medical report.'),
});
export type SummarizeReportOutput = z.infer<typeof SummarizeReportOutputSchema>;

export async function summarizeReport(input: SummarizeReportInput): Promise<SummarizeReportOutput> {
  return summarizeReportFlow(input);
}

const summarizeReportPrompt = ai.definePrompt({
  name: 'summarizeReportPrompt',
  input: {
    schema: z.object({
      reportText: z.string().describe('The text content of the medical report.'),
    }),
  },
  output: {
    schema: z.object({
      summary: z.string().describe('A concise summary of the medical report, including key findings, diagnoses, and treatment recommendations.'),
    }),
  },
  prompt: `You are a medical expert specializing in summarizing medical reports. Please provide a concise summary of the following medical report, extracting key findings, diagnoses, and treatment recommendations. Only incorporate information that is relevant to the overall context.

Medical Report:
{{{reportText}}}`,
});

const summarizeReportFlow = ai.defineFlow<
  typeof SummarizeReportInputSchema,
  typeof SummarizeReportOutputSchema
>(
  {
    name: 'summarizeReportFlow',
    inputSchema: SummarizeReportInputSchema,
    outputSchema: SummarizeReportOutputSchema,
  },
  async input => {
    const {output} = await summarizeReportPrompt(input);
    return output!;
  }
);
