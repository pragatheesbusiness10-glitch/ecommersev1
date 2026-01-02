import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bot, Send, Loader2, Sparkles, RefreshCw } from 'lucide-react';
import { useAIChat } from '@/hooks/useAIChat';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const suggestedQuestions = [
  'How do I set up my storefront?',
  'How does the commission system work?',
  'How can I track my orders?',
  'What is KYC and why is it required?',
  'How do I request a payout?',
];

const UserAI: React.FC = () => {
  const { messages, isLoading, sendMessage, clearMessages } = useAIChat();
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = () => {
    if (inputMessage.trim() && !isLoading) {
      sendMessage(inputMessage);
      setInputMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    if (!isLoading) {
      sendMessage(question);
    }
  };

  const renderMessage = (msg: typeof messages[0]) => {
    const isUser = msg.role === 'user';

    return (
      <div
        key={msg.id}
        className={cn(
          'flex',
          isUser ? 'justify-end' : 'justify-start'
        )}
      >
        <div
          className={cn(
            'max-w-[80%] rounded-2xl px-4 py-2',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-foreground rounded-bl-md'
          )}
        >
          {!isUser && (
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3 h-3 text-purple-500" />
              <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI Assistant</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
          <p
            className={cn(
              'text-[10px] mt-1',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {format(msg.timestamp, 'h:mm a')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Bot className="w-8 h-8 text-purple-600" />
              AI Assistant
            </h1>
            <p className="text-muted-foreground mt-1">
              Get instant answers to your questions powered by AI.
            </p>
          </div>
          {messages.length > 0 && (
            <Button variant="outline" size="sm" onClick={clearMessages} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              New Chat
            </Button>
          )}
        </div>

        {/* Chat Card */}
        <Card className="h-[600px] flex flex-col overflow-hidden border-purple-500/20">
          <CardHeader className="border-b shrink-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Assistant</CardTitle>
                <CardDescription>
                  Powered by AI to help you 24/7
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center mb-4">
                    <Sparkles className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">How can I help you today?</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    I can answer questions about the platform, help with orders, explain features, and more.
                  </p>
                  
                  {/* Suggested Questions */}
                  <div className="space-y-2 w-full max-w-md">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Try asking:</p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {suggestedQuestions.map((question, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="text-xs h-auto py-2 px-3 whitespace-normal text-left"
                          onClick={() => handleSuggestedQuestion(question)}
                        >
                          {question}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map(renderMessage)}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                          <span className="text-sm text-muted-foreground">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t shrink-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything..."
                className="flex-1 border-purple-500/20 focus-visible:ring-purple-500/30"
                disabled={isLoading}
              />
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isLoading}
                className="shrink-0 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Info Card */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">About AI Assistant</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Get instant answers to common questions</li>
                  <li>• Available 24/7 for quick support</li>
                  <li>• For complex issues, use Chat Support or Raise a Ticket</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserAI;
