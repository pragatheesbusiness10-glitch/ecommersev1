import React, { createContext, useContext, useState, useCallback } from 'react';
import { User, AuthState } from '@/types';
import { mockUsers } from '@/data/mockData';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: false,
  });

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Mock authentication - in production, this would be a real API call
    const user = mockUsers.find(u => u.email === email);
    
    if (user && password === 'password123') {
      if (!user.isActive && user.role === 'user') {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, error: 'Your account has been deactivated. Please contact admin.' };
      }
      
      setState({
        user,
        isAuthenticated: true,
        isLoading: false,
      });
      return { success: true };
    }
    
    setState(prev => ({ ...prev, isLoading: false }));
    return { success: false, error: 'Invalid email or password' };
  }, []);

  const logout = useCallback(() => {
    setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
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
