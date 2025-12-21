import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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
    mutationFn: async ({ orderId, status }: { orderId: string; status: AdminOrder['status'] }) => {
      const updates: Record<string, unknown> = { status };
      
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast({
        title: 'Order Updated',
        description: `Order status changed to ${variables.status.replace(/_/g, ' ')}.`,
      });
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
  };
};
