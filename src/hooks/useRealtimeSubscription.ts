import { useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { playNotificationSound } from '@/lib/notificationSound';
import { toast } from '@/hooks/use-toast';

type TableName = 'payout_requests' | 'orders' | 'wallet_transactions' | 'chat_messages' | 'profiles' | 'products' | 'storefront_products';

interface UseRealtimeOptions {
  table: TableName;
  queryKeys: string[][];
  filter?: { column: string; value: string };
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  playSound?: boolean;
  showToast?: boolean;
  toastMessages?: {
    insert?: string;
    update?: string;
    delete?: string;
  };
}

// Global connection state
let globalConnectionState: 'connected' | 'disconnected' = 'disconnected';
const connectionListeners: Set<(state: 'connected' | 'disconnected') => void> = new Set();

const notifyConnectionListeners = (state: 'connected' | 'disconnected') => {
  globalConnectionState = state;
  connectionListeners.forEach(listener => listener(state));
};

export const useRealtimeConnection = () => {
  const [isConnected, setIsConnected] = useState(globalConnectionState === 'connected');

  useEffect(() => {
    const listener = (state: 'connected' | 'disconnected') => {
      setIsConnected(state === 'connected');
    };
    connectionListeners.add(listener);
    return () => {
      connectionListeners.delete(listener);
    };
  }, []);

  return { isConnected };
};

const getToastMessage = (table: TableName, event: string, customMessages?: UseRealtimeOptions['toastMessages']): { title: string; description: string } | null => {
  const tableLabels: Record<TableName, string> = {
    payout_requests: 'Payout',
    orders: 'Order',
    wallet_transactions: 'Transaction',
    chat_messages: 'Message',
    profiles: 'Profile',
    products: 'Product',
    storefront_products: 'Storefront Product',
  };

  const label = tableLabels[table];

  if (event === 'INSERT') {
    return {
      title: customMessages?.insert || `New ${label}`,
      description: `A new ${label.toLowerCase()} has been created.`,
    };
  } else if (event === 'UPDATE') {
    return {
      title: customMessages?.update || `${label} Updated`,
      description: `A ${label.toLowerCase()} has been updated.`,
    };
  } else if (event === 'DELETE') {
    return {
      title: customMessages?.delete || `${label} Removed`,
      description: `A ${label.toLowerCase()} has been removed.`,
    };
  }
  return null;
};

export const useRealtimeSubscription = ({
  table,
  queryKeys,
  filter,
  onInsert,
  onUpdate,
  onDelete,
  playSound = false,
  showToast = false,
  toastMessages,
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

          // Show toast notification if enabled
          if (showToast) {
            const toastContent = getToastMessage(table, payload.eventType, toastMessages);
            if (toastContent) {
              toast({
                title: toastContent.title,
                description: toastContent.description,
              });
            }
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
        if (status === 'SUBSCRIBED') {
          notifyConnectionListeners('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          notifyConnectionListeners('disconnected');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, table, JSON.stringify(filter), JSON.stringify(queryKeys), playSound, showToast]);
};

// Hook for admin to listen to all payout changes
export const usePayoutRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['admin-payout-requests'], ['admin-affiliate-wallets']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Payout Request',
      update: 'Payout Status Updated',
    },
  });
};

// Hook for user to listen to their payout changes
export const usePayoutRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'payout_requests',
    queryKeys: [['user-payout-requests'], ['user-profile']],
    filter: userId ? { column: 'user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      update: 'Your payout status has been updated',
    },
  });
};

// Hook for admin to listen to all order changes
export const useOrderRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['admin-orders'], ['admin-dashboard']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Order Received',
      update: 'Order Status Updated',
    },
  });
};

// Hook for user to listen to their order changes
export const useOrderRealtimeUser = (userId?: string) => {
  useRealtimeSubscription({
    table: 'orders',
    queryKeys: [['user-orders'], ['user-dashboard']],
    filter: userId ? { column: 'affiliate_user_id', value: userId } : undefined,
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Order Received',
      update: 'Your order status has been updated',
    },
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
    showToast: true,
    toastMessages: {
      insert: 'New Message Received',
    },
  });
};

// Hook for admin to listen to all chat messages
export const useChatRealtimeAdmin = () => {
  useRealtimeSubscription({
    table: 'chat_messages',
    queryKeys: [['admin-chat-messages'], ['admin-chat-users']],
    playSound: true,
    showToast: true,
    toastMessages: {
      insert: 'New Message Received',
    },
  });
};
