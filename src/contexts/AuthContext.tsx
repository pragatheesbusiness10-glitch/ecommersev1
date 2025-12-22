import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type UserRole = 'admin' | 'user';
type UserStatus = 'pending' | 'approved' | 'disabled';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  userStatus: UserStatus;
  storefrontSlug?: string;
  storefrontName?: string;
  isActive: boolean;
  createdAt: string;
  walletBalance: number;
  commissionOverride: number | null;
}

interface AuthContextType {
  user: AuthUser | null;
  session: Session | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isApproved: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<AuthUser | null> => {
    try {
      // Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      if (!profile) {
        return null;
      }

      // Fetch user role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
      }

      const role: UserRole = roleData?.role || 'user';

      return {
        id: userId,
        email: profile.email,
        name: profile.name,
        role,
        userStatus: (profile.user_status as UserStatus) || 'pending',
        storefrontSlug: profile.storefront_slug || undefined,
        storefrontName: profile.storefront_name || undefined,
        isActive: profile.is_active,
        createdAt: profile.created_at,
        walletBalance: Number(profile.wallet_balance) || 0,
        commissionOverride: profile.commission_override ? Number(profile.commission_override) : null,
      };
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
      return null;
    }
  };

  const refreshUser = useCallback(async () => {
    if (session?.user) {
      const userProfile = await fetchUserProfile(session.user.id);
      setUser(userProfile);
    }
  }, [session]);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession?.user) {
          // Defer Supabase calls with setTimeout to prevent deadlock
          setTimeout(async () => {
            const userProfile = await fetchUserProfile(currentSession.user.id);
            setUser(userProfile);
            setIsLoading(false);
          }, 0);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session: existingSession } }) => {
      setSession(existingSession);
      
      if (existingSession?.user) {
        fetchUserProfile(existingSession.user.id).then((userProfile) => {
          setUser(userProfile);
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        const userProfile = await fetchUserProfile(data.user.id);
        
        // Check if user is disabled
        if (userProfile && userProfile.userStatus === 'disabled') {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been disabled. Please contact admin.' };
        }
        
        if (userProfile && !userProfile.isActive && userProfile.role === 'user') {
          await supabase.auth.signOut();
          return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
        }
        
        setUser(userProfile);
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          return { success: false, error: 'This email is already registered. Please sign in instead.' };
        }
        return { success: false, error: error.message };
      }

      if (data.user) {
        // Wait a moment for the trigger to create the profile
        await new Promise(resolve => setTimeout(resolve, 500));
        const userProfile = await fetchUserProfile(data.user.id);
        setUser(userProfile);
      }

      return { success: true };
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }, []);

  const isApproved = user?.role === 'admin' || user?.userStatus === 'approved';

  return (
    <AuthContext.Provider value={{ 
      user, 
      session,
      isAuthenticated: !!session && !!user, 
      isLoading,
      isApproved,
      login, 
      signup,
      logout,
      refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
