import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Eye, 
  CheckCircle,
  Package,
  Loader2,
  User,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  Link as LinkIcon,
  ExternalLink,
  MousePointerClick,
  Plus,
  Upload
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAdminOrders, AdminOrder } from '@/hooks/useAdminOrders';
import { CreateOrderDialog } from '@/components/admin/CreateOrderDialog';
import { BulkOrderDialog } from '@/components/admin/BulkOrderDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useOrderRealtimeAdmin } from '@/hooks/useRealtimeSubscription';

type OrderStatus = AdminOrder['status'] | 'all';

const statusFilters: { value: OrderStatus; label: string }[] = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending_payment', label: 'Pending Payment' },
  { value: 'paid_by_user', label: 'Paid by User' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusColors: Record<string, string> = {
  pending_payment: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  paid_by_user: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  processing: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const AdminOrders: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus>('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPaymentLinkDialogOpen, setIsPaymentLinkDialogOpen] = useState(false);
  const [isBulkPaymentLinkDialogOpen, setIsBulkPaymentLinkDialogOpen] = useState(false);
  const [isCreateOrderDialogOpen, setIsCreateOrderDialogOpen] = useState(false);
  const [isBulkOrderDialogOpen, setIsBulkOrderDialogOpen] = useState(false);
  const [paymentLinkInput, setPaymentLinkInput] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  const { 
    orders, 
    orderCounts, 
    isLoading, 
    updateStatus,
    isUpdatingStatus,
    updatePaymentLink,
    isUpdatingPaymentLink,
    bulkUpdatePaymentLink,
    isBulkUpdatingPaymentLink,
    createOrder,
    isCreatingOrder,
    bulkCreateOrders,
    isBulkCreatingOrders,
  } = useAdminOrders();

  // Enable real-time updates
  useOrderRealtimeAdmin();

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer_email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.product?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.affiliate?.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleViewOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setIsViewDialogOpen(true);
  };

  const handleStatusChange = (orderId: string, newStatus: AdminOrder['status']) => {
    updateStatus({ orderId, status: newStatus });
  };

  const handleOpenPaymentLinkDialog = (order: AdminOrder) => {
    setSelectedOrder(order);
    setPaymentLinkInput(order.payment_link || '');
    setIsPaymentLinkDialogOpen(true);
  };

  const handleSavePaymentLink = () => {
    if (!selectedOrder) return;
    updatePaymentLink({ orderId: selectedOrder.id, paymentLink: paymentLinkInput });
    setIsPaymentLinkDialogOpen(false);
  };

  const handleSelectOrder = (orderId: string, checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(prev => [...prev, orderId]);
    } else {
      setSelectedOrderIds(prev => prev.filter(id => id !== orderId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedOrderIds(filteredOrders.map(o => o.id));
    } else {
      setSelectedOrderIds([]);
    }
  };

  const handleOpenBulkPaymentLinkDialog = () => {
    setPaymentLinkInput('');
    setIsBulkPaymentLinkDialogOpen(true);
  };

  const handleSaveBulkPaymentLink = () => {
    bulkUpdatePaymentLink({ orderIds: selectedOrderIds, paymentLink: paymentLinkInput });
    setIsBulkPaymentLinkDialogOpen(false);
    setSelectedOrderIds([]);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <Skeleton className="h-96 w-full rounded-xl" />
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
            <h1 className="text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground mt-1">
              Manage all orders across affiliates. {orders.length} orders total.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button onClick={() => setIsCreateOrderDialogOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Order
            </Button>
            <Button onClick={() => setIsBulkOrderDialogOpen(true)} variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
              Bulk Create
            </Button>
            {selectedOrderIds.length > 0 && (
              <Button onClick={handleOpenBulkPaymentLinkDialog} variant="outline" className="gap-2">
                <LinkIcon className="w-4 h-4" />
                Set Payment Link ({selectedOrderIds.length})
              </Button>
            )}
          </div>
        </div>

        {/* Create Order Dialog */}
        <CreateOrderDialog
          open={isCreateOrderDialogOpen}
          onOpenChange={setIsCreateOrderDialogOpen}
          onCreateOrder={(data) => {
            createOrder(data);
            setIsCreateOrderDialogOpen(false);
          }}
          isCreating={isCreatingOrder}
        />

        {/* Bulk Order Dialog */}
        <BulkOrderDialog
          open={isBulkOrderDialogOpen}
          onOpenChange={setIsBulkOrderDialogOpen}
          onCreateOrders={(data) => {
            bulkCreateOrders(data);
            setIsBulkOrderDialogOpen(false);
          }}
          isCreating={isBulkCreatingOrders}
        />

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
                  {orderCounts[filter.value as keyof typeof orderCounts] || 0}
                </Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div className="dashboard-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedOrderIds.length === filteredOrders.length && filteredOrders.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Affiliate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedOrderIds.includes(order.id)}
                      onCheckedChange={(checked) => handleSelectOrder(order.id, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{order.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {order.product?.image_url ? (
                        <img 
                          src={order.product.image_url} 
                          alt={order.product.name}
                          className="w-8 h-8 rounded object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <span className="truncate max-w-[120px]">{order.product?.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="truncate max-w-[100px] block">{order.affiliate?.name}</span>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">${(order.selling_price * order.quantity).toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value as AdminOrder['status'])}
                      disabled={isUpdatingStatus}
                    >
                      <SelectTrigger className={cn("w-[140px] h-8 text-xs border", statusColors[order.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending_payment">Pending Payment</SelectItem>
                        <SelectItem value="paid_by_user">Paid by User</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      {order.payment_link ? (
                        <Badge variant="outline" className="text-xs gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                          <LinkIcon className="w-3 h-3" /> Link Set
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                          No Link
                        </Badge>
                      )}
                      {order.payment_link_clicked_at && (
                        <Badge variant="outline" className="text-xs gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20">
                          <MousePointerClick className="w-3 h-3" />
                          Clicked
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(order.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleOpenPaymentLinkDialog(order)}
                        title="Set Payment Link"
                      >
                        <LinkIcon className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewOrder(order)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {order.status !== 'completed' && order.status !== 'cancelled' && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleStatusChange(order.id, 'completed')}
                          disabled={isUpdatingStatus}
                        >
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredOrders.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No orders found matching your criteria.</p>
          </div>
        )}

        {/* View Order Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Order Details</DialogTitle>
              <DialogDescription>
                Order {selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            {selectedOrder && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <User className="w-4 h-4" /> Customer
                    </p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Email
                    </p>
                    <p className="font-medium">{selectedOrder.customer_email}</p>
                  </div>
                  <div className="space-y-1 col-span-2">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Address
                    </p>
                    <p className="font-medium">{selectedOrder.customer_address}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center gap-4">
                    {selectedOrder.product?.image_url ? (
                      <img 
                        src={selectedOrder.product.image_url} 
                        alt={selectedOrder.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold">{selectedOrder.product?.name}</p>
                      <p className="text-sm text-muted-foreground">Qty: {selectedOrder.quantity}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Selling Price
                    </p>
                    <p className="font-semibold">${selectedOrder.selling_price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Base Price</p>
                    <p className="font-medium">${selectedOrder.base_price.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Profit</p>
                    <p className="font-medium text-emerald-600">
                      ${((selectedOrder.selling_price - selectedOrder.base_price) * selectedOrder.quantity).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Affiliate</p>
                    <p className="font-medium">{selectedOrder.affiliate?.name}</p>
                    <p className="text-xs text-muted-foreground">{selectedOrder.affiliate?.storefront_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Calendar className="w-4 h-4" /> Created
                    </p>
                    <p className="font-medium">
                      {format(new Date(selectedOrder.created_at), 'PPp')}
                    </p>
                  </div>
                </div>

                {/* Payment Link Section */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" /> Payment Link
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleOpenPaymentLinkDialog(selectedOrder)}
                    >
                      {selectedOrder.payment_link ? 'Edit' : 'Add'} Link
                    </Button>
                  </div>
                  {selectedOrder.payment_link ? (
                    <a 
                      href={selectedOrder.payment_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-1 break-all"
                    >
                      {selectedOrder.payment_link}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No payment link set</p>
                  )}
                  {selectedOrder.payment_link_clicked_at && (
                    <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-500/10 p-2 rounded-lg">
                      <MousePointerClick className="w-4 h-4" />
                      Link clicked at {format(new Date(selectedOrder.payment_link_clicked_at), 'PPp')}
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center border-t pt-4">
                  <Badge className={cn("border", statusColors[selectedOrder.status])}>
                    {selectedOrder.status.replace(/_/g, ' ').toUpperCase()}
                  </Badge>
                  {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && (
                    <Button 
                      onClick={() => {
                        handleStatusChange(selectedOrder.id, 'completed');
                        setIsViewDialogOpen(false);
                      }}
                      disabled={isUpdatingStatus}
                      className="gap-2"
                    >
                      {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                      Mark as Completed
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Payment Link Dialog */}
        <Dialog open={isPaymentLinkDialogOpen} onOpenChange={setIsPaymentLinkDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Set Payment Link</DialogTitle>
              <DialogDescription>
                Add a payment link for order {selectedOrder?.order_number}. Users will use this link to make payments.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="paymentLink">Payment Link URL</Label>
                <Input
                  id="paymentLink"
                  type="url"
                  placeholder="https://pay.example.com/..."
                  value={paymentLinkInput}
                  onChange={(e) => setPaymentLinkInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full URL including https://
                </p>
              </div>
              {selectedOrder?.payment_link && (
                <div className="p-3 rounded-lg bg-muted/50 text-sm">
                  <p className="text-muted-foreground mb-1">Current link:</p>
                  <a 
                    href={selectedOrder.payment_link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 break-all"
                  >
                    {selectedOrder.payment_link}
                    <ExternalLink className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsPaymentLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSavePaymentLink}
                disabled={isUpdatingPaymentLink}
                className="gap-2"
              >
                {isUpdatingPaymentLink && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Bulk Payment Link Dialog */}
        <Dialog open={isBulkPaymentLinkDialogOpen} onOpenChange={setIsBulkPaymentLinkDialogOpen}>
          <DialogContent className="sm:max-w-[450px]">
            <DialogHeader>
              <DialogTitle>Set Payment Link for Multiple Orders</DialogTitle>
              <DialogDescription>
                This link will be applied to {selectedOrderIds.length} selected order(s).
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulkPaymentLink">Payment Link URL</Label>
                <Input
                  id="bulkPaymentLink"
                  type="url"
                  placeholder="https://pay.example.com/..."
                  value={paymentLinkInput}
                  onChange={(e) => setPaymentLinkInput(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter the full URL including https://
                </p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
                <p>This will overwrite any existing payment links for the selected orders.</p>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsBulkPaymentLinkDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveBulkPaymentLink}
                disabled={isBulkUpdatingPaymentLink || !paymentLinkInput.trim()}
                className="gap-2"
              >
                {isBulkUpdatingPaymentLink && <Loader2 className="w-4 h-4 animate-spin" />}
                Apply to {selectedOrderIds.length} Orders
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;