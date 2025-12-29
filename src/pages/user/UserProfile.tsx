import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserProfileCard } from '@/components/user/UserProfileCard';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const UserProfile: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            View your profile information and KYC details.
          </p>
        </div>
        
        <UserProfileCard />
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;