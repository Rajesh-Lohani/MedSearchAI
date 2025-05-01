// src/app/page.tsx
'use client';

import * as React from 'react';
// Dynamically import pdfjs-dist later
// import * as pdfjsLib from 'pdfjs-dist';
import type * as PdfjsLibT from 'pdfjs-dist'; // Import type for type safety
import type { TextItem } from 'pdfjs-dist/types/src/display/api'; // Import specific type

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, FileText, Loader2, Bot, User, Send, Image as ImageIcon } from 'lucide-react'; // Added ImageIcon
import { summarizeReport, type SummarizeReportOutput } from '@/ai/flows/summarize-report';
import { chatWithReport, type ChatWithReportInput, type ChatWithReportOutput } from '@/ai/flows/chat-with-report';
import { extractTextFromImage, type ExtractTextFromImageInput, type ExtractTextFromImageOutput } from '@/ai/flows/extract-text-from-image'; // Import the new flow
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// PDF worker setup needs to be done dynamically after import
let pdfjsLib: typeof PdfjsLibT | null = null;
let pdfjsWorkerInitialized = false;

async function initializePdfjs() {
    if (!pdfjsLib) {
        pdfjsLib = await import('pdfjs-dist');
        if (typeof window !== 'undefined' && !pdfjsWorkerInitialized) {
            // Use dynamic import for worker as well to ensure it's loaded correctly
             const workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs')).default;
             pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;
            // Alternatively, using unpkg:
            // pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
            pdfjsWorkerInitialized = true;
        }
    }
    return pdfjsLib;
}


interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
}

