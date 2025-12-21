import React from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { mockOrders, mockUsers, getAdminStats } from '@/data/mockData';
import { 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  DollarSign,
  AlertCircle,
  Users as UsersIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const AdminDashboard: React.FC = () => {
  const stats = getAdminStats();
  const recentOrders = mockOrders.slice(0, 5);
  const activeUsers = mockUsers.filter(u => u.role === 'user' && u.isActive);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders}
            icon={ShoppingCart}
            trend={{ value: 12, isPositive: true }}
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
            title="Revenue"
            value={`$${stats.totalRevenue.toFixed(2)}`}
            icon={DollarSign}
            variant="accent"
            delay={150}
          />
          <StatCard
            title="Pending Payments"
            value={`$${stats.pendingPayments.toFixed(2)}`}
            icon={AlertCircle}
            variant="warning"
            delay={200}
          />
          <StatCard
            title="Active Affiliates"
            value={activeUsers.length}
            icon={UsersIcon}
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
                <Link to="/admin/orders">View all →</Link>
              </Button>
            </div>
            <OrdersTable 
              orders={recentOrders} 
              userRole="admin"
              onViewOrder={(order) => console.log('View order:', order.id)}
              onCompleteOrder={(order) => console.log('Complete order:', order.id)}
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
              {mockUsers.filter(u => u.role === 'user').map((user, index) => (
                <div 
                  key={user.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors opacity-0 animate-slide-up"
                  style={{ animationDelay: `${300 + index * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-primary font-semibold">
                        {user.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.storefrontName}</p>
                    </div>
                  </div>
                  <Badge variant={user.isActive ? 'active' : 'inactive'}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Quick Actions */}
            <div className="dashboard-card">
              <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/users">
                    <UsersIcon className="w-4 h-4 mr-2" />
                    Add New Affiliate
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/products">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Add New Product
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link to="/admin/orders">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Process Pending Orders
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
