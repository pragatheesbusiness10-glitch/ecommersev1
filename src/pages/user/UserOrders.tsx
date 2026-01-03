import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OrdersTableNew } from '@/components/dashboard/OrdersTableNew';
import { useAuth } from '@/contexts/AuthContext';
import { useUserDashboard, DashboardOrder } from '@/hooks/useUserDashboard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CreditCard, AlertCircle, Loader2, ExternalLink, CheckCircle2, Wallet, ArrowRight } from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';
import { useOrderRealtimeUser } from '@/hooks/useRealtimeSubscription';

type OrderStatusFilter = 'all' | 'pending_payment' | 'paid_by_user' | 'processing' | 'completed';

const statusFilters: { value: OrderStatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
];

const UserOrders: React.FC = () => {
  const { user } = useAuth();
  const { orders, isLoading, refetchOrders } = useUserDashboard();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>('all');
  const [isPayDialogOpen, setIsPayDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<DashboardOrder | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Enable real-time updates
  useOrderRealtimeUser(user?.id);

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.product?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const orderCounts = {
    all: orders.length,
    pending_payment: orders.filter(o => o.status === 'pending_payment').length,
    paid_by_user: orders.filter(o => o.status === 'paid_by_user').length,
    processing: orders.filter(o => o.status === 'processing').length,
    completed: orders.filter(o => o.status === 'completed').length,
  };

  const totalPendingAmount = orders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.base_price * o.quantity), 0);

  const handlePayOrder = (order: DashboardOrder) => {
    setSelectedOrder(order);
    setIsPayDialogOpen(true);
  };

  const handleConfirmPayment = async () => {
    if (!selectedOrder) return;
    
    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ 
          status: 'paid_by_user',
          paid_at: new Date().toISOString()
        })
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: 'Payment Successful',
        description: `Payment of $${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)} for order ${selectedOrder.order_number} has been processed.`,
      });
      
      refetchOrders();
      setIsPayDialogOpen(false);
      setSelectedOrder(null);
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: 'Payment Failed',
        description: 'Could not process payment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
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
          <div className="dashboard-card bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                  You have {orderCounts.pending_payment} order(s) awaiting payment
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-300">
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
              View Pending
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
        <OrdersTableNew
          orders={filteredOrders}
          userRole="user"
          onViewOrder={(order) => toast({ title: 'View Order', description: `Viewing ${order.order_number}` })}
          onPayOrder={handlePayOrder}
        />

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {orders.length === 0 
                ? "You don't have any orders yet."
                : "No orders found matching your criteria."}
            </p>
          </div>
        )}

        {/* Payment Dialog */}
        <Dialog open={isPayDialogOpen} onOpenChange={setIsPayDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Pay for Order</DialogTitle>
              <DialogDescription>
                Pay the base price to admin to enable order fulfillment.
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="py-4 space-y-4">
                {/* Step-by-Step Guide */}
                <div className="p-4 rounded-xl bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">How It Works</p>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1",
                        selectedOrder.status === 'pending_payment' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-green-500 text-white"
                      )}>
                        {selectedOrder.status !== 'pending_payment' ? <CheckCircle2 className="w-4 h-4" /> : "1"}
                      </div>
                      <p className="text-[10px] leading-tight text-muted-foreground">Pay Base Price<br/>to Admin</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1",
                        selectedOrder.status === 'completed' 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {selectedOrder.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : "2"}
                      </div>
                      <p className="text-[10px] leading-tight text-muted-foreground">Admin Marks<br/>Complete</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    <div className="flex flex-col items-center text-center flex-1">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1",
                        selectedOrder.status === 'completed' 
                          ? "bg-green-500 text-white" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {selectedOrder.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> : "3"}
                      </div>
                      <p className="text-[10px] leading-tight text-muted-foreground">Full Amount<br/>to Wallet</p>
                    </div>
                  </div>
                </div>

                {/* PROMINENT Amount Payable to Admin */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border-2 border-amber-500/50 shadow-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-5 h-5 text-amber-600" />
                    <span className="text-sm font-semibold text-amber-800 dark:text-amber-200 uppercase tracking-wide">
                      Amount You Pay to Admin
                    </span>
                  </div>
                  <div className="text-4xl font-bold text-amber-700 dark:text-amber-300">
                    ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)}
                  </div>
                  <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-1">
                    Base price × {selectedOrder.quantity} unit(s)
                  </p>
                </div>

                {/* Order Details */}
                <div className="p-4 rounded-xl bg-muted/50 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Order ID</span>
                    <span className="font-medium">{selectedOrder.order_number}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Product</span>
                    <span className="font-medium">{selectedOrder.product?.name || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Customer Paid</span>
                    <span className="font-medium">${(selectedOrder.selling_price * selectedOrder.quantity).toFixed(2)}</span>
                  </div>
                </div>

                {/* Profit & Wallet Credit Info */}
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-green-700 dark:text-green-300">After Completion, Your Wallet Gets:</span>
                    <span className="font-bold text-lg text-green-600 dark:text-green-400">
                      ${(selectedOrder.selling_price * selectedOrder.quantity).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-green-600 dark:text-green-400">Your Net Profit:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      ${((selectedOrder.selling_price - selectedOrder.base_price) * selectedOrder.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Payment Link Section */}
                {selectedOrder.payment_link ? (
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                    <p className="text-sm font-medium flex items-center gap-2">
                      <CreditCard className="w-4 h-4 text-primary" />
                      Payment Link from Admin
                    </p>
                    <a 
                      href={selectedOrder.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full justify-center font-semibold text-lg"
                      onClick={async () => {
                        await supabase
                          .from('orders')
                          .update({ payment_link_clicked_at: new Date().toISOString() })
                          .eq('id', selectedOrder.id);
                        refetchOrders();
                      }}
                    >
                      <ExternalLink className="w-5 h-5" />
                      Pay ${(selectedOrder.base_price * selectedOrder.quantity).toFixed(2)} Now
                    </a>
                    <p className="text-xs text-muted-foreground text-center">
                      After payment, click "Confirm Payment" below
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <p className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Payment link not yet set by admin. Please wait or contact admin.
                    </p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsPayDialogOpen(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmPayment} 
                className="gap-2" 
                disabled={isProcessing || !selectedOrder?.payment_link}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserOrders;
