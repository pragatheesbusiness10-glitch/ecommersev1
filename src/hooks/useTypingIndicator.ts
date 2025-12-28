import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TypingState {
  user_id: string;
  is_typing: boolean;
  timestamp: number;
}

export const useTypingIndicator = (conversationUserId?: string) => {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [typingUserName, setTypingUserName] = useState<string>('');
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastTypingRef = useRef<number>(0);

  const roomName = conversationUserId 
    ? `typing-${conversationUserId}` 
    : user?.id 
      ? `typing-${user.id}` 
      : null;

  useEffect(() => {
    if (!roomName || !user?.id) return;

    const channel = supabase.channel(roomName, {
      config: {
        presence: {
          key: user.id,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const typingUsers = Object.entries(state)
          .filter(([key, value]) => {
            const presenceData = (value as any[])[0];
            return key !== user.id && presenceData?.is_typing;
          })
          .map(([key, value]) => ({
            user_id: key,
            name: (value as any[])[0]?.name || 'Someone',
          }));

        if (typingUsers.length > 0) {
          setIsOtherTyping(true);
          setTypingUserName(typingUsers[0].name);
        } else {
          setIsOtherTyping(false);
          setTypingUserName('');
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            is_typing: false,
            name: user.role === 'admin' ? 'Admin' : user.name,
            timestamp: Date.now(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [roomName, user?.id, user?.name, user?.role]);

  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!channelRef.current || !user?.id) return;

    const now = Date.now();
    // Throttle typing updates to once per 500ms
    if (isTyping && now - lastTypingRef.current < 500) return;
    lastTypingRef.current = now;

    try {
      await channelRef.current.track({
        is_typing: isTyping,
        name: user.role === 'admin' ? 'Admin' : user.name,
        timestamp: now,
      });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          channelRef.current?.track({
            is_typing: false,
            name: user.role === 'admin' ? 'Admin' : user.name,
            timestamp: Date.now(),
          });
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating typing status:', error);
    }
  }, [user?.id, user?.name, user?.role]);

  return {
    isOtherTyping,
    typingUserName,
    setTyping,
  };
};