export default function Home() {
  const [reportText, setReportText] = React.useState('');
  const [fullReportText, setFullReportText] = React.useState(''); // Store original text for chat
  const [summary, setSummary] = React.useState<SummarizeReportOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSummarizing, setIsSummarizing] = React.useState(false);
  const [isChatting, setIsChatting] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [processingMessage, setProcessingMessage] = React.useState('Processing file...');

  // Chat state
  const [chatHistory, setChatHistory] = React.useState<ChatMessage[]>([]);
  const [userQuestion, setUserQuestion] = React.useState('');
  const chatScrollAreaRef = React.useRef<HTMLDivElement>(null);

  // Scroll chat to bottom on new message
  React.useEffect(() => {
    if (chatScrollAreaRef.current) {
      chatScrollAreaRef.current.scrollTo({
        top: chatScrollAreaRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [chatHistory]);

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsLoading(true);
      setSummary(null); // Clear previous summary
      setChatHistory([]); // Clear chat history
      setUserQuestion(''); // Clear chat input
      setReportText(''); // Clear displayed text
      setFullReportText(''); // Clear full text store
      setProcessingMessage('Processing file...'); // Reset message

      try {
        let extractedText = '';
        if (file.type === 'text/plain') {
          extractedText = await file.text();
        } else if (file.type === 'application/pdf') {
           setProcessingMessage('Loading PDF library...');
           const pdfjs = await initializePdfjs();
            if (!pdfjs) {
                throw new Error("Failed to load PDF library.");
            }
           setProcessingMessage('Extracting text from PDF...');
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const numPages = pdf.numPages;
          let pdfText = '';
          for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            // Basic check for non-Latin characters which might indicate scanned PDF
            const hasNonLatin = textContent.items.some((item) => /[^a-zA-Z0-9 .,!?"'$%&()+-=*/:;<>@[\\]^_`{|}~\n\r\t]/u.test((item as TextItem).str));
            if (hasNonLatin && textContent.items.length < 10) { // Heuristic: Few items with strange chars might be OCR needed
              console.warn("PDF might be scanned or contain non-standard text, attempting extraction anyway.");
            }
            pdfText += textContent.items.map((item) => (item as TextItem).str).join(' ') + '\n';
          }
          // Basic check if PDF text extraction likely failed (e.g., scanned image)
           if (pdfText.trim().length < 50 && file.size > 10000) { // Heuristic: Small text, large file size
                setProcessingMessage('PDF seems image-based, attempting OCR...');
                const imageDataUri = await readFileAsDataURL(file); // Re-read as data URL for OCR flow
                const ocrInput: ExtractTextFromImageInput = { imageDataUri };
                const ocrResult: ExtractTextFromImageOutput = await extractTextFromImage(ocrInput);
                extractedText = ocrResult.extractedText;
                if (!extractedText.trim()) {
                    throw new Error('Failed to extract text using OCR from the PDF.');
                }
           } else {
               extractedText = pdfText;
           }
        } else if (file.type.startsWith('image/')) {
          setProcessingMessage('Extracting text from image...');
          const imageDataUri = await readFileAsDataURL(file);
          const input: ExtractTextFromImageInput = { imageDataUri };
          const result: ExtractTextFromImageOutput = await extractTextFromImage(input);
          extractedText = result.extractedText;
          if (!extractedText.trim()) {
            throw new Error('Could not extract any text from the image.');
          }
        } else {
          throw new Error('Unsupported file type. Please upload a .txt, .pdf, .png, .jpg, or .webp file.');
        }

        if (!extractedText.trim()) {
           throw new Error('Extracted text is empty. The file might be corrupted or contain no text.');
        }

        setReportText(extractedText); // Display extracted text (can be long for PDFs/images)
        setFullReportText(extractedText); // Store full text for chat context
        toast({
            title: 'File Processed',
            description: 'Text successfully extracted from the file.',
        });

      } catch (error: any) {
        console.error('Error reading or parsing file:', error);
        setReportText('');
        setFullReportText('');
        setFileName('');
        toast({
          title: 'Error Processing File',
          description: error.message || 'Could not process the uploaded file.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
        setProcessingMessage('Processing file...'); // Reset message
      }
    }
     // Reset file input value so the same file can be uploaded again
     if (fileInputRef.current) {
        fileInputRef.current.value = '';
     }
  };

  const handleSummarize = async () => {
    if (!reportText) {
      toast({
        title: 'No Report Text',
        description: 'Please upload a valid file or paste the report text.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoading(true);
    setIsSummarizing(true);
    setSummary(null);
    setChatHistory([]); // Reset chat when summarizing new report
    setProcessingMessage('Generating summary...');
    try {
      const result = await summarizeReport({ reportText });
      setSummary(result);
      toast({
        title: 'Summarization Complete',
        description: 'The report has been successfully summarized.',
      });
    } catch (error) {
      console.error('Error summarizing report:', error);
      toast({
        title: 'Summarization Error',
        description: 'An error occurred while summarizing the report.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsSummarizing(false);
      setProcessingMessage('Processing file...'); // Reset message
    }
  };

  const handleChatSubmit = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userQuestion.trim() || !fullReportText) {
      return;
    }

    const newQuestion: ChatMessage = { sender: 'user', text: userQuestion };
    setChatHistory((prev) => [...prev, newQuestion]);
    setUserQuestion('');
    setIsChatting(true);

    try {
        const input: ChatWithReportInput = {
            reportText: fullReportText, // Use full report text for context
            question: newQuestion.text,
        };
      const result: ChatWithReportOutput = await chatWithReport(input);
      const botResponse: ChatMessage = { sender: 'bot', text: result.answer };
      setChatHistory((prev) => [...prev, botResponse]);
    } catch (error) {
      console.error('Error chatting with report:', error);
      const errorResponse: ChatMessage = { sender: 'bot', text: 'Sorry, I encountered an error trying to answer your question.' };
      setChatHistory((prev) => [...prev, errorResponse]);
      toast({
        title: 'Chat Error',
        description: 'An error occurred while getting the chat response.',
        variant: 'destructive',
      });
    } finally {
      setIsChatting(false);
    }
  };


  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar>
        <SidebarHeader>
          <h2 className="text-lg font-semibold text-primary">MediSummarize</h2>
        </SidebarHeader>
        <SidebarContent className="p-2">
          {/* Future sidebar content can go here */}
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-4">
          <SidebarTrigger className="sm:hidden" />
          <h1 className="text-xl font-semibold">Medical Report Assistant</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Report Upload & Display Section */}
            <Card className="shadow-md lg:col-span-2">
              <CardHeader>
                <CardTitle>Upload or Paste Report</CardTitle>
                <CardDescription>Upload a .txt, .pdf, .png, .jpg, or .webp file, or paste the medical report text below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="report-file">Upload File</Label>
                  <div className="flex gap-2">
                    <Input
                      id="report-file"
                      type="file"
                      accept=".txt,.pdf,.png,.jpg,.jpeg,.webp" // Accept text, PDF and image files
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden" // Hide the default input
                      disabled={isLoading}
                    />
                    <Button variant="outline" onClick={triggerFileInput} className="flex-grow" disabled={isLoading}>
                      <Upload className="mr-2 h-4 w-4" /> Choose File
                    </Button>
                    {fileName && (
                      <div className="flex items-center text-sm text-muted-foreground border rounded-md px-3 py-1 bg-secondary">
                       {fileName.match(/\.(txt|pdf)$/i) ? <FileText className="mr-2 h-4 w-4 text-secondary-foreground" /> : <ImageIcon className="mr-2 h-4 w-4 text-secondary-foreground" />}
                        <span className="truncate max-w-[150px] sm:max-w-[250px]">{fileName}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <Label htmlFor="report-text">Report Text</Label>
                  <ScrollArea className="h-64 w-full rounded-md border mt-1">
                    <Textarea
                        id="report-text"
                        placeholder={isLoading ? processingMessage : "Paste or view your medical report text here..."}
                        value={reportText}
                        onChange={(e) => {
                          setReportText(e.target.value);
                          setFullReportText(e.target.value); // Keep full text in sync
                          setFileName(''); // Clear filename if text is manually changed
                          setSummary(null); // Clear summary if text changed
                          setChatHistory([]); // Clear chat if text changed
                        }}
                        rows={15}
                        className="mt-0 border-0 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[254px]" // Match ScrollArea height
                        disabled={isLoading}
                        readOnly={isLoading || (!!fileName && !reportText && !reportText.length)} // Readonly while loading or if file is loaded but text not manually editable
                    />
                   </ScrollArea>
                   {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">{processingMessage}</span>
                    </div>
                   )}
                 </div>

                <Button onClick={handleSummarize} disabled={isLoading || !reportText} className="w-full">
                  {isSummarizing ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  {summary ? 'Re-Summarize Report' : 'Summarize Report'}
                </Button>

                 {/* Summary Display */}
                 {summary && (
                    <Card className="shadow-inner bg-secondary">
                        <CardHeader>
                            <CardTitle className="text-lg">Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ScrollArea className="h-48"> {/* Added ScrollArea for summary */}
                                <Textarea
                                  readOnly
                                  value={summary.summary}
                                  className="bg-secondary text-secondary-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none min-h-[180px]"
                                />
                              </ScrollArea>
                        </CardContent>
                    </Card>
                 )}
                  {!summary && isSummarizing && (
                     <div className="flex items-center justify-center h-20">
                         <Loader2 className="h-6 w-6 animate-spin text-primary" />
                         <span className="ml-2 text-muted-foreground">Generating summary...</span>
                     </div>
                 )}
                  {!summary && !isSummarizing && reportText && (
                     <div className="flex items-center justify-center h-20 text-muted-foreground">
                         <p>Click "Summarize Report" to generate a summary.</p>
                     </div>
                 )}
                 {!reportText && !isLoading && (
                    <div className="flex items-center justify-center h-20 text-muted-foreground">
                         <p>Upload or paste a report first.</p>
                    </div>
                 )}

              </CardContent>
            </Card>

            {/* Chatbot Section */}
            <Card className="shadow-md lg:col-span-1 flex flex-col h-[calc(100vh-12rem)] max-h-[800px]">
              <CardHeader>
                <CardTitle>Chat with Report</CardTitle>
                <CardDescription>Ask questions about the uploaded report.</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
                <ScrollArea className="flex-1 pr-4" ref={chatScrollAreaRef}>
                  <div className="space-y-4">
                    {chatHistory.length === 0 && !isChatting && (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <Bot size={48} className="mb-4"/>
                            <p>{fullReportText ? "Ask me anything about the report." : "Upload or paste a report to start chatting."}</p>
                        </div>
                    )}
                    {chatHistory.map((message, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-start gap-3',
                          message.sender === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {message.sender === 'bot' && (
                           <div className="bg-primary rounded-full p-2 text-primary-foreground flex-shrink-0"> {/* Added flex-shrink-0 */}
                             <Bot size={16} />
                           </div>
                        )}
                         <div
                           className={cn(
                             'max-w-[80%] rounded-lg px-3 py-2 text-sm break-words', // Added break-words
                             message.sender === 'user'
                               ? 'bg-primary text-primary-foreground'
                               : 'bg-secondary text-secondary-foreground'
                           )}
                         >
                          {message.text.split('\n').map((line, i) => (
                              <p key={i}>{line || '\u00A0'}</p> // Use non-breaking space for empty lines
                          ))}
                         </div>
                        {message.sender === 'user' && (
                           <div className="bg-secondary rounded-full p-2 text-secondary-foreground flex-shrink-0"> {/* Added flex-shrink-0 */}
                            <User size={16} />
                           </div>
                        )}
                      </div>
                    ))}
                    {isChatting && (
                        <div className="flex items-start gap-3 justify-start">
                             <div className="bg-primary rounded-full p-2 text-primary-foreground flex-shrink-0"> {/* Added flex-shrink-0 */}
                                 <Bot size={16} />
                             </div>
                             <div className="bg-secondary text-secondary-foreground rounded-lg px-3 py-2 text-sm">
                                 <Loader2 className="h-4 w-4 animate-spin inline-block mr-1" /> Thinking...
                             </div>
                         </div>
                    )}
                  </div>
                </ScrollArea>
                <form onSubmit={handleChatSubmit} className="flex items-center gap-2 border-t pt-4">
                  <Input
                    placeholder="Ask a question..."
                    value={userQuestion}
                    onChange={(e) => setUserQuestion(e.target.value)}
                    disabled={isChatting || !fullReportText || isLoading}
                    className="flex-1"
                  />
                  <Button type="submit" size="icon" disabled={isChatting || !userQuestion.trim() || !fullReportText || isLoading}>
                    <Send className="h-4 w-4" />
                    <span className="sr-only">Send</span>
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
