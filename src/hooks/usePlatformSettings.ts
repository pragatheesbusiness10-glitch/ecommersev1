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
  // Branding settings
  site_name: string;
  site_logo_url: string;
  landing_page_enabled: boolean;
  landing_page_title: string;
  landing_page_subtitle: string;
  // Payment gateway settings
  payment_gateway_razorpay_enabled: boolean;
  payment_gateway_razorpay_key_id: string;
  payment_gateway_razorpay_key_secret: string;
  payment_gateway_stripe_enabled: boolean;
  payment_gateway_stripe_publishable_key: string;
  payment_gateway_stripe_secret_key: string;
  payment_gateway_payu_enabled: boolean;
  payment_gateway_payu_merchant_key: string;
  payment_gateway_payu_merchant_salt: string;
  payment_gateway_phonepe_enabled: boolean;
  payment_gateway_phonepe_merchant_id: string;
  payment_gateway_phonepe_salt_key: string;
  payment_gateway_phonepe_salt_index: string;
  payment_gateway_paytm_enabled: boolean;
  payment_gateway_paytm_merchant_id: string;
  payment_gateway_paytm_merchant_key: string;
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
    // Branding defaults
    site_name: 'Affiliate Platform',
    site_logo_url: '',
    landing_page_enabled: true,
    landing_page_title: 'Welcome to Our Platform',
    landing_page_subtitle: 'Join our affiliate network and start earning today',
    // Payment gateway defaults
    payment_gateway_razorpay_enabled: false,
    payment_gateway_razorpay_key_id: '',
    payment_gateway_razorpay_key_secret: '',
    payment_gateway_stripe_enabled: false,
    payment_gateway_stripe_publishable_key: '',
    payment_gateway_stripe_secret_key: '',
    payment_gateway_payu_enabled: false,
    payment_gateway_payu_merchant_key: '',
    payment_gateway_payu_merchant_salt: '',
    payment_gateway_phonepe_enabled: false,
    payment_gateway_phonepe_merchant_id: '',
    payment_gateway_phonepe_salt_key: '',
    payment_gateway_phonepe_salt_index: '',
    payment_gateway_paytm_enabled: false,
    payment_gateway_paytm_merchant_id: '',
    payment_gateway_paytm_merchant_key: '',
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
      // Branding settings
      case 'site_name':
        settingsMap.site_name = setting.value || 'Affiliate Platform';
        break;
      case 'site_logo_url':
        settingsMap.site_logo_url = setting.value || '';
        break;
      case 'landing_page_enabled':
        settingsMap.landing_page_enabled = setting.value !== 'false';
        break;
      case 'landing_page_title':
        settingsMap.landing_page_title = setting.value || 'Welcome to Our Platform';
        break;
      case 'landing_page_subtitle':
        settingsMap.landing_page_subtitle = setting.value || 'Join our affiliate network and start earning today';
        break;
      // Payment gateway settings
      case 'payment_gateway_razorpay_enabled':
        settingsMap.payment_gateway_razorpay_enabled = setting.value === 'true';
        break;
      case 'payment_gateway_razorpay_key_id':
        settingsMap.payment_gateway_razorpay_key_id = setting.value || '';
        break;
      case 'payment_gateway_razorpay_key_secret':
        settingsMap.payment_gateway_razorpay_key_secret = setting.value || '';
        break;
      case 'payment_gateway_stripe_enabled':
        settingsMap.payment_gateway_stripe_enabled = setting.value === 'true';
        break;
      case 'payment_gateway_stripe_publishable_key':
        settingsMap.payment_gateway_stripe_publishable_key = setting.value || '';
        break;
      case 'payment_gateway_stripe_secret_key':
        settingsMap.payment_gateway_stripe_secret_key = setting.value || '';
        break;
      case 'payment_gateway_payu_enabled':
        settingsMap.payment_gateway_payu_enabled = setting.value === 'true';
        break;
      case 'payment_gateway_payu_merchant_key':
        settingsMap.payment_gateway_payu_merchant_key = setting.value || '';
        break;
      case 'payment_gateway_payu_merchant_salt':
        settingsMap.payment_gateway_payu_merchant_salt = setting.value || '';
        break;
      case 'payment_gateway_phonepe_enabled':
        settingsMap.payment_gateway_phonepe_enabled = setting.value === 'true';
        break;
      case 'payment_gateway_phonepe_merchant_id':
        settingsMap.payment_gateway_phonepe_merchant_id = setting.value || '';
        break;
      case 'payment_gateway_phonepe_salt_key':
        settingsMap.payment_gateway_phonepe_salt_key = setting.value || '';
        break;
      case 'payment_gateway_phonepe_salt_index':
        settingsMap.payment_gateway_phonepe_salt_index = setting.value || '';
        break;
      case 'payment_gateway_paytm_enabled':
        settingsMap.payment_gateway_paytm_enabled = setting.value === 'true';
        break;
      case 'payment_gateway_paytm_merchant_id':
        settingsMap.payment_gateway_paytm_merchant_id = setting.value || '';
        break;
      case 'payment_gateway_paytm_merchant_key':
        settingsMap.payment_gateway_paytm_merchant_key = setting.value || '';
        break;
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

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
