import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export interface AdminStats {
  totalOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalRevenue: number;
  pendingPayments: number;
  activeAffiliates: number;
}

export interface AffiliateUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  storefront_name: string | null;
  storefront_slug: string | null;
  is_active: boolean;
  wallet_balance: number;
  created_at: string;
}

export const useAdminDashboard = () => {
  const { user, session } = useAuth();

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

  const affiliatesQuery = useQuery({
    queryKey: ['admin-affiliates'],
    queryFn: async () => {
      // First get all user roles with 'user' role
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'user');

      if (rolesError) {
        console.error('Error fetching user roles:', rolesError);
        throw rolesError;
      }

      const userIds = userRoles?.map(r => r.user_id) || [];

      if (userIds.length === 0) {
        return [];
      }

      // Then get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('user_id', userIds);

      if (profilesError) {
        console.error('Error fetching affiliate profiles:', profilesError);
        throw profilesError;
      }

      return (profiles || []).map((p): AffiliateUser => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        email: p.email,
        storefront_name: p.storefront_name,
        storefront_slug: p.storefront_slug,
        is_active: p.is_active,
        wallet_balance: Number(p.wallet_balance),
        created_at: p.created_at,
      }));
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const productsQuery = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        throw error;
      }

      return data || [];
    },
    enabled: user?.role === 'admin' && !!session,
  });

  // Calculate stats
  const stats: AdminStats = {
    totalOrders: ordersQuery.data?.length || 0,
    pendingOrders: ordersQuery.data?.filter(o => ['pending_payment', 'paid_by_user'].includes(o.status)).length || 0,
    completedOrders: ordersQuery.data?.filter(o => o.status === 'completed').length || 0,
    totalRevenue: ordersQuery.data?.reduce((sum, o) => {
      if (o.status === 'completed') {
        return sum + (o.base_price * o.quantity);
      }
      return sum;
    }, 0) || 0,
    pendingPayments: ordersQuery.data?.reduce((sum, o) => {
      if (o.status === 'pending_payment') {
        return sum + (o.base_price * o.quantity);
      }
      return sum;
    }, 0) || 0,
    activeAffiliates: affiliatesQuery.data?.filter(a => a.is_active).length || 0,
  };

  return {
    orders: ordersQuery.data || [],
    recentOrders: (ordersQuery.data || []).slice(0, 5),
    affiliates: affiliatesQuery.data || [],
    products: productsQuery.data || [],
    stats,
    isLoading: ordersQuery.isLoading || affiliatesQuery.isLoading,
    error: ordersQuery.error || affiliatesQuery.error,
    refetchOrders: ordersQuery.refetch,
    refetchAffiliates: affiliatesQuery.refetch,
  };
};
