import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';

export interface ChatMessage {
  id: string;
  user_id: string;
  sender_role: 'user' | 'admin';
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useChat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['chat-messages', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as ChatMessage[];
    },
    enabled: !!user?.id,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          sender_role: 'user',
          message,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to send message',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Mark messages as read
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('chat_messages')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('sender_role', 'admin')
        .eq('is_read', false);

      if (error) throw error;
    },
  });

  // Realtime subscription with notification sound
  useEffect(() => {
    if (!user?.id) return;

    // Create audio for notification sound
    const notificationSound = new Audio('/notification.mp3');
    notificationSound.volume = 0.5;

    const channel = supabase
      .channel('user-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['chat-messages'] });
          
          // Play sound and show browser notification for admin messages
          const newMessage = payload.new as ChatMessage;
          if (newMessage.sender_role === 'admin') {
            // Play notification sound
            notificationSound.play().catch(() => {});
            
            // Show browser push notification
            if (Notification.permission === 'granted') {
              new Notification('Support Reply', {
                body: newMessage.message.substring(0, 100),
                icon: '/favicon.ico',
                tag: 'chat-notification',
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
  }, [user?.id, queryClient]);

  const unreadCount = messages.filter(
    (m) => m.sender_role === 'admin' && !m.is_read
  ).length;

  return {
    messages,
    isLoading,
    unreadCount,
    sendMessage: sendMessageMutation.mutate,
    isSending: sendMessageMutation.isPending,
    markAsRead: markAsReadMutation.mutate,
  };
};
