import React, { useState, useRef, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAdminChat, type ChatConversation } from '@/hooks/useAdminChat';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  Search,
  User,
  ArrowLeft,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { ChatMessage } from '@/hooks/useChat';
import { supabase } from '@/integrations/supabase/client';
import { useChatRealtimeAdmin } from '@/hooks/useRealtimeSubscription';

interface UserProfile {
  user_id: string;
  name: string;
  email: string;
}

const AdminChat: React.FC = () => {
  const queryClient = useQueryClient();
  const {
    conversations,
    isLoadingConversations,
    fetchUserMessages,
    sendMessage,
    isSending,
    markAsRead,
  } = useAdminChat();

  // Enable real-time updates
  useChatRealtimeAdmin();

  const [selectedConversation, setSelectedConversation] = useState<ChatConversation | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isNewConversationOpen, setIsNewConversationOpen] = useState(false);
  const [newConversationSearch, setNewConversationSearch] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch all users for new conversation dialog
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-chat'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .order('name');
      
      if (error) throw error;
      return data as UserProfile[];
    },
  });

  // Filter users who don't have existing conversations
  const existingUserIds = new Set(conversations.map(c => c.user_id));
  const availableUsers = allUsers.filter(
    u => !existingUserIds.has(u.user_id) &&
      (u.name.toLowerCase().includes(newConversationSearch.toLowerCase()) ||
       u.email.toLowerCase().includes(newConversationSearch.toLowerCase()))
  );

  // Typing indicator for the selected conversation
  const { isOtherTyping, typingUserName, setTyping } = useTypingIndicator(selectedConversation?.user_id);

  // Fetch messages for selected user
  const { data: messages = [], isLoading: isLoadingMessages } = useQuery({
    queryKey: ['admin-chat-messages', selectedConversation?.user_id],
    queryFn: () => fetchUserMessages(selectedConversation!.user_id),
    enabled: !!selectedConversation?.user_id,
  });

  const filteredConversations = conversations.filter(
    (c) =>
      c.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user_email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectConversation = (conv: ChatConversation) => {
    setSelectedConversation(conv);
    if (conv.unread_count > 0) {
      markAsRead(conv.user_id);
    }
  };

  const handleStartNewConversation = (user: UserProfile) => {
    // Create a temporary conversation object
    const newConv: ChatConversation = {
      user_id: user.user_id,
      user_name: user.name,
      user_email: user.email,
      last_message: '',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    };
    setSelectedConversation(newConv);
    setIsNewConversationOpen(false);
    setNewConversationSearch('');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputMessage(e.target.value);
    setTyping(e.target.value.length > 0);
  };

  const handleSend = () => {
    if (inputMessage.trim() && selectedConversation) {
      sendMessage({ userId: selectedConversation.user_id, message: inputMessage.trim() });
      setInputMessage('');
      setTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Refetch messages when new ones arrive
  useEffect(() => {
    if (selectedConversation) {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages', selectedConversation.user_id] });
    }
  }, [conversations, selectedConversation, queryClient]);

  if (isLoadingConversations) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-4 h-[calc(100vh-200px)]">
            <Skeleton className="w-80 h-full rounded-xl" />
            <Skeleton className="flex-1 h-full rounded-xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <MessageCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Support Chat</h1>
            <p className="text-muted-foreground">Manage user conversations</p>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex gap-4 h-[calc(100vh-220px)]">
          {/* Conversations List */}
          <div className={cn(
            "w-80 border rounded-xl flex flex-col bg-card",
            selectedConversation && "hidden md:flex"
          )}>
            {/* Search and New Conversation */}
            <div className="p-3 border-b space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Dialog open={isNewConversationOpen} onOpenChange={setIsNewConversationOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full gap-2">
                    <Plus className="w-4 h-4" />
                    New Conversation
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                    <DialogDescription>
                      Select a user to start a conversation with
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        value={newConversationSearch}
                        onChange={(e) => setNewConversationSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <ScrollArea className="h-[300px]">
                      {availableUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                          <User className="w-10 h-10 mb-2 opacity-50" />
                          <p className="text-sm">No users available</p>
                          <p className="text-xs">All users already have conversations</p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          {availableUsers.map((user) => (
                            <button
                              key={user.user_id}
                              onClick={() => handleStartNewConversation(user)}
                              className="w-full p-3 text-left rounded-lg hover:bg-accent/50 transition-colors flex items-center gap-3"
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{user.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Conversations */}
            <ScrollArea className="flex-1">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
                  <MessageCircle className="w-10 h-10 mb-2 opacity-50" />
                  <p className="text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <button
                      key={conv.user_id}
                      onClick={() => handleSelectConversation(conv)}
                      className={cn(
                        "w-full p-4 text-left hover:bg-accent/50 transition-colors",
                        selectedConversation?.user_id === conv.user_id && "bg-accent"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-medium truncate">{conv.user_name}</p>
                            {conv.unread_count > 0 && (
                              <Badge className="bg-red-500 text-white text-xs px-1.5">
                                {conv.unread_count}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {conv.user_email}
                          </p>
                          <p className="text-sm text-muted-foreground truncate mt-1">
                            {conv.last_message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(conv.last_message_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={cn(
            "flex-1 border rounded-xl flex flex-col bg-card",
            !selectedConversation && "hidden md:flex"
          )}>
            {!selectedConversation ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                <MessageCircle className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a user to start chatting</p>
              </div>
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center gap-3 p-4 border-b">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedConversation.user_name}</p>
                    <p className="text-xs text-muted-foreground">{selectedConversation.user_email}</p>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
                      <p className="text-sm">No messages in this conversation</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {messages.map((msg: ChatMessage) => (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-lg px-4 py-2",
                              msg.sender_role === 'admin'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            )}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                            <p
                              className={cn(
                                "text-[10px] mt-1",
                                msg.sender_role === 'admin'
                                  ? 'text-primary-foreground/70'
                                  : 'text-muted-foreground'
                              )}
                            >
                              {format(new Date(msg.created_at), 'MMM d, h:mm a')}
                            </p>
                          </div>
                        </div>
                      ))}
                      {/* Typing indicator */}
                      {isOtherTyping && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">{typingUserName || 'User'} is typing</span>
                              <span className="flex gap-0.5">
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </ScrollArea>

                {/* Input */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={inputMessage}
                      onChange={handleInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="Type a reply..."
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!inputMessage.trim() || isSending}
                    >
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminChat;
