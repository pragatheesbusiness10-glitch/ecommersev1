import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';

type TableName = 'payout_requests' | 'orders' | 'wallet_transactions' | 'chat_messages' | 'profiles' | 'products' | 'storefront_products';

interface UseRealtimeOptions {
  table: TableName;
  queryKeys: string[][];
  filter?: { column: string; value: string };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  playSound?: boolean;
}

export const useRealtimeSubscription = ({
  table,
  queryKeys,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  playSound = false,
}: UseRealtimeOptions) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channelName = filter 
      ? `realtime-${table}-${filter.column}-${filter.value}`
      : `realtime-${table}-all`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
          ...(filter && { filter: `${filter.column}=eq.${filter.value}` }),
        },
        (payload) => {
          console.log(`Realtime ${payload.eventType} on ${table}:`, payload);
          
          // Invalidate all related queries
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: key });
          });

          // Play notification sound if enabled
          if (playSound && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
            playNotificationSound();
          }

          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription to ${table}: ${status}`);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, JSON.stringify(filter), JSON.stringify(queryKeys), playSound]);
};

// Hook for admin to listen to all payout changes
export const usePayoutRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['admin-payout-requests'], ['admin-affiliate-wallets']],
    playSound: true,
  });
};

// Hook for user to listen to their payout changes
export const usePayoutRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['user-payout-requests'], ['user-profile']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
  });
};

// Hook for admin to listen to all order changes
export const useOrderRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['admin-orders'], ['admin-dashboard']],
    playSound: true,
  });
};

// Hook for user to listen to their order changes
export const useOrderRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['user-orders'], ['user-dashboard']],
    filter: userId ? { column: 'affiliate_user_id', value: userId } : undefined,
    playSound: true,
  });
};

// Hook for user to listen to wallet transaction changes
export const useWalletRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'wallet_transactions',
    queryKeys: [['wallet-transactions'], ['user-profile']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
  });
};

// Hook for profile updates (wallet balance, etc.)
export const useProfileRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'profiles',
    queryKeys: [['user-profile'], ['user-dashboard']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
  });
};

// Hook for admin to listen to all profile changes
export const useProfileRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'profiles',
    queryKeys: [['admin-users'], ['admin-dashboard'], ['admin-affiliate-wallets']],
  });
};

// Hook for product changes
export const useProductRealtime = () => {
  useRealtimeSubscription({
    table: 'products',
    queryKeys: [['products'], ['admin-products']],
  });
};

// Hook for storefront product changes
export const useStorefrontProductRealtime = (userId?: string) => {
  useRealtimeSubscription({
    table: 'storefront_products',
    queryKeys: [['storefront-products'], ['user-products']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
  });
};

// Hook for chat message changes
export const useChatRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'chat_messages',
    queryKeys: [['chat-messages']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
  });
};

// Hook for admin to listen to all chat messages
export const useChatRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'chat_messages',
    queryKeys: [['admin-chat-messages'], ['admin-chat-users']],
    playSound: true,
  });
};
