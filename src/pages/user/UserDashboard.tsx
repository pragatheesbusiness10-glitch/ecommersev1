import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { useAuth } from '@/contexts/AuthContext';
import { mockOrders, getUserStats } from '@/data/mockData';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  Wallet,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

const UserDashboard: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const stats = user ? getUserStats(user.id) : null;
  const userOrders = user ? mockOrders.filter(o => o.userId === user.id).slice(0, 5) : [];

  const handlePayOrder = (order: typeof mockOrders[0]) => {
    toast({
      title: 'Payment Initiated',
      description: `Processing payment of $${(order.basePrice * order.quantity).toFixed(2)} for order ${order.id}`,
    });
  };

  if (!stats || !user) return null;

  return (
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
            <Button asChild>
              <Link to={`/store/${user.storefrontSlug}`} target="_blank">
                View My Store
              </Link>
            </Button>
          </div>
        </div>

        {/* Storefront Info Banner */}
        <div 
          className="dashboard-card bg-gradient-to-r from-primary to-primary/80 text-primary-foreground opacity-0 animate-slide-up"
          style={{ animationFillMode: 'forwards' }}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">{user.storefrontName}</h2>
              <p className="text-primary-foreground/80 text-sm mt-1">
                Your storefront URL: <span className="font-mono">/store/{user.storefrontSlug}</span>
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">${user.walletBalance.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Wallet Balance</p>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link to="/dashboard/payments">Manage Wallet</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
            value={`$${stats.totalRevenue.toFixed(2)}`}
            icon={TrendingUp}
            variant="accent"
            delay={150}
          />
          <StatCard
            title="Payable to Admin"
            value={`$${stats.pendingPayments.toFixed(2)}`}
            icon={DollarSign}
            variant="warning"
            delay={200}
          />
          <StatCard
            title="Paid to Admin"
            value={`$${stats.paidAmount.toFixed(2)}`}
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
            <OrdersTable 
              orders={userOrders} 
              userRole="user"
              onViewOrder={(order) => console.log('View order:', order.id)}
              onPayOrder={handlePayOrder}
            />
          </div>

          {/* Quick Actions & Tips */}
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

            {/* Tips Card */}
            <div className="dashboard-card bg-accent/5 border-accent/20">
              <h3 className="font-semibold text-foreground mb-2">💡 Pro Tip</h3>
              <p className="text-sm text-muted-foreground">
                Keep your wallet funded to ensure quick order fulfillment. Orders are processed as soon as you pay the base amount to admin.
              </p>
            </div>

            {/* Pending Payments Alert */}
            {stats.pendingPayments > 0 && (
              <div className="dashboard-card bg-amber-50 border-amber-200">
                <h3 className="font-semibold text-amber-800 mb-2">⚠️ Pending Payments</h3>
                <p className="text-sm text-amber-700 mb-3">
                  You have ${stats.pendingPayments.toFixed(2)} in pending payments. Pay now to fulfill orders.
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
  );
};

export default UserDashboard;
