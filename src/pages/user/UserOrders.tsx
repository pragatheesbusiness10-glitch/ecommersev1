import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdersTable } from '@/components/dashboard/OrdersTable';
import { useAuth } from '@/contexts/AuthContext';
import { mockOrders } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, AlertCircle } from 'lucide-react';
import { OrderStatus } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statusFilters: { value: OrderStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const UserOrders: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<typeof mockOrders[0] | null>(null);
  const { toast } = useToast();

  const userOrders = mockOrders.filter(o => o.userId === user?.id);
  
  const filteredOrders = userOrders.filter(order => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const orderCounts = {
    all: userOrders.length,
    pending_payment: userOrders.filter(o => o.status === 'pending_payment').length,
    paid_by_user: userOrders.filter(o => o.status === 'paid_by_user').length,
    processing: userOrders.filter(o => o.status === 'processing').length,
    completed: userOrders.filter(o => o.status === 'completed').length,
  };

  const totalPendingAmount = userOrders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);

  const handlePayOrder = (order: typeof mockOrders[0]) => {
    setSelectedOrder(order);
    setIsPayDialogOpen(true);
  };

  const handleConfirmPayment = () => {
    if (!selectedOrder) return;
    
    toast({
      title: 'Payment Successful',
      description: `Payment of $${(selectedOrder.basePrice * selectedOrder.quantity).toFixed(2)} for order ${selectedOrder.id} has been processed.`,
    });
    setIsPayDialogOpen(false);
    setSelectedOrder(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Orders</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage orders from your storefront.
            </p>
          </div>
        </div>

        {/* Pending Payments Alert */}
        {totalPendingAmount > 0 && (
          <div className="dashboard-card bg-amber-50 border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800">
                  You have {orderCounts.pending_payment} order(s) awaiting payment
                </h3>
                <p className="text-sm text-amber-700">
                  Total payable: ${totalPendingAmount.toFixed(2)}. Pay now to enable order fulfillment.
                </p>
              </div>
            </div>
            <Button 
              variant="accent" 
              className="gap-2"
              onClick={() => setStatusFilter('pending_payment')}
            >
              <CreditCard className="w-4 h-4" />
              Pay All Pending
            </Button>
          </div>
        )}

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
          userRole="user"
          onViewOrder={(order) => toast({ title: 'View Order', description: `Viewing ${order.id}` })}
          onPayOrder={handlePayOrder}
        />

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Confirm Payment</DialogTitle>
              <DialogDescription>
                Pay the base price to admin to enable order fulfillment.
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="py-4 space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-medium">{selectedOrder.id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{selectedOrder.product.name}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span className="font-medium">{selectedOrder.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer Price</span>
                    <span className="font-medium">${(selectedOrder.sellingPrice * selectedOrder.quantity).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between">
                    <span className="font-semibold">Amount Payable to Admin</span>
                    <span className="font-bold text-lg text-accent">
                      ${(selectedOrder.basePrice * selectedOrder.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-green-50 border border-green-200">
                  <p className="text-sm text-green-700">
                    <strong>Your Profit:</strong> ${((selectedOrder.sellingPrice - selectedOrder.basePrice) * selectedOrder.quantity).toFixed(2)}
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CreditCard className="w-4 h-4" />
                  <span>Payment will be deducted from your wallet balance: ${user?.walletBalance.toFixed(2)}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPayDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmPayment} className="gap-2">
                <CreditCard className="w-4 h-4" />
                Confirm Payment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserOrders;
