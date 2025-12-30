import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import type { ChatMessage } from './useChat';

export interface ChatConversation {
  user_id: string;
  user_name: string;
  user_email: string;
  last_message: string;
  last_message_at: string;
  unread_count: number;
}

export const useAdminChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all conversations (grouped by user)
  const { data: conversations = [], isLoading: isLoadingConversations } = useQuery({
    queryKey: ['admin-chat-conversations'],
    queryFn: async () => {
      // Get all messages grouped by user
      const { data: messages, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      // Get unique user IDs
      const userIds = [...new Set(messages.map((m) => m.user_id))];

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      // Group messages by user
      const conversationsMap = new Map<string, ChatConversation>();

      for (const msg of messages) {
        if (!conversationsMap.has(msg.user_id)) {
          const profile = profilesMap.get(msg.user_id);
          conversationsMap.set(msg.user_id, {
            user_id: msg.user_id,
            user_name: profile?.name || 'Unknown User',
            user_email: profile?.email || '',
            last_message: msg.message,
            last_message_at: msg.created_at,
            unread_count: msg.sender_role === 'user' && !msg.is_read ? 1 : 0,
          });
        } else if (msg.sender_role === 'user' && !msg.is_read) {
          const conv = conversationsMap.get(msg.user_id)!;
          conv.unread_count++;
        }
      }

      return Array.from(conversationsMap.values()).sort(
        (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
      );
    },
  });

  // Fetch messages for a specific user
  const fetchUserMessages = async (userId: string): Promise<ChatMessage[]> => {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as ChatMessage[];
  };

  // Send message as admin
  const sendMessageMutation = useMutation({
    mutationFn: async ({ userId, message }: { userId: string; message: string }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: userId,
          sender_role: 'admin',
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark user messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('sender_role', 'user')
        .eq('is_read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
    },
  });

  // Realtime subscription for new messages with notification sound
  useEffect(() => {
    // Create audio for notification sound
    const notificationSound = new Audio('/notification.mp3');
    notificationSound.volume = 0.5;

    const channel = supabase
      .channel('admin-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['admin-chat-conversations'] });
          queryClient.invalidateQueries({ queryKey: ['admin-chat-messages'] });

          // Play sound and show browser notification for user messages to admin
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_role === 'user') {
            // Play notification sound
            notificationSound.play().catch(() => {});
            
            // Show browser push notification
            if (Notification.permission === 'granted') {
              new Notification('New Support Message', {
                body: newMessage.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: 'admin-chat-notification',
              });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }
        }
      )
      .subscribe();

    // Request notification permission on mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    isLoadingConversations,
    totalUnread,
    fetchUserMessages,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
  };
};
