'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarTrigger,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { summarizeReport, type SummarizeReportOutput } from '@/ai/flows/summarize-report';
import { useToast } from '@/hooks/use-toast';

export default function Home() {
  const [reportText, setReportText] = React.useState('');
  const [summary, setSummary] = React.useState<SummarizeReportOutput | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [fileName, setFileName] = React.useState('');
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setIsLoading(true);
      setSummary(null); // Clear previous summary
      try {
        // Basic file type check (more robust checks might be needed for production)
        if (file.type === 'text/plain') {
          const text = await file.text();
          setReportText(text);
        } else if (file.type === 'application/pdf') {
          // Placeholder for PDF processing - requires a library like pdf-parse
          // For now, we'll just show a message
          setReportText(`PDF processing is not yet implemented. Please upload a text file.`);
          toast({
            title: 'PDF Upload Notice',
            description: 'PDF processing is not yet fully implemented. Please use a .txt file for now.',
            variant: 'destructive',
          });
        } else {
          throw new Error('Unsupported file type. Please upload a .txt or .pdf file.');
        }
      } catch (error: any) {
        console.error('Error reading file:', error);
        setReportText('');
        setFileName('');
        toast({
          title: 'Error Reading File',
          description: error.message || 'Could not read the uploaded file.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSummarize = async () => {
    if (!reportText || reportText.startsWith('PDF processing')) {
        toast({
            title: 'No Report Text',
            description: 'Please upload a valid text file or paste the report text.',
            variant: 'destructive',
        });
      return;
    }
    setIsLoading(true);
    setSummary(null);
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
          <h1 className="text-xl font-semibold">Medical Report Summarizer</h1>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Report Upload Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Upload or Paste Report</CardTitle>
                <CardDescription>Upload a .txt file or paste the medical report text below.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                  <Label htmlFor="report-file">Upload File</Label>
                  <div className="flex gap-2">
                    <Input
                      id="report-file"
                      type="file"
                      accept=".txt,.pdf" // Accept text and PDF files
                      onChange={handleFileChange}
                      ref={fileInputRef}
                      className="hidden" // Hide the default input
                    />
                    <Button variant="outline" onClick={triggerFileInput} className="flex-grow">
                      <Upload className="mr-2 h-4 w-4" /> Choose File
                    </Button>
                     {fileName && (
                        <div className="flex items-center text-sm text-muted-foreground border rounded-md px-3 py-1 bg-secondary">
                            <FileText className="mr-2 h-4 w-4 text-secondary-foreground" />
                            <span className="truncate max-w-[150px]">{fileName}</span>
                        </div>
                    )}
                  </div>

                </div>
                 <div className="relative">
                  <Label htmlFor="report-text">Or Paste Text</Label>
                  <Textarea
                    id="report-text"
                    placeholder="Paste your medical report text here..."
                    value={reportText}
                    onChange={(e) => {
                      setReportText(e.target.value);
                      setFileName(''); // Clear filename if text is manually changed
                    }}
                    rows={15}
                    className="mt-1 resize-none"
                    disabled={isLoading}
                  />
                   {isLoading && reportText && !summary && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/80 rounded-md">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Processing...</span>
                    </div>
                   )}
                 </div>

                <Button onClick={handleSummarize} disabled={isLoading || !reportText || reportText.startsWith('PDF processing')} className="w-full">
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Summarize Report
                </Button>
              </CardContent>
            </Card>

            {/* Summary Display Section */}
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle>Summary</CardTitle>
                 <CardDescription>AI-generated summary will appear here.</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading && !summary && (
                   <div className="flex items-center justify-center h-64">
                     <Loader2 className="h-8 w-8 animate-spin text-primary" />
                     <span className="ml-2 text-muted-foreground">Generating summary...</span>
                   </div>
                )}
                {summary ? (
                  <div className="space-y-4">
                     <Textarea
                        readOnly
                        value={summary.summary}
                        rows={17}
                        className="bg-secondary text-secondary-foreground resize-none focus-visible:ring-0 focus-visible:ring-offset-0 border-none"
                      />
                  </div>
                ) : !isLoading && (
                  <div className="flex items-center justify-center h-64 text-muted-foreground">
                     <p>Upload or paste a report and click "Summarize Report".</p>
                   </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
