import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

type UserLevel = 'bronze' | 'silver' | 'gold';

// Calculate commission based on user level
const calculateLevelBasedCommission = (
  sellingPrice: number,
  basePrice: number,
  quantity: number,
  userLevel: UserLevel,
  commissionRateBronze: number,
  commissionRateSilver: number,
  commissionRateGold: number
): number => {
  const profit = (sellingPrice - basePrice) * quantity;
  
  // Get commission rate based on user level
  let commissionRate: number;
  switch (userLevel) {
    case 'gold':
      commissionRate = commissionRateGold;
      break;
    case 'silver':
      commissionRate = commissionRateSilver;
      break;
    case 'bronze':
    default:
      commissionRate = commissionRateBronze;
      break;
  }
  
  return profit * (commissionRate / 100);
};
export interface AdminOrder {
  id: string;
  order_number: string;
  storefront_product_id: string;
  affiliate_user_id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  customer_address: string;
  quantity: number;
  selling_price: number;
  base_price: number;
  status: 'pending_payment' | 'paid_by_user' | 'processing' | 'completed' | 'cancelled';
  created_at: string;
  paid_at: string | null;
  completed_at: string | null;
  payment_link: string | null;
  payment_link_updated_at: string | null;
  payment_link_updated_by: string | null;
  payment_link_clicked_at: string | null;
  product: {
    id: string;
    name: string;
    image_url: string | null;
    base_price: number;
  } | null;
  affiliate: {
    id: string;
    name: string;
    email: string;
    storefront_name: string | null;
  } | null;
}

