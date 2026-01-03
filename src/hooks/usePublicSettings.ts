import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicSettings {
  storefront_greeting_message: string;
  storefront_ordering_enabled: boolean;
  storefront_ordering_disabled_message: string;
  payout_enabled: boolean;
  payout_disabled_message: string;
  chat_greeting_message: string;
}

export const usePublicSettings = () => {
  const query = useQuery({
    queryKey: ['public-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'storefront_greeting_message',
          'storefront_ordering_enabled',
          'storefront_ordering_disabled_message',
          'payout_enabled',
          'payout_disabled_message',
          'chat_greeting_message',
        ]);

      if (error) {
        console.error('Error fetching public settings:', error);
        throw error;
      }

      const settings: PublicSettings = {
        storefront_greeting_message: 'Welcome to our store! Browse our amazing products.',
        storefront_ordering_enabled: true,
        storefront_ordering_disabled_message: 'Ordering is currently disabled. Please contact the store owner for assistance.',
        payout_enabled: true,
        payout_disabled_message: 'Payout requests are currently disabled. Please contact admin for assistance.',
        chat_greeting_message: 'Hello! How can I help you today?',
      };

      data?.forEach((setting) => {
        switch (setting.key) {
          case 'storefront_greeting_message':
            settings.storefront_greeting_message = setting.value || settings.storefront_greeting_message;
            break;
          case 'storefront_ordering_enabled':
            settings.storefront_ordering_enabled = setting.value !== 'false';
            break;
          case 'storefront_ordering_disabled_message':
            settings.storefront_ordering_disabled_message = setting.value || settings.storefront_ordering_disabled_message;
            break;
          case 'payout_enabled':
            settings.payout_enabled = setting.value !== 'false';
            break;
          case 'payout_disabled_message':
            settings.payout_disabled_message = setting.value || settings.payout_disabled_message;
            break;
          case 'chat_greeting_message':
            settings.chat_greeting_message = setting.value || settings.chat_greeting_message;
            break;
        }
      });

      return settings;
    },
  });

  return {
    settings: query.data || {
      storefront_greeting_message: 'Welcome to our store! Browse our amazing products.',
      storefront_ordering_enabled: true,
      storefront_ordering_disabled_message: 'Ordering is currently disabled. Please contact the store owner for assistance.',
      payout_enabled: true,
      payout_disabled_message: 'Payout requests are currently disabled. Please contact admin for assistance.',
      chat_greeting_message: 'Hello! How can I help you today?',
    },
    isLoading: query.isLoading,
    error: query.error,
  };
};