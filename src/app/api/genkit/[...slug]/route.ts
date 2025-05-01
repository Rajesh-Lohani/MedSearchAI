import {createApp} from '@genkit-ai/next';
// IMPORTANT: Import your flows here, or they won't be available.
import '@/ai/flows/summarize-report';

export const {GET, POST} = createApp();
