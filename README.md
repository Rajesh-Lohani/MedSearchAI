# MediSummarize - AI-Powered Medical Report Assistant

This is a Next.js application built with Firebase Studio that allows users to upload medical reports (text, PDF, or image files), generate summaries using AI, and chat with an AI assistant about the report's content.

## Project Structure

```
.
├── .env                    # Environment variables (e.g., API keys)
├── .vscode/
│   └── settings.json       # VS Code settings
├── README.md               # Project documentation (this file)
├── components.json         # Shadcn UI configuration
├── next.config.ts          # Next.js configuration
├── package.json            # Project dependencies and scripts
├── src/
│   ├── ai/                 # AI-related code (Genkit)
│   │   ├── ai-instance.ts  # Genkit AI instance initialization
│   │   ├── dev.ts          # Genkit flow registration for development
│   │   └── flows/          # Individual Genkit flows
│   │       ├── summarize-report.ts
│   │       ├── chat-with-report.ts
│   │       └── extract-text-from-image.ts
│   ├── app/                # Next.js App Router directory
│   │   ├── api/genkit/[...slug]/
│   │   │   └── route.ts    # API endpoint for Genkit flows
│   │   ├── globals.css     # Global CSS styles and theme variables
│   │   ├── layout.tsx      # Root application layout
│   │   └── page.tsx        # Main page component (UI and client-side logic)
│   ├── components/
│   │   └── ui/             # Reusable UI components (Shadcn UI)
│   ├── hooks/              # Custom React hooks
│   │   ├── use-mobile.tsx
│   │   └── use-toast.ts
│   ├── lib/                # Utility functions
│   │   └── utils.ts
│   └── ...                 # Other potential utility or service files
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Code Flow

1.  **User Interface (`src/app/page.tsx`):**
    *   The `Home` component serves as the main UI.
    *   **File Upload:**
        *   Users can upload `.txt`, `.pdf`, `.png`, `.jpg`, or `.webp` files via the "Choose File" button or paste text directly into the `Textarea`.
        *   The `handleFileChange` function processes the upload.
        *   **Text Files:** Content is read directly using `file.text()`.
        *   **PDF Files:**
            *   `pdfjs-dist` is dynamically imported to parse the PDF.
            *   Text content is extracted page by page.
            *   A basic heuristic checks if the extracted text is minimal, suggesting a scanned PDF. If so, it attempts OCR using the `extractTextFromImage` flow.
        *   **Image Files:**
            *   The file is read as a `dataURI`.
            *   The `extractTextFromImage` flow (using a multimodal model) is called to perform OCR.
        *   Extracted text is stored in `reportText` (displayed, potentially truncated for long files) and `fullReportText` (used for AI context).
    *   **Summarization:**
        *   Clicking "Summarize Report" triggers the `handleSummarize` function.
        *   It calls the `summarizeReport` Genkit flow, passing the `fullReportText`.
        *   The generated summary is displayed below the report text area.
    *   **Chat:**
        *   Users type questions into the chat input on the right panel.
        *   Submitting a question calls `handleChatSubmit`.
        *   It calls the `chatWithReport` Genkit flow, providing the `fullReportText` as context along with the user's `question`.
        *   The user's question and the AI's response are added to the `chatHistory` and displayed in the chat panel.

2.  **Genkit Flows (`src/ai/flows/`):**
    *   These server-side functions orchestrate interactions with the AI model.
    *   **`extractTextFromImage.ts`:**
        *   Receives an image `dataURI`.
        *   Uses a prompt specifically designed for OCR with a vision-capable model (`gemini-1.5-flash-latest`).
        *   Returns the extracted text.
    *   **`summarizeReport.ts`:**
        *   Receives the `reportText`.
        *   Uses a prompt instructing the AI to act as a medical expert and summarize key findings, diagnoses, and recommendations.
        *   Returns the generated `summary`.
    *   **`chatWithReport.ts`:**
        *   Receives the `reportText` and the user's `question`.
        *   Uses a prompt instructing the AI to answer questions *only* based on the provided report context.
        *   Returns the generated `answer`.

3.  **Genkit Setup (`src/ai/ai-instance.ts`, `src/app/api/genkit/[...slug]/route.ts`):**
    *   `ai-instance.ts`: Initializes the core `ai` object using `genkit` and the `@genkit-ai/googleai` plugin, configured with an API key from environment variables. It sets the default model.
    *   `route.ts`: Uses `@genkit-ai/next`'s `createApp()` to expose the defined Genkit flows (imported from `src/ai/flows/`) as API endpoints under `/api/genkit/...`. This allows the client-side code in `page.tsx` to call the server-side flows.

4.  **UI Components & Styling:**
    *   The UI is built using reusable components from `src/components/ui/`, which are based on Shadcn UI (leveraging Radix UI primitives and Tailwind CSS).
    *   `src/app/globals.css` defines the overall theme (colors, fonts, etc.) using CSS variables for light and dark modes, including specific styles for the sidebar.
    *   `tailwind.config.ts` configures Tailwind CSS, mapping theme variables to Tailwind classes.
    *   `src/app/layout.tsx` sets up the root layout, including the `SidebarProvider` and `Toaster` for notifications.

## Key Technologies

*   **Next.js:** React framework for server-side rendering, client-side navigation, API routes, and overall application structure.
*   **React:** Library for building the user interface components.
*   **Genkit:** Framework for building AI-powered features, connecting to Google AI models.
*   **Google AI (Gemini):** Language models used for summarization, chat, and image-to-text extraction.
*   **pdfjs-dist:** Library for parsing and extracting text from PDF files in the browser.
*   **Tailwind CSS:** Utility-first CSS framework for styling.
*   **Shadcn UI / Radix UI:** Component library and primitives for building accessible and consistent UI elements.
*   **TypeScript:** Adds static typing to JavaScript for improved code quality and developer experience.

## Running Locally

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd <repository_directory>
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    # or
    yarn install
    ```
3.  **Set up environment variables:**
    *   Create a file named `.env` in the project root.
    *   Add your Google AI API key:
        ```env
        GOOGLE_GENAI_API_KEY=YOUR_API_KEY_HERE
        ```
4.  **Run the development server:**
    ```bash
    npm run dev
    # or
    yarn dev
    ```
    The application should be accessible at `http://localhost:9002` (or the specified port).

5.  **(Optional) Build and run for production:**
    ```bash
    npm run build
    npm start
    # or
    yarn build
    yarn start
    ```

## RAM Requirements

*   **Development:** 4GB minimum, 8GB recommended for a smoother experience.
*   **Production (Local):** 8GB minimum, 16GB+ recommended if handling large files or simulating concurrent users.

Memory usage depends on the size of the reports being processed and other running applications. Monitor usage and adjust if needed.
