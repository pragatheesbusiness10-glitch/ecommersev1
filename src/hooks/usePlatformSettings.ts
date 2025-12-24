import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface PlatformSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface SettingsMap {
  commission_type: 'percentage' | 'fixed';
  commission_rate: number;
  min_payout_amount: number;
  auto_credit_on_complete: boolean;
  auto_user_approval: boolean;
  default_currency: string;
  display_currencies: string[];
  resend_api_key: string;
  email_notifications_enabled: boolean;
  admin_email: string;
}

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  JPY: '¥',
  CNY: '¥',
  AED: 'د.إ',
  SGD: 'S$',
};

export const usePlatformSettings = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const settingsQuery = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*');

      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }

      return data as PlatformSetting[];
    },
    enabled: !!session,
  });

  // Convert array to map for easy access
  const settingsMap: SettingsMap = {
    commission_type: 'percentage',
    commission_rate: 100,
    min_payout_amount: 50,
    auto_credit_on_complete: true,
    auto_user_approval: false,
    default_currency: 'USD',
    display_currencies: ['USD', 'EUR', 'GBP', 'INR', 'AUD', 'CAD', 'JPY', 'CNY', 'AED', 'SGD'],
    resend_api_key: '',
    email_notifications_enabled: false,
    admin_email: '',
  };

  settingsQuery.data?.forEach(setting => {
    switch (setting.key) {
      case 'commission_type':
        settingsMap.commission_type = setting.value as 'percentage' | 'fixed';
        break;
      case 'commission_rate':
        settingsMap.commission_rate = parseFloat(setting.value) || 100;
        break;
      case 'min_payout_amount':
        settingsMap.min_payout_amount = parseFloat(setting.value) || 50;
        break;
      case 'auto_credit_on_complete':
        settingsMap.auto_credit_on_complete = setting.value === 'true';
        break;
      case 'auto_user_approval':
        settingsMap.auto_user_approval = setting.value === 'true';
        break;
      case 'default_currency':
        settingsMap.default_currency = setting.value || 'USD';
        break;
      case 'display_currencies':
        try {
          settingsMap.display_currencies = JSON.parse(setting.value);
        } catch {
          settingsMap.display_currencies = ['USD'];
        }
        break;
      case 'resend_api_key':
        settingsMap.resend_api_key = setting.value || '';
        break;
      case 'email_notifications_enabled':
        settingsMap.email_notifications_enabled = setting.value === 'true';
        break;
      case 'admin_email':
        settingsMap.admin_email = setting.value || '';
        break;
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const { error } = await supabase
        .from('platform_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({
        title: 'Setting Updated',
        description: 'The platform setting has been saved.',
      });
    },
    onError: (error) => {
      console.error('Error updating setting:', error);
      toast({
        title: 'Error',
        description: 'Failed to update setting.',
        variant: 'destructive',
      });
    },
  });

  return {
    settings: settingsQuery.data || [],
    settingsMap,
    isLoading: settingsQuery.isLoading,
    error: settingsQuery.error,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
  };
};

// Helper function to calculate commission
export const calculateCommission = (
  sellingPrice: number,
  basePrice: number,
  quantity: number,
  commissionType: 'percentage' | 'fixed',
  commissionRate: number
): number => {
  const profit = (sellingPrice - basePrice) * quantity;
  
  if (commissionType === 'percentage') {
    // Commission rate is percentage of profit (0-100)
    return (profit * commissionRate) / 100;
  } else {
    // Fixed commission per unit (rate is in cents)
    return (commissionRate / 100) * quantity;
  }
};

// Helper to format currency
export const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  const symbol = CURRENCY_SYMBOLS[currency] || '$';
  return `${symbol}${amount.toFixed(2)}`;
};
