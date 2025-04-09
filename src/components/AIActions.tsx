
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, Search, FileSearch, ScrollText, Copy, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { VoiceInput } from "./VoiceInput";
import { answerQuestionWithBedrock } from "@/utils/aws";
import { Textarea } from "@/components/ui/textarea";

interface AIActionsProps {
  documentId: string;
}

export const AIActions = ({ documentId }: AIActionsProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const { toast } = useToast();
  
  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Simulate AI-powered search with AWS Bedrock and Pinecone
    setTimeout(() => {
      setSearchResults([
        "The results found in paragraph 2 match your query about document processing.",
        "Additional information about AWS services can be found in section 3.2."
      ]);
      setIsSearching(false);
    }, 1500);
  };
  
  const generateSummary = () => {
    setIsSummarizing(true);
    setSummary(null);
    
    // Simulate LLM summary generation using AWS SageMaker
    setTimeout(() => {
      setSummary("This document describes a cloud-based document processing system that utilizes AWS services for storage and AI capabilities. It outlines the architecture using S3 for storage, Textract for text extraction, and integration with vector databases for semantic search functionality.");
      setIsSummarizing(false);
    }, 2000);
  };
  
  const askQuestion = async () => {
    if (!question.trim()) return;
    
    setIsAnswering(true);
    setAnswer(null);
    
    try {
      // Get the document text - in a real app, this would be fetched from the database
      const documentText = "This is the document text that would be retrieved from the database. It contains information about our document processing system.";
      
      // Use AWS Bedrock to answer the question
      const response = await answerQuestionWithBedrock(question, documentText);
      setAnswer(response);
    } catch (error) {
      console.error("Error answering question:", error);
      toast({
        title: "Error",
        description: "Failed to answer your question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnswering(false);
    }
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "The text has been copied to your clipboard.",
    });
  };
  
  const toggleListening = () => {
    setIsListening(!isListening);
    
    if (isListening) {
      toast({
        title: "Voice input stopped",
        description: "Voice recording has been stopped.",
      });
    } else {
      toast({
        title: "Voice input started",
        description: "Speak your question clearly...",
      });
    }
  };
  
  const handleTranscript = (text: string) => {
    setQuestion(text);
  };
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">AI Tools</CardTitle>
        </div>
        <CardDescription>
          Leverage AI to analyze and extract insights from your document
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex items-center mb-2">
              <FileSearch className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-sm font-medium">Semantic Search</h3>
            </div>
            
            <div className="flex gap-2 mb-3">
              <Input
                placeholder="Search within document..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button 
                size="sm" 
                onClick={handleSearch} 
                disabled={isSearching || !searchQuery.trim()}
              >
                {isSearching ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {searchResults.length > 0 && (
              <div className="bg-secondary p-3 rounded-md text-sm space-y-2">
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="bg-secondary">
                    Results
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => copyToClipboard(searchResults.join("\n\n"))}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                {searchResults.map((result, index) => (
                  <p key={index} className="text-xs">{result}</p>
                ))}
              </div>
            )}
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <ScrollText className="h-4 w-4 mr-2 text-primary" />
                <h3 className="text-sm font-medium">AI Summary</h3>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={generateSummary}
                disabled={isSummarizing}
              >
                {isSummarizing ? "Generating..." : "Generate"}
              </Button>
            </div>
            
            {isSummarizing && (
              <div className="bg-secondary p-4 rounded-md flex justify-center">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {summary && (
              <div className="bg-secondary p-3 rounded-md text-sm">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="bg-secondary">
                    Summary
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => copyToClipboard(summary)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs">{summary}</p>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center mb-2">
              <MessageSquare className="h-4 w-4 mr-2 text-primary" />
              <h3 className="text-sm font-medium">Ask Questions</h3>
            </div>
            
            <div className="flex gap-2 mb-3">
              <Textarea
                placeholder="Ask a question about the document..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="resize-none min-h-[60px]"
              />
            </div>
            
            <div className="flex justify-between gap-2 mb-3">
              <VoiceInput
                onTranscript={handleTranscript}
                isListening={isListening}
                toggleListening={toggleListening}
              />
              <Button 
                onClick={askQuestion} 
                disabled={isAnswering || !question.trim()}
                size="sm"
              >
                {isAnswering ? "Processing..." : "Ask AI"}
              </Button>
            </div>
            
            {isAnswering && (
              <div className="bg-secondary p-4 rounded-md flex justify-center">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            
            {answer && (
              <div className="bg-secondary p-3 rounded-md text-sm">
                <div className="flex justify-between items-center mb-2">
                  <Badge variant="outline" className="bg-secondary">
                    Answer
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6" 
                    onClick={() => copyToClipboard(answer)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs">{answer}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
