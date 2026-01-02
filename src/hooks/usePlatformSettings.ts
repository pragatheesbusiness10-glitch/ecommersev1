import { useMemo } from 'react';
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

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
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
  // Video settings
  landing_video_url: string;
  user_dashboard_video_url: string;
  // FAQ settings
  faq_items: FAQItem[];
  // Payment gateway settings - PayPal
  payment_gateway_paypal_enabled: boolean;
  payment_gateway_paypal_client_id: string;
  payment_gateway_paypal_client_secret: string;
  payment_gateway_paypal_mode: string;
  // Payment gateway settings - Stripe
  payment_gateway_stripe_enabled: boolean;
  payment_gateway_stripe_publishable_key: string;
  payment_gateway_stripe_secret_key: string;
  // Payment gateway settings - Wire Transfer
  payment_gateway_wire_enabled: boolean;
  payment_gateway_wire_bank_name: string;
  payment_gateway_wire_account_name: string;
  payment_gateway_wire_account_number: string;
  payment_gateway_wire_routing_number: string;
  payment_gateway_wire_iban: string;
  // USD Wallet ID for user payments
  usd_wallet_id: string;
  // Payment method settings
  payment_method_upi_enabled: boolean;
  payment_method_upi_message: string;
  payment_method_card_enabled: boolean;
  payment_method_card_message: string;
  payment_method_bank_enabled: boolean;
  payment_method_bank_message: string;
  payment_method_usd_wallet_enabled: boolean;
  payment_method_usd_wallet_message: string;
  // Level-based commission rates
  commission_rate_bronze: number;
  commission_rate_silver: number;
  commission_rate_gold: number;
  // Level order thresholds (how many completed orders to reach each level)
  level_threshold_silver: number;
  level_threshold_gold: number;
  // Auto-payout settings
  auto_payout_enabled: boolean;
  auto_payout_threshold: number;
  auto_payout_schedule: 'daily' | 'weekly' | 'monthly';
  // Default markup percentage for product pricing
  default_markup_percentage: number;
  // Order failed error message
  order_failed_message: string;
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

  // Convert array to map for easy access (memoized to avoid re-render loops)
  const settingsMap = useMemo<SettingsMap>(() => {
    const map: SettingsMap = {
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
      // Video settings
      landing_video_url: '',
      user_dashboard_video_url: '',
      // FAQ settings
      faq_items: [],
      // Payment gateway defaults - PayPal
      payment_gateway_paypal_enabled: false,
      payment_gateway_paypal_client_id: '',
      payment_gateway_paypal_client_secret: '',
      payment_gateway_paypal_mode: 'sandbox',
      // Payment gateway defaults - Stripe
      payment_gateway_stripe_enabled: false,
      payment_gateway_stripe_publishable_key: '',
      payment_gateway_stripe_secret_key: '',
      // Payment gateway defaults - Wire Transfer
      payment_gateway_wire_enabled: false,
      payment_gateway_wire_bank_name: '',
      payment_gateway_wire_account_name: '',
      payment_gateway_wire_account_number: '',
      payment_gateway_wire_routing_number: '',
      payment_gateway_wire_iban: '',
      // USD Wallet ID
      usd_wallet_id: '',
      // Payment method settings
      payment_method_upi_enabled: false,
      payment_method_upi_message: 'UPI payment is not available for your account.',
      payment_method_card_enabled: false,
      payment_method_card_message: 'Card payments are disabled. Please contact admin.',
      payment_method_bank_enabled: false,
      payment_method_bank_message: 'Bank transfer is not supported for this user.',
      payment_method_usd_wallet_enabled: true,
      payment_method_usd_wallet_message: 'Send USD to the wallet ID above and notify admin for fund credit.',
      // Level-based commission rates
      commission_rate_bronze: 5,
      commission_rate_silver: 7,
      commission_rate_gold: 10,
      // Level order thresholds
      level_threshold_silver: 10,
      level_threshold_gold: 50,
      // Auto-payout settings
      auto_payout_enabled: false,
      auto_payout_threshold: 1000,
      auto_payout_schedule: 'weekly',
      // Default markup percentage
      default_markup_percentage: 30,
      // Order failed error message
      order_failed_message: 'Order not available in India or you are using VPN, fake order.',
    };

    settingsQuery.data?.forEach((setting) => {
      switch (setting.key) {
        case 'commission_type':
          map.commission_type = setting.value as 'percentage' | 'fixed';
          break;
        case 'commission_rate':
          map.commission_rate = parseFloat(setting.value) || 100;
          break;
        case 'min_payout_amount':
          map.min_payout_amount = parseFloat(setting.value) || 50;
          break;
        case 'auto_credit_on_complete':
          map.auto_credit_on_complete = setting.value === 'true';
          break;
        case 'auto_user_approval':
          map.auto_user_approval = setting.value === 'true';
          break;
        case 'default_currency':
          map.default_currency = setting.value || 'USD';
          break;
        case 'display_currencies':
          try {
            map.display_currencies = JSON.parse(setting.value);
          } catch {
            map.display_currencies = ['USD'];
          }
          break;
        case 'resend_api_key':
          map.resend_api_key = setting.value || '';
          break;
        case 'email_notifications_enabled':
          map.email_notifications_enabled = setting.value === 'true';
          break;
        case 'admin_email':
          map.admin_email = setting.value || '';
          break;
        // Branding settings
        case 'site_name':
          map.site_name = setting.value || 'Affiliate Platform';
          break;
        case 'site_logo_url':
          map.site_logo_url = setting.value || '';
          break;
        case 'landing_page_enabled':
          map.landing_page_enabled = setting.value !== 'false';
          break;
        case 'landing_page_title':
          map.landing_page_title = setting.value || 'Welcome to Our Platform';
          break;
        case 'landing_page_subtitle':
          map.landing_page_subtitle =
            setting.value || 'Join our affiliate network and start earning today';
          break;
        case 'landing_video_url':
          map.landing_video_url = setting.value || '';
          break;
        case 'user_dashboard_video_url':
          map.user_dashboard_video_url = setting.value || '';
          break;
        case 'faq_items':
          try {
            map.faq_items = JSON.parse(setting.value) || [];
          } catch {
            map.faq_items = [];
          }
          break;
        // Payment gateway settings - PayPal
        case 'payment_gateway_paypal_enabled':
          map.payment_gateway_paypal_enabled = setting.value === 'true';
          break;
        case 'payment_gateway_paypal_client_id':
          map.payment_gateway_paypal_client_id = setting.value || '';
          break;
        case 'payment_gateway_paypal_client_secret':
          map.payment_gateway_paypal_client_secret = setting.value || '';
          break;
        case 'payment_gateway_paypal_mode':
          map.payment_gateway_paypal_mode = setting.value || 'sandbox';
          break;
        // Payment gateway settings - Stripe
        case 'payment_gateway_stripe_enabled':
          map.payment_gateway_stripe_enabled = setting.value === 'true';
          break;
        case 'payment_gateway_stripe_publishable_key':
          map.payment_gateway_stripe_publishable_key = setting.value || '';
          break;
        case 'payment_gateway_stripe_secret_key':
          map.payment_gateway_stripe_secret_key = setting.value || '';
          break;
        // Payment gateway settings - Wire Transfer
        case 'payment_gateway_wire_enabled':
          map.payment_gateway_wire_enabled = setting.value === 'true';
          break;
        case 'payment_gateway_wire_bank_name':
          map.payment_gateway_wire_bank_name = setting.value || '';
          break;
        case 'payment_gateway_wire_account_name':
          map.payment_gateway_wire_account_name = setting.value || '';
          break;
        case 'payment_gateway_wire_account_number':
          map.payment_gateway_wire_account_number = setting.value || '';
          break;
        case 'payment_gateway_wire_routing_number':
          map.payment_gateway_wire_routing_number = setting.value || '';
          break;
        case 'payment_gateway_wire_iban':
          map.payment_gateway_wire_iban = setting.value || '';
          break;
        case 'usd_wallet_id':
          map.usd_wallet_id = setting.value || '';
          break;
        // Payment method settings
        case 'payment_method_upi_enabled':
          map.payment_method_upi_enabled = setting.value === 'true';
          break;
        case 'payment_method_upi_message':
          map.payment_method_upi_message = setting.value || 'UPI payment is not available for your account.';
          break;
        case 'payment_method_card_enabled':
          map.payment_method_card_enabled = setting.value === 'true';
          break;
        case 'payment_method_card_message':
          map.payment_method_card_message = setting.value || 'Card payments are disabled. Please contact admin.';
          break;
        case 'payment_method_bank_enabled':
          map.payment_method_bank_enabled = setting.value === 'true';
          break;
        case 'payment_method_bank_message':
          map.payment_method_bank_message = setting.value || 'Bank transfer is not supported for this user.';
          break;
        case 'payment_method_usd_wallet_enabled':
          map.payment_method_usd_wallet_enabled = setting.value === 'true';
          break;
        case 'payment_method_usd_wallet_message':
          map.payment_method_usd_wallet_message = setting.value || 'Send USD to the wallet ID above and notify admin for fund credit.';
          break;
        case 'commission_rate_bronze':
          map.commission_rate_bronze = parseFloat(setting.value) || 5;
          break;
        case 'commission_rate_silver':
          map.commission_rate_silver = parseFloat(setting.value) || 7;
          break;
        case 'commission_rate_gold':
          map.commission_rate_gold = parseFloat(setting.value) || 10;
          break;
        case 'level_threshold_silver':
          map.level_threshold_silver = parseInt(setting.value) || 10;
          break;
        case 'level_threshold_gold':
          map.level_threshold_gold = parseInt(setting.value) || 50;
          break;
        case 'auto_payout_enabled':
          map.auto_payout_enabled = setting.value === 'true';
          break;
        case 'auto_payout_threshold':
          map.auto_payout_threshold = parseFloat(setting.value) || 1000;
          break;
        case 'auto_payout_schedule':
          map.auto_payout_schedule =
            (setting.value as 'daily' | 'weekly' | 'monthly') || 'weekly';
          break;
        case 'default_markup_percentage':
          map.default_markup_percentage = parseFloat(setting.value) || 30;
          break;
        case 'order_failed_message':
          map.order_failed_message = setting.value || 'Order not available in India or you are using VPN, fake order.';
          break;
      }
    });

    return map;
  }, [settingsQuery.data]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value, oldValue }: { key: string; value: string; oldValue?: string }) => {
      // Use upsert to handle both insert and update cases
      const { error } = await supabase
        .from('platform_settings')
        .upsert(
          { key, value, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (error) throw error;

      // Create audit log for setting change
      if (user?.id) {
        await supabase.rpc('create_audit_log', {
          _action_type: 'setting_changed',
          _entity_type: 'platform_settings',
          _entity_id: null,
          _user_id: null,
          _admin_id: user.id,
          _old_value: oldValue !== undefined ? { [key]: oldValue } : null,
          _new_value: { [key]: value },
          _reason: `Platform setting "${key}" updated`,
        });
      }
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
    updateSettingAsync: updateSettingMutation.mutateAsync,
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
