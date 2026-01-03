import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { playNotificationSound } from '@/lib/notificationSound';

export interface PayoutStatusHistory {
  id: string;
  payout_id: string;
  old_status: string | null;
  new_status: string;
  changed_by: string | null;
  changed_by_name?: string;
  notes: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  user_id: string;
  amount: number;
  payment_method: string;
  payment_details: Record<string, string>;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  admin_notes: string | null;
  created_at: string;
  processed_at: string | null;
  processed_by: string | null;
  user_name?: string;
  user_email?: string;
}

export const usePayoutRequests = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch user's own payout requests
  const userPayoutsQuery = useQuery({
    queryKey: ['user-payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payout requests:', error);
        throw error;
      }

      return (data || []).map((p): PayoutRequest => ({
        id: p.id,
        user_id: p.user_id,
        amount: Number(p.amount),
        payment_method: p.payment_method,
        payment_details: p.payment_details as Record<string, string>,
        status: p.status as PayoutRequest['status'],
        admin_notes: p.admin_notes,
        created_at: p.created_at,
        processed_at: p.processed_at,
        processed_by: p.processed_by,
      }));
    },
    enabled: !!user && user.role === 'user' && !!session,
  });

  // Create payout request mutation
  const createPayoutMutation = useMutation({
    mutationFn: async ({ 
      amount, 
      paymentMethod, 
      paymentDetails 
    }: { 
      amount: number; 
      paymentMethod: string; 
      paymentDetails: Record<string, string>;
    }) => {
      // Check current wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user?.id)
        .single();

      if (profileError) throw profileError;

      const currentBalance = Number(profile.wallet_balance);
      if (amount > currentBalance) {
        throw new Error('Insufficient wallet balance');
      }

      // Check minimum payout amount from settings
      const { data: settings } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'min_payout_amount')
        .single();

      const minPayout = settings ? parseFloat(settings.value) : 50;
      if (amount < minPayout) {
        throw new Error(`Minimum payout amount is $${minPayout}`);
      }

      // Prevent multiple pending payout requests exceeding wallet balance
      const { data: pendingPayouts, error: pendingError } = await supabase
        .from('payout_requests')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('status', 'pending');

      if (pendingError) throw pendingError;

      const pendingTotal = (pendingPayouts || []).reduce((sum, p) => sum + Number(p.amount), 0);
      const availableToWithdraw = currentBalance - pendingTotal;

      if (amount > availableToWithdraw) {
        throw new Error(
          `Insufficient available balance. Pending payouts on hold: ${pendingTotal.toFixed(2)}`
        );
      }

      // Create payout request (wallet balance is adjusted when admin approves/completes)
      const { data, error } = await supabase
        .from('payout_requests')
        .insert({
          user_id: user?.id,
          amount,
          payment_method: paymentMethod,
          payment_details: paymentDetails,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return data;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-payout-requests'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-profile'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'], exact: false });
      toast({
        title: 'Payout Requested',
        description: 'Your payout request has been submitted for review.',
      });
    },
    onError: (error: Error) => {
      console.error('Error creating payout request:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create payout request.',
        variant: 'destructive',
      });
    },
  });

  return {
    payoutRequests: userPayoutsQuery.data || [],
    isLoading: userPayoutsQuery.isLoading,
    error: userPayoutsQuery.error,
    refetch: userPayoutsQuery.refetch,
    createPayout: createPayoutMutation.mutate,
    isCreatingPayout: createPayoutMutation.isPending,
  };
};

