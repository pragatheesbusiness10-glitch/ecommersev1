import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import { KYCStatusBanner } from '@/components/kyc/KYCStatusBanner';
import { AffiliateLeaderboard } from '@/components/user/AffiliateLeaderboard';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useLevelMilestone } from '@/hooks/useLevelMilestone';
import { useOrderRealtimeUser, useProfileRealtimeUser, useWalletRealtimeUser } from '@/hooks/useRealtimeSubscription';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Wallet,
  TrendingUp,
  Loader2,
  Play,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { recentOrders, stats, profile, isLoading, refetchOrders } = useUserDashboard();
  const { settingsMap } = usePlatformSettings();
  const [showVideoDialog, setShowVideoDialog] = useState(false);
  
  // Hook for milestone notifications (runs in background)
  useLevelMilestone();
  
  // Enable real-time updates
  useOrderRealtimeUser(user?.id);
  useProfileRealtimeUser(user?.id);
  useWalletRealtimeUser(user?.id);
  
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '₹';
  const tutorialVideoUrl = settingsMap.user_dashboard_video_url;

  // Helper to render video (supports YouTube, Vimeo, direct video)
  const renderVideo = (url: string) => {
    if (!url) return null;

    // YouTube embed
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let videoId = '';
      if (url.includes('youtube.com/watch')) {
        videoId = new URL(url).searchParams.get('v') || '';
      } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0] || '';
      } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0] || '';
      }
      if (videoId) {
        return (
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            className="w-full aspect-video rounded-xl"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Vimeo embed
    if (url.includes('vimeo.com')) {
      const vimeoId = url.split('vimeo.com/')[1]?.split('?')[0];
      if (vimeoId) {
        return (
          <iframe
            src={`https://player.vimeo.com/video/${vimeoId}`}
            className="w-full aspect-video rounded-xl"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
          />
        );
      }
    }

    // Direct video file
    return (
      <video
        src={url}
        controls
        className="w-full aspect-video rounded-xl"
      >
        Your browser does not support the video tag.
      </video>
    );
  };

  const handlePayOrder = async (order: typeof recentOrders[0]) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'paid_by_user',
          paid_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Payment Successful',
        description: `Payment of ${currencySymbol}${(order.base_price * order.quantity).toFixed(2)} confirmed for order ${order.order_number}`,
      });
      
      refetchOrders();
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not process payment. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user) return null;

  return (
    <>
      <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back, {user.name}! Here's your storefront overview.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/dashboard/products">Browse Products</Link>
            </Button>
            {user.storefrontSlug && (
              <Button asChild>
                <Link to={`/store/${user.storefrontSlug}`} target="_blank">
                  View My Store
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* KYC Status Banner */}
        <KYCStatusBanner compact />

        {/* Storefront Info Banner */}
        <div 
          className="dashboard-card bg-gradient-to-r from-primary to-primary/80 text-primary-foreground opacity-0 animate-slide-up"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{user.storefrontName || 'My Storefront'}</h2>
              <p className="text-primary-foreground/80 text-sm mt-1">
                {user.storefrontSlug 
                  ? <>Your storefront URL: <span className="font-mono">/store/{user.storefrontSlug}</span></>
                  : 'Set up your storefront to start selling'}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{currencySymbol}{user.walletBalance.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Wallet Balance</p>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/dashboard/payments">Manage Wallet</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingCart}
            delay={0}
          />
          <StatCard
            title="Pending Orders"
            value={stats.pendingOrders}
            icon={Clock}
            variant="warning"
            delay={50}
          />
          <StatCard
            title="Completed"
            value={stats.completedOrders}
            icon={CheckCircle}
            variant="success"
            delay={100}
          />
          <StatCard
            title="Total Profit"
            value={`${currencySymbol}${stats.totalRevenue.toFixed(2)}`}
            icon={TrendingUp}
            variant="accent"
            delay={150}
          />
          <StatCard
            title="Payable to Admin"
            value={`${currencySymbol}${stats.pendingPayments.toFixed(2)}`}
            icon={DollarSign}
            variant="warning"
            badge={stats.pendingOrders > 0 ? stats.pendingOrders : undefined}
            badgeVariant="warning"
            delay={200}
          />
          <StatCard
            title="Paid to Admin"
            value={`${currencySymbol}${stats.paidAmount.toFixed(2)}`}
            icon={Wallet}
            variant="success"
            delay={250}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Orders</h2>
              <Button variant="ghost" asChild>
                <Link to="/dashboard/orders">View all →</Link>
              </Button>
            </div>
            <OrdersTableNew 
              orders={recentOrders} 
              userRole="user"
              onViewOrder={(order) => console.log('View order:', order.id)}
              onPayOrder={handlePayOrder}
            />
          </div>

          {/* Quick Actions, Leaderboard & Tips */}
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
            <div className="dashboard-card space-y-3">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/dashboard/storefront">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Manage Storefront
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/dashboard/products">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Add New Products
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/dashboard/payments">
                  <Wallet className="w-4 h-4 mr-2" />
                  Add Funds to Wallet
                </Link>
              </Button>
            </div>

            {/* Affiliate Leaderboard */}
            <AffiliateLeaderboard />

            {/* Tutorial Video Card */}
            {tutorialVideoUrl && (
              <div className="dashboard-card bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Play className="w-4 h-4 text-primary" />
                  <h3 className="font-semibold text-foreground">Getting Started</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  Watch our tutorial to learn how to use the platform effectively.
                </p>
                <Button variant="outline" size="sm" onClick={() => setShowVideoDialog(true)}>
                  <Play className="w-3 h-3 mr-2" />
                  Watch Tutorial
                </Button>
              </div>
            )}

            {/* Tips Card */}
            <div className="dashboard-card bg-accent/5 border-accent/20">
              <h3 className="font-semibold text-foreground mb-2">Pro Tip</h3>
              <p className="text-sm text-muted-foreground">
                Keep your wallet funded to ensure quick order fulfillment. Orders are processed as soon as you pay the base amount to admin.
              </p>
            </div>

            {/* Pending Payments Alert */}
            {stats.pendingPayments > 0 && (
              <div className="dashboard-card bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-2">Pending Payments</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
                  You have {currencySymbol}{stats.pendingPayments.toFixed(2)} in pending payments. Pay now to fulfill orders.
                </p>
                <Button variant="accent" size="sm" asChild>
                  <Link to="/dashboard/orders">View Pending Orders</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>

      {/* Video Dialog */}
      <Dialog open={showVideoDialog} onOpenChange={setShowVideoDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Getting Started Tutorial</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {tutorialVideoUrl && renderVideo(tutorialVideoUrl)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default UserDashboard;
