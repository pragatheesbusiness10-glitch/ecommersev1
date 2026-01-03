import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { MessageCircle, Send, Loader2, Paperclip, Bell, BellOff } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChatRealtimeUser } from '@/hooks/useRealtimeSubscription';

const UserChat: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { messages, isLoading, sendMessage, isSending, markAsRead, unreadCount } = useChat();
  const { isOtherTyping } = useTypingIndicator(user?.id || '');
  const { settings: publicSettings } = usePublicSettings();
  const [inputMessage, setInputMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Enable real-time updates
  useChatRealtimeUser(user?.id);
  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      if (permission === 'granted') {
        toast({
          title: 'Notifications Enabled',
          description: 'You will now receive notifications for new messages.',
        });
      }
    }
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Mark messages as read when viewing
  useEffect(() => {
    if (unreadCount > 0) {
      markAsRead();
    }
  }, [unreadCount, markAsRead]);

  const handleSend = () => {
    if (inputMessage.trim() && !isSending) {
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 5MB',
        variant: 'destructive',
      });
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      // Send attachment as a message with the URL
      const attachmentMessage = file.type.startsWith('image/')
        ? `[Image: ${publicUrl}]`
        : `[File: ${file.name}] ${publicUrl}`;

      sendMessage(attachmentMessage);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: 'Could not upload the file. Please try again.',
        variant: 'destructive',
      });
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const renderMessage = (msg: typeof messages[0]) => {
    const isUser = msg.sender_role === 'user';
    const content = msg.message;

    // Check if message contains an image
    const imageMatch = content.match(/\[Image: (https?:\/\/[^\]]+)\]/);
    const fileMatch = content.match(/\[File: ([^\]]+)\] (https?:\/\/\S+)/);

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
              : 'bg-muted text-foreground rounded-bl-md'
          )}
        >
          {imageMatch ? (
            <div className="space-y-2">
              <img
                src={imageMatch[1]}
                alt="Attached image"
                className="max-w-full rounded-lg max-h-64 object-contain"
              />
            </div>
          ) : fileMatch ? (
            <a
              href={fileMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 underline"
            >
              <Paperclip className="w-4 h-4" />
              {fileMatch[1]}
            </a>
          ) : (
            <p className="text-sm whitespace-pre-wrap">{content}</p>
          )}
          <p
            className={cn(
              'text-[10px] mt-1',
              isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
            )}
          >
            {format(new Date(msg.created_at), 'h:mm a')}
          </p>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <MessageCircle className="w-8 h-8 text-primary" />
            Chat Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Talk to our support team directly for quick assistance.
          </p>
        </div>

        {/* Notification Permission Alert */}
        {notificationPermission !== 'granted' && (
          <Alert className="border-amber-500/50 bg-amber-500/10">
            <BellOff className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Enable Notifications</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              Enable notifications to receive alerts when support replies to your messages.
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-amber-500 text-amber-700 hover:bg-amber-500/20"
                onClick={requestNotificationPermission}
              >
                <Bell className="w-4 h-4 mr-2" />
                Enable Notifications
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Chat Card */}
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="border-b shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Support Team</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {isOtherTyping ? (
                    <span className="text-primary animate-pulse">Typing...</span>
                  ) : (
                    'We typically reply within a few minutes'
                  )}
                </CardDescription>
              </div>
            </div>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex-1 p-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Greeting Message */}
                  {publicSettings.chat_greeting_message && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2 bg-muted text-foreground">
                        <p className="text-sm whitespace-pre-wrap">{publicSettings.chat_greeting_message}</p>
                        <p className="text-[10px] mt-1 text-muted-foreground">Support</p>
                      </div>
                    </div>
                  )}
                  {messages.length === 0 && !publicSettings.chat_greeting_message ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground py-12">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p className="font-medium">Start a conversation</p>
                      <p className="text-sm">Send a message to begin chatting with our support team</p>
                    </div>
                  ) : (
                    <>
                      {messages.map(renderMessage)}
                      {isOtherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                            <div className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={scrollRef} />
                </div>
              )}
            </ScrollArea>
          </CardContent>

          {/* Input */}
          <div className="p-4 border-t shrink-0">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1"
                disabled={isSending}
              />
              <Button
                onClick={handleSend}
                disabled={!inputMessage.trim() || isSending}
                className="shrink-0"
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default UserChat;