// Admin hook for managing all payout requests
export const useAdminPayouts = () => {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const payoutsQuery = useQuery({
    queryKey: ['admin-payout-requests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payout requests:', error);
        throw error;
      }

      // Fetch user profiles
      const userIds = [...new Set((data || []).map(p => p.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, email')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

      return (data || []).map((p): PayoutRequest => {
        const profile = profileMap.get(p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          amount: Number(p.amount),
          payment_method: p.payment_method,
          payment_details: p.payment_details as Record<string, string>,
          status: p.status as PayoutRequest['status'],
          admin_notes: p.admin_notes,
          created_at: p.created_at,
          processed_at: p.processed_at,
          processed_by: p.processed_by,
          user_name: profile?.name,
          user_email: profile?.email,
        };
      });
    },
    enabled: user?.role === 'admin' && !!session,
  });

  const processPayoutMutation = useMutation({
    mutationFn: async ({ 
      payoutId, 
      status, 
      adminNotes,
      userId,
      amount,
      userName,
      userEmail,
      previousStatus
    }: { 
      payoutId: string; 
      status: 'approved' | 'rejected' | 'completed' | 'pending';
      adminNotes?: string;
      userId: string;
      amount: number;
      userName?: string;
      userEmail?: string;
      previousStatus?: string;
    }) => {
      if (!payoutId || !userId) {
        throw new Error('Invalid payout data');
      }

      // Update payout request
      const { error } = await supabase
        .from('payout_requests')
        .update({
          status,
          admin_notes: adminNotes || null,
          processed_at: status === 'pending' ? null : new Date().toISOString(),
          processed_by: status === 'pending' ? null : user?.id,
        })
        .eq('id', payoutId);

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      // Log the status change to history
      const { error: historyError } = await supabase
        .from('payout_status_history')
        .insert({
          payout_id: payoutId,
          old_status: previousStatus || null,
          new_status: status,
          changed_by: user?.id,
          notes: adminNotes || null,
        });

      if (historyError) {
        console.error('Status history insert error:', historyError);
        // Don't throw - history logging shouldn't block the main operation
      }

       // If approving/completing for the first time (from pending), deduct funds from wallet
       const shouldDebit =
         (status === 'approved' || status === 'completed') &&
         (!previousStatus || !['approved', 'completed'].includes(previousStatus));

       if (shouldDebit) {
         const { data: profile, error: profileError } = await supabase
           .from('profiles')
           .select('wallet_balance')
           .eq('user_id', userId)
           .single();

         if (profileError) {
           console.error('Profile fetch error:', profileError);
           throw profileError;
         }

         const currentBalance = Number(profile.wallet_balance);
         if (amount > currentBalance) {
           throw new Error('Insufficient wallet balance to approve this payout');
         }

         const newBalance = currentBalance - amount;
         const { error: updateError } = await supabase
           .from('profiles')
           .update({ wallet_balance: newBalance })
           .eq('user_id', userId);

         if (updateError) {
           console.error('Balance update error:', updateError);
           throw updateError;
         }

         const { error: txError } = await supabase
           .from('wallet_transactions')
           .insert({
             user_id: userId,
             amount: -amount,
             type: status === 'approved' ? 'payout_approved' : 'payout_completed',
             description:
               status === 'approved'
                 ? 'Payout approved - funds deducted'
                 : 'Payout completed - funds deducted',
           });

         if (txError) {
           console.error('Transaction insert error:', txError);
           throw txError;
         }
       }

       // Refund ONLY if funds had been deducted previously
       const shouldRefund =
         (status === 'rejected' &&
           !!previousStatus &&
           ['approved', 'completed'].includes(previousStatus)) ||
         (status === 'pending' &&
           !!previousStatus &&
           ['approved', 'completed'].includes(previousStatus));

       if (shouldRefund) {
         const { data: profile, error: profileError } = await supabase
           .from('profiles')
           .select('wallet_balance')
           .eq('user_id', userId)
           .single();

         if (profileError) {
           console.error('Profile fetch error:', profileError);
           throw profileError;
         }

         if (profile) {
           const newBalance = Number(profile.wallet_balance) + amount;
           const { error: updateError } = await supabase
             .from('profiles')
             .update({ wallet_balance: newBalance })
             .eq('user_id', userId);

           if (updateError) {
             console.error('Balance update error:', updateError);
             throw updateError;
           }

           const description =
             status === 'rejected'
               ? 'Payout rejected - funds returned'
               : 'Payout reverted to pending - funds returned';

           const { error: txError } = await supabase.from('wallet_transactions').insert({
             user_id: userId,
             amount: amount,
             type: status === 'rejected' ? 'payout_refund' : 'payout_reverted',
             description,
           });

           if (txError) {
             console.error('Transaction insert error:', txError);
             throw txError;
           }
         }
       }

      // Send email notification for status changes (not for pending)
      if (status !== 'pending' && userEmail) {
        const emailType = status === 'approved' 
          ? 'payout_approved' 
          : status === 'rejected' 
            ? 'payout_rejected' 
            : 'payout_completed';
        
        try {
          await supabase.functions.invoke('send-notification-email', {
            body: {
              type: emailType,
              userName: userName || 'User',
              userEmail: userEmail,
              amount: amount,
              adminNotes: adminNotes,
              recipientEmail: userEmail,
            },
          });
          console.log('Payout notification email sent successfully');
        } catch (emailError) {
          console.error('Failed to send payout notification email:', emailError);
          // Don't throw - email failure shouldn't block the payout process
        }
      }

      return { status };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['admin-payout-requests'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-wallets'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-profile'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-payout-requests'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'], exact: false });
      queryClient.invalidateQueries({ queryKey: ['user-dashboard'], exact: false });
      
      // Play notification sound
      playNotificationSound();
      
      const statusMessages: Record<string, { title: string; description: string }> = {
        approved: { title: 'Payout Approved', description: 'The payout has been approved and affiliate notified.' },
        rejected: { title: 'Payout Rejected', description: 'The payout has been rejected and affiliate notified.' },
        completed: { title: 'Payout Completed', description: 'The payout is complete and affiliate notified.' },
        pending: { title: 'Payout Reverted', description: 'The payout status has been reverted to pending.' },
      };
      const msg = statusMessages[result.status] || { title: 'Payout Updated', description: 'The payout status has been updated.' };
      toast({ title: msg.title, description: msg.description });
    },
    onError: (error: Error) => {
      console.error('Error processing payout:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to process payout request.',
        variant: 'destructive',
      });
    },
  });

  const pendingCount = payoutsQuery.data?.filter(p => p.status === 'pending').length || 0;
  const totalPending = payoutsQuery.data?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) || 0;

  return {
    payoutRequests: payoutsQuery.data || [],
    pendingCount,
    totalPending,
    isLoading: payoutsQuery.isLoading,
    error: payoutsQuery.error,
    refetch: payoutsQuery.refetch,
    processPayout: processPayoutMutation.mutate,
    isProcessingPayout: processPayoutMutation.isPending,
  };
};

