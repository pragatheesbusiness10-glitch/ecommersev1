import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

export const useAdminUsers = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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
        .in('user_id', userIds)
        .order('created_at', { ascending: false });

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

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !isActive })
        .eq('user_id', userId);

      if (error) throw error;
      return !isActive;
    },
    onSuccess: (newStatus) => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      toast({
        title: newStatus ? 'Affiliate Activated' : 'Affiliate Deactivated',
        description: `The affiliate account has been ${newStatus ? 'activated' : 'deactivated'}.`,
      });
    },
    onError: (error) => {
      console.error('Error toggling status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update affiliate status.',
        variant: 'destructive',
      });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      name, 
      storefrontName, 
      storefrontSlug 
    }: { 
      userId: string; 
      name: string; 
      storefrontName: string; 
      storefrontSlug: string;
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          name,
          storefront_name: storefrontName,
          storefront_slug: storefrontSlug,
        })
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      toast({
        title: 'Affiliate Updated',
        description: 'The affiliate details have been updated.',
      });
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update affiliate details.',
        variant: 'destructive',
      });
    },
  });

  return {
    affiliates: affiliatesQuery.data || [],
    isLoading: affiliatesQuery.isLoading,
    error: affiliatesQuery.error,
    refetch: affiliatesQuery.refetch,
    toggleStatus: toggleStatusMutation.mutate,
    isTogglingStatus: toggleStatusMutation.isPending,
    updateProfile: updateProfileMutation.mutate,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
};
