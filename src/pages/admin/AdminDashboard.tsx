import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import { AnalyticsCharts } from '@/components/dashboard/AnalyticsCharts';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { useAdminKYC } from '@/hooks/useAdminKYC';
import { useAdminPayouts } from '@/hooks/usePayoutRequests';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useOrderRealtimeAdmin, usePayoutRealtimeAdmin, useProfileRealtimeAdmin } from '@/hooks/useRealtimeSubscription';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  AlertCircle,
  Users as UsersIcon,
  Loader2,
  Shield,
  Wallet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const AdminDashboard: React.FC = () => {
  const { toast } = useToast();
  const { orders, recentOrders, affiliates, stats, isLoading, refetchOrders } = useAdminDashboard();
  const { kycSubmissions } = useAdminKYC();
  const { pendingCount: pendingPayouts, totalPending: totalPendingPayouts } = useAdminPayouts();
  const { settingsMap } = usePlatformSettings();
  
  // Enable real-time updates
  useOrderRealtimeAdmin();
  usePayoutRealtimeAdmin();
  useProfileRealtimeAdmin();
  
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '₹';
  const pendingKYC = kycSubmissions.filter(k => k.status === 'submitted').length;

  const handleCompleteOrder = async (order: typeof recentOrders[0]) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', order.id);

      if (error) throw error;

      toast({
        title: 'Order Completed',
        description: `Order ${order.order_number} has been marked as completed.`,
      });
      
      refetchOrders();
    } catch (error) {
      console.error('Complete order error:', error);
      toast({
        title: 'Error',
        description: 'Could not complete order. Please try again.',
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

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Welcome back! Here's what's happening with your platform.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link to="/admin/users">Manage Users</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/products">Add Product</Link>
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
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
            badge={stats.pendingOrders}
            badgeVariant="warning"
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
            title="Revenue"
            value={`${currencySymbol}${stats.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            variant="accent"
            delay={150}
          />
          <StatCard
            title="Pending Payments"
            value={`${currencySymbol}${stats.pendingPayments.toFixed(2)}`}
            icon={AlertCircle}
            variant="warning"
            delay={200}
          />
          <StatCard
            title="Active Affiliates"
            value={stats.activeAffiliates}
            icon={UsersIcon}
            delay={250}
          />
          <StatCard
            title="KYC Reviews"
            value={pendingKYC}
            icon={Shield}
            variant="warning"
            badge={pendingKYC}
            badgeVariant="warning"
            delay={300}
          />
          <StatCard
            title="Payout Requests"
            value={pendingPayouts}
            icon={Wallet}
            variant="warning"
            badge={pendingPayouts}
            badgeVariant="destructive"
            delay={350}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Orders */}
          <div className="xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Recent Orders</h2>
              <Button variant="ghost" asChild>
                <Link to="/admin/orders">View all →</Link>
              </Button>
            </div>
            <OrdersTableNew 
              orders={recentOrders} 
              userRole="admin"
              onViewOrder={(order) => console.log('View order:', order.id)}
              onCompleteOrder={handleCompleteOrder}
            />
          </div>

          {/* Affiliate Overview */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">Affiliates</h2>
              <Button variant="ghost" asChild>
                <Link to="/admin/users">Manage →</Link>
              </Button>
            </div>
            <div className="dashboard-card space-y-4">
              {affiliates.length === 0 ? (
                <p className="text-muted-foreground text-sm text-center py-4">
                  No affiliates yet
                </p>
              ) : (
                affiliates.slice(0, 5).map((affiliate, index) => (
                  <div 
                    key={affiliate.id}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors opacity-0 animate-slide-up"
                    style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'forwards' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {affiliate.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{affiliate.name}</p>
                        <p className="text-xs text-muted-foreground">{affiliate.storefront_name || 'No storefront'}</p>
                      </div>
                    </div>
                    <Badge variant={affiliate.is_active ? 'active' : 'inactive'}>
                      {affiliate.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Analytics Charts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Analytics</h2>
          <AnalyticsCharts orders={orders} affiliates={affiliates} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
