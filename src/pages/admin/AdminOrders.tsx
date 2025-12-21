import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { mockOrders } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Filter } from 'lucide-react';
import { OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid by User' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const { toast } = useToast();

  const filteredOrders = mockOrders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleCompleteOrder = (order: typeof mockOrders[0]) => {
    toast({
      title: 'Order Fulfilled',
      description: `Order ${order.id} has been marked as completed.`,
    });
  };

  const orderCounts = {
    all: mockOrders.length,
    pending_payment: mockOrders.filter(o => o.status === 'pending_payment').length,
    paid_by_user: mockOrders.filter(o => o.status === 'paid_by_user').length,
    processing: mockOrders.filter(o => o.status === 'processing').length,
    completed: mockOrders.filter(o => o.status === 'completed').length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage all orders across affiliates. {mockOrders.length} orders total.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statusFilters.map(filter => (
              <Button
                key={filter.value}
                variant={statusFilter === filter.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(filter.value)}
                className="gap-2"
              >
                {filter.label}
                <Badge 
                  variant="secondary" 
                  className={cn(
                    "ml-1",
                    statusFilter === filter.value && "bg-primary-foreground/20 text-primary-foreground"
                  )}
                >
                  {orderCounts[filter.value]}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <OrdersTable
          orders={filteredOrders}
          userRole="admin"
          onViewOrder={(order) => toast({ title: 'View Order', description: `Viewing ${order.id}` })}
          onCompleteOrder={handleCompleteOrder}
        />

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;
