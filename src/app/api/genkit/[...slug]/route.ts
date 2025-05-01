import {createApp} from '@genkit-ai/next';
// IMPORTANT: Import your flows here, or they won't be available.
import '@/ai/flows/summarize-report';
import '@/ai/flows/chat-with-report';
import '@/ai/flows/extract-text-from-image'; // Add the new flow import

export const {GET, POST} = createApp();