export const useAdminOrders = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { settingsMap } = usePlatformSettings();

  const ordersQuery = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          storefront_products!inner(
            product_id,
            user_id,
            products!inner(
              id,
              name,
              image_url,
              base_price
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching admin orders:', error);
        throw error;
      }

      // Fetch affiliate profiles for each order
      const affiliateIds = [...new Set((orders || []).map(o => o.affiliate_user_id))];
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', affiliateIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (orders || []).map((order): AdminOrder => {
        const affiliate = profileMap.get(order.affiliate_user_id);
        return {
          id: order.id,
          order_number: order.order_number,
          storefront_product_id: order.storefront_product_id,
          affiliate_user_id: order.affiliate_user_id,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          customer_phone: order.customer_phone,
          customer_address: order.customer_address,
          quantity: order.quantity,
          selling_price: Number(order.selling_price),
          base_price: Number(order.base_price),
          status: order.status,
          created_at: order.created_at,
          paid_at: order.paid_at,
          completed_at: order.completed_at,
          payment_link: order.payment_link,
          payment_link_updated_at: order.payment_link_updated_at,
          payment_link_updated_by: order.payment_link_updated_by,
          payment_link_clicked_at: order.payment_link_clicked_at,
          product: order.storefront_products?.products ? {
            id: order.storefront_products.products.id,
            name: order.storefront_products.products.name,
            image_url: order.storefront_products.products.image_url,
            base_price: Number(order.storefront_products.products.base_price),
          } : null,
          affiliate: affiliate ? {
            id: affiliate.id,
            name: affiliate.name,
            email: affiliate.email,
            storefront_name: affiliate.storefront_name,
          } : null,
        };
      });
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status, order }: { orderId: string; status: AdminOrder['status']; order?: AdminOrder }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      // Auto-credit commission to affiliate wallet when order is completed
      if (status === 'completed' && settingsMap.auto_credit_on_complete && order) {
        // Fetch user's level to calculate level-based commission
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('wallet_balance, user_level')
          .eq('user_id', order.affiliate_user_id)
          .single();

        if (!profileError && profile) {
          const userLevel = (profile as any).user_level as UserLevel || 'bronze';
          
          const commission = calculateLevelBasedCommission(
            order.selling_price,
            order.base_price,
            order.quantity,
            userLevel,
            settingsMap.commission_rate_bronze,
            settingsMap.commission_rate_silver,
            settingsMap.commission_rate_gold
          );

          if (commission > 0) {
            const newBalance = Number(profile.wallet_balance) + commission;

            // Update wallet balance
            await supabase
              .from('profiles')
              .update({ wallet_balance: newBalance })
              .eq('user_id', order.affiliate_user_id);

            // Create transaction record
            await supabase
              .from('wallet_transactions')
              .insert({
                user_id: order.affiliate_user_id,
                amount: commission,
                type: 'commission',
                description: `Commission for order ${order.order_number} (${userLevel} level: ${userLevel === 'gold' ? settingsMap.commission_rate_gold : userLevel === 'silver' ? settingsMap.commission_rate_silver : settingsMap.commission_rate_bronze}%)`,
                order_id: orderId,
              });
          }

          return { commissioned: true, amount: commission, level: userLevel };
        }
      }

      return { commissioned: false };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-wallets'] });
      
      if (result.commissioned && result.amount) {
        toast({
          title: 'Order Completed',
          description: `Status updated. $${result.amount.toFixed(2)} commission credited (${result.level} level).`,
        });
      } else {
        toast({
          title: 'Order Updated',
          description: `Order status changed to ${variables.status.replace(/_/g, ' ')}.`,
        });
      }
    },
    onError: (error) => {
      console.error('Error updating order status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order status.',
        variant: 'destructive',
      });
    },
  });

  const updatePaymentLinkMutation = useMutation({
    mutationFn: async ({ orderId, paymentLink }: { orderId: string; paymentLink: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_link: paymentLink,
          payment_link_updated_at: new Date().toISOString(),
          payment_link_updated_by: user?.id,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Payment Link Updated',
        description: 'The payment link has been saved successfully.',
      });
    },
    onError: (error) => {
      console.error('Error updating payment link:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment link.',
        variant: 'destructive',
      });
    },
  });

  const bulkUpdatePaymentLinkMutation = useMutation({
    mutationFn: async ({ orderIds, paymentLink }: { orderIds: string[]; paymentLink: string }) => {
      const { error } = await supabase
        .from('orders')
        .update({ 
          payment_link: paymentLink,
          payment_link_updated_at: new Date().toISOString(),
          payment_link_updated_by: user?.id,
        })
        .in('id', orderIds);

      if (error) throw error;
      return orderIds.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Payment Links Updated',
        description: `Payment link has been applied to ${count} order(s).`,
      });
    },
    onError: (error) => {
      console.error('Error updating payment links:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payment links.',
        variant: 'destructive',
      });
    },
  });

  // Create order mutation for admin
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: {
      affiliate_user_id: string;
      storefront_product_id: string;
      customer_name: string;
      customer_email: string;
      customer_phone: string;
      customer_address: string;
      quantity: number;
      selling_price: number;
      base_price: number;
      productName?: string;
    }) => {
      // Get affiliate info for notification
      const { data: affiliateProfile } = await supabase
        .from('profiles')
        .select('name, email')
        .eq('user_id', orderData.affiliate_user_id)
        .single();

      const { data, error } = await supabase
        .from('orders')
        .insert({
          affiliate_user_id: orderData.affiliate_user_id,
          storefront_product_id: orderData.storefront_product_id,
          customer_name: orderData.customer_name,
          customer_email: orderData.customer_email,
          customer_phone: orderData.customer_phone,
          customer_address: orderData.customer_address,
          quantity: orderData.quantity,
          selling_price: orderData.selling_price,
          base_price: orderData.base_price,
          order_number: '', // Will be generated by trigger
        })
        .select()
        .single();

      if (error) throw error;

      // Send notification email to affiliate
      if (affiliateProfile?.email) {
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: 'affiliate_order_created',
              userName: affiliateProfile.name,
              userEmail: affiliateProfile.email,
              orderNumber: data.order_number,
              productName: orderData.productName || 'Product',
              customerName: orderData.customer_name,
              amount: orderData.selling_price * orderData.quantity,
            },
          });
        } catch (emailError) {
          console.error('Failed to send affiliate notification:', emailError);
          // Don't fail the order creation if email fails
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order Created',
        description: 'New order has been created and affiliate has been notified.',
      });
    },
    onError: (error) => {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order.',
        variant: 'destructive',
      });
    },
  });

  const orderCounts = {
    all: ordersQuery.data?.length || 0,
    pending_payment: ordersQuery.data?.filter(o => o.status === 'pending_payment').length || 0,
    paid_by_user: ordersQuery.data?.filter(o => o.status === 'paid_by_user').length || 0,
    processing: ordersQuery.data?.filter(o => o.status === 'processing').length || 0,
    completed: ordersQuery.data?.filter(o => o.status === 'completed').length || 0,
    cancelled: ordersQuery.data?.filter(o => o.status === 'cancelled').length || 0,
  };

  return {
    orders: ordersQuery.data || [],
    orderCounts,
    isLoading: ordersQuery.isLoading,
    error: ordersQuery.error,
    refetch: ordersQuery.refetch,
    updateStatus: updateStatusMutation.mutate,
    isUpdatingStatus: updateStatusMutation.isPending,
    updatePaymentLink: updatePaymentLinkMutation.mutate,
    isUpdatingPaymentLink: updatePaymentLinkMutation.isPending,
    bulkUpdatePaymentLink: bulkUpdatePaymentLinkMutation.mutate,
    isBulkUpdatingPaymentLink: bulkUpdatePaymentLinkMutation.isPending,
    createOrder: createOrderMutation.mutate,
    isCreatingOrder: createOrderMutation.isPending,
  };
};
