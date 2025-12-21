import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Check,
  X,
  Eye,
  Wallet,
  Loader2,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAdminPayouts, PayoutRequest } from '@/hooks/usePayoutRequests';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approved: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  completed: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  rejected: 'bg-red-500/10 text-red-600 border-red-500/20',
};

const AdminPayouts: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPayout, setSelectedPayout] = useState<PayoutRequest | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isProcessDialogOpen, setIsProcessDialogOpen] = useState(false);
  const [processAction, setProcessAction] = useState<'approved' | 'rejected' | 'completed'>('approved');
  const [adminNotes, setAdminNotes] = useState('');
  
  const { 
    payoutRequests, 
    pendingCount,
    totalPending,
    isLoading, 
    processPayout,
    isProcessingPayout 
  } = useAdminPayouts();

  const filteredPayouts = payoutRequests.filter(payout =>
    payout.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payout.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    payout.payment_method.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleViewPayout = (payout: PayoutRequest) => {
    setSelectedPayout(payout);
    setIsViewDialogOpen(true);
  };

  const handleOpenProcess = (payout: PayoutRequest, action: 'approved' | 'rejected' | 'completed') => {
    setSelectedPayout(payout);
    setProcessAction(action);
    setAdminNotes('');
    setIsProcessDialogOpen(true);
  };

  const handleProcessPayout = () => {
    if (!selectedPayout) return;
    
    processPayout({
      payoutId: selectedPayout.id,
      status: processAction,
      adminNotes,
      userId: selectedPayout.user_id,
      amount: selectedPayout.amount,
    });
    setIsProcessDialogOpen(false);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-24 rounded-xl" />
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Payout Requests</h1>
            <p className="text-muted-foreground mt-1">
              Review and process affiliate payout requests.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-xl font-bold text-foreground">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-xl font-bold text-foreground">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search payouts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Payouts Table */}
        <div className="dashboard-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Requested</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{payout.user_name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{payout.user_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-semibold">${payout.amount.toFixed(2)}</span>
                  </TableCell>
                  <TableCell>
                    <span className="capitalize">{payout.payment_method.replace(/_/g, ' ')}</span>
                  </TableCell>
                  <TableCell>
                    <Badge className={cn("border", statusColors[payout.status])}>
                      {payout.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(payout.created_at), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleViewPayout(payout)}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {payout.status === 'pending' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProcess(payout, 'approved')}
                          >
                            <Check className="w-4 h-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenProcess(payout, 'rejected')}
                          >
                            <X className="w-4 h-4 text-red-600" />
                          </Button>
                        </>
                      )}
                      {payout.status === 'approved' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenProcess(payout, 'completed')}
                          className="text-xs"
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPayouts.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No payout requests found.
            </div>
          )}
        </div>

        {/* View Payout Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Payout Request Details</DialogTitle>
              <DialogDescription>
                Requested on {selectedPayout && format(new Date(selectedPayout.created_at), 'PPp')}
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Affiliate</p>
                    <p className="font-medium">{selectedPayout.user_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="font-semibold text-lg">${selectedPayout.amount.toFixed(2)}</p>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <p className="font-medium capitalize">{selectedPayout.payment_method.replace(/_/g, ' ')}</p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">Payment Details</p>
                  <div className="bg-muted/50 rounded-lg p-3 space-y-1 text-sm">
                    {Object.entries(selectedPayout.payment_details).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <Badge className={cn("border", statusColors[selectedPayout.status])}>
                    {selectedPayout.status.toUpperCase()}
                  </Badge>
                  {selectedPayout.admin_notes && (
                    <p className="text-sm text-muted-foreground italic">
                      Note: {selectedPayout.admin_notes}
                    </p>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Process Payout Dialog */}
        <Dialog open={isProcessDialogOpen} onOpenChange={setIsProcessDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>
                {processAction === 'approved' && 'Approve Payout'}
                {processAction === 'rejected' && 'Reject Payout'}
                {processAction === 'completed' && 'Mark as Completed'}
              </DialogTitle>
              <DialogDescription>
                {processAction === 'approved' && 'Approve this payout request for processing.'}
                {processAction === 'rejected' && 'Reject this payout and return funds to wallet.'}
                {processAction === 'completed' && 'Mark this payout as completed after sending funds.'}
              </DialogDescription>
            </DialogHeader>
            {selectedPayout && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-bold text-lg">${selectedPayout.amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-muted-foreground">Affiliate:</span>
                    <span className="font-medium">{selectedPayout.user_name}</span>
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="admin-notes">Admin Notes (optional)</Label>
                  <Textarea
                    id="admin-notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder={processAction === 'rejected' ? 'Reason for rejection...' : 'Add a note...'}
                    rows={2}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsProcessDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleProcessPayout}
                disabled={isProcessingPayout}
                className={cn(
                  processAction === 'rejected' && 'bg-red-600 hover:bg-red-700',
                  processAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700'
                )}
              >
                {isProcessingPayout && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {processAction === 'approved' && <CheckCircle className="w-4 h-4 mr-2" />}
                {processAction === 'rejected' && <XCircle className="w-4 h-4 mr-2" />}
                {processAction === 'completed' && <Check className="w-4 h-4 mr-2" />}
                {processAction === 'approved' && 'Approve'}
                {processAction === 'rejected' && 'Reject'}
                {processAction === 'completed' && 'Complete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminPayouts;
