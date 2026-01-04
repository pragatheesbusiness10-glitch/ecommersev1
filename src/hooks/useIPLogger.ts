import { supabase } from '@/integrations/supabase/client';

export type IPActionType = 'login' | 'logout' | 'order_placed' | 'payout_request' | 'profile_update';

let cachedIP: string | null = null;

export const getClientIP = async (): Promise<string | null> => {
  if (cachedIP) return cachedIP;
  
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    if (response.ok) {
      const data = await response.json();
      cachedIP = data.ip;
      return data.ip;
    }
  } catch (error) {
    console.warn('Failed to fetch IP address:', error);
  }
  return null;
};

export const logIPAction = async (
  userId: string,
  actionType: IPActionType
): Promise<boolean> => {
  try {
    const ip = await getClientIP();
    if (!ip) return false;

    const { error } = await supabase.from('ip_logs').insert({
      user_id: userId,
      ip_address: ip,
      action_type: actionType,
    });

    if (error) {
      console.error('Failed to log IP action:', error);
      return false;
    }

    // Also update the latest IP on the profile
    await supabase
      .from('profiles')
      .update({ last_ip_address: ip })
      .eq('user_id', userId);

    return true;
  } catch (error) {
    console.error('Error logging IP action:', error);
    return false;
  }
};

export const useIPLogger = () => {
  return { logIPAction, getClientIP };
};
