import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

export interface AdminNotification {
  id: string;
  type: 'support_ticket' | 'kyc_submission' | 'payout_request';
  title: string;
  description: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
  is_read: boolean;
  reference_id: string;
}

export const useAdminNotifications = () => {
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const allNotifications: AdminNotification[] = [];

      // Fetch unread support tickets (chat messages from users)
      const { data: unreadMessages } = await supabase
        .from('chat_messages')
        .select('id, user_id, message, created_at')
        .eq('sender_role', 'user')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch pending KYC submissions
      const { data: pendingKYC } = await supabase
        .from('kyc_submissions')
        .select('id, user_id, first_name, last_name, submitted_at')
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(20);

      // Fetch pending payout requests
      const { data: pendingPayouts } = await supabase
        .from('payout_requests')
        .select('id, user_id, amount, created_at')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(20);

      // Get all unique user IDs
      const userIds = new Set<string>();
      unreadMessages?.forEach(m => userIds.add(m.user_id));
      pendingKYC?.forEach(k => userIds.add(k.user_id));
      pendingPayouts?.forEach(p => userIds.add(p.user_id));

      // Fetch user profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', Array.from(userIds));

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      // Process unread support messages
      unreadMessages?.forEach(msg => {
        const profile = profilesMap.get(msg.user_id);
        const isTicket = msg.message.includes('[SUPPORT TICKET]');
        allNotifications.push({
          id: msg.id,
          type: 'support_ticket',
          title: isTicket ? 'New Support Ticket' : 'New Message',
          description: msg.message.substring(0, 100) + (msg.message.length > 100 ? '...' : ''),
          created_at: msg.created_at,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          is_read: false,
          reference_id: msg.user_id,
        });
      });

      // Process pending KYC
      pendingKYC?.forEach(kyc => {
        const profile = profilesMap.get(kyc.user_id);
        allNotifications.push({
          id: kyc.id,
          type: 'kyc_submission',
          title: 'KYC Verification Pending',
          description: `${kyc.first_name} ${kyc.last_name} submitted KYC documents`,
          created_at: kyc.submitted_at,
          user_name: profile?.name || `${kyc.first_name} ${kyc.last_name}`,
          user_email: profile?.email || '',
          is_read: false,
          reference_id: kyc.id,
        });
      });

      // Process pending payouts
      pendingPayouts?.forEach(payout => {
        const profile = profilesMap.get(payout.user_id);
        allNotifications.push({
          id: payout.id,
          type: 'payout_request',
          title: 'Payout Request',
          description: `₹${payout.amount.toFixed(2)} payout requested`,
          created_at: payout.created_at,
          user_name: profile?.name || 'Unknown User',
          user_email: profile?.email || '',
          is_read: false,
          reference_id: payout.id,
        });
      });

      // Sort all notifications by date
      return allNotifications.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('admin-notifications')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kyc_submissions' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payout_requests' }, () => {
        queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const totalCount = notifications.length;
  const supportCount = notifications.filter(n => n.type === 'support_ticket').length;
  const kycCount = notifications.filter(n => n.type === 'kyc_submission').length;
  const payoutCount = notifications.filter(n => n.type === 'payout_request').length;

  return {
    notifications,
    isLoading,
    totalCount,
    supportCount,
    kycCount,
    payoutCount,
  };
};