// Hook to fetch payout status history
export const usePayoutStatusHistory = (payoutId: string | null) => {
  const { user, session } = useAuth();

  const historyQuery = useQuery({
    queryKey: ['payout-status-history', payoutId],
    queryFn: async () => {
      if (!payoutId) return [];

      const { data, error } = await supabase
        .from('payout_status_history')
        .select('*')
        .eq('payout_id', payoutId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payout status history:', error);
        throw error;
      }

      // Fetch admin names
      const changedByIds = [...new Set((data || []).map(h => h.changed_by).filter(Boolean))];
      let adminMap = new Map<string, string>();
      
      if (changedByIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', changedByIds as string[]);
        
        adminMap = new Map((profiles || []).map(p => [p.user_id, p.name]));
      }

      return (data || []).map((h): PayoutStatusHistory => ({
        id: h.id,
        payout_id: h.payout_id,
        old_status: h.old_status,
        new_status: h.new_status,
        changed_by: h.changed_by,
        changed_by_name: h.changed_by ? adminMap.get(h.changed_by) || 'Admin' : 'System',
        notes: h.notes,
        created_at: h.created_at,
      }));
    },
    enabled: !!payoutId && !!user && !!session,
  });

  return {
    history: historyQuery.data || [],
    isLoading: historyQuery.isLoading,
    error: historyQuery.error,
    refetch: historyQuery.refetch,
  };
};
