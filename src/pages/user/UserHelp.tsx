import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, PlayCircle, Bot, MessageCircle, ExternalLink } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const UserHelp: React.FC = () => {
  const { settingsMap, isLoading } = usePlatformSettings();
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const faqItems = settingsMap.faq_items || [];
  const videoUrl = settingsMap.user_dashboard_video_url;

  // Extract YouTube video ID for embedding
  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // Handle various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    
    if (match && match[2].length === 11) {
      return `https://www.youtube.com/embed/${match[2]}?autoplay=1`;
    }
    
    // If it's already an embed URL or other video format, return as-is
    return url;
  };

  const embedUrl = getYouTubeEmbedUrl(videoUrl);

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <HelpCircle className="w-8 h-8 text-primary" />
            Help & FAQ
          </h1>
          <p className="text-muted-foreground mt-1">
            Learn how to use the platform and find answers to common questions.
          </p>
        </div>

        {/* Getting Started Video */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="w-5 h-5 text-primary" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Watch our tutorial to learn how to use the platform effectively.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="aspect-video w-full rounded-lg" />
            ) : videoUrl && embedUrl ? (
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {isVideoPlaying ? (
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title="Getting Started Tutorial"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                    <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                      <PlayCircle className="w-12 h-12 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Platform Tutorial</h3>
                    <p className="text-sm text-muted-foreground mb-4 text-center max-w-md px-4">
                      Learn how to set up your storefront, add products, and start earning commissions.
                    </p>
                    <Button onClick={() => setIsVideoPlaying(true)} className="gap-2">
                      <PlayCircle className="w-4 h-4" />
                      Watch Tutorial
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center text-muted-foreground">
                <PlayCircle className="w-16 h-16 mb-3 opacity-50" />
                <p className="text-sm">Tutorial video coming soon</p>
                <p className="text-xs mt-1">Contact support if you need help getting started</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0 group-hover:bg-blue-500/20 transition-colors">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Chat Support</h3>
                  <p className="text-sm text-muted-foreground">
                    Talk to our support team directly. Click the chat icon in the bottom right corner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0 group-hover:bg-purple-500/20 transition-colors">
                  <Bot className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">AI Assistant</h3>
                  <p className="text-sm text-muted-foreground">
                    Get instant answers from our AI. Look for the AI button in the bottom right corner.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Frequently Asked Questions
            </CardTitle>
            <CardDescription>
              Find answers to the most common questions about our platform.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : faqItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No FAQs available yet</p>
                <p className="text-sm mt-1">Check back soon or contact support for help</p>
              </div>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {faqItems.map((item, index) => (
                  <AccordionItem
                    key={item.id || index}
                    value={item.id || `faq-${index}`}
                    className="border rounded-lg px-4"
                  >
                    <AccordionTrigger className="hover:no-underline py-4 text-left">
                      <span className="font-medium">{item.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 text-muted-foreground">
                      {item.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>

        {/* Additional Help */}
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ExternalLink className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Still need help?</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  If you couldn't find the answer you were looking for, our support team is here to help.
                </p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Use the chat widget to message our team directly</li>
                  <li>• Ask our AI assistant for instant answers</li>
                  <li>• Submit a support ticket for complex issues</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserHelp;
