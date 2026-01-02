import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { usePayoutRequests } from '@/hooks/usePayoutRequests';
import { useUserDashboard } from '@/hooks/useUserDashboard';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useKYC } from '@/hooks/useKYC';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { AddFundsSection } from '@/components/user/AddFundsSection';
import { CommissionHistory } from '@/components/user/CommissionHistory';
import { EarningsChart } from '@/components/user/EarningsChart';
import { TransactionExport } from '@/components/user/TransactionExport';

const statusColors: Record<string, string> = {
  pending: 'bg-amber-500/10 text-amber-600',
  approved: 'bg-blue-500/10 text-blue-600',
  completed: 'bg-emerald-500/10 text-emerald-600',
  rejected: 'bg-red-500/10 text-red-600',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  approved: <CheckCircle className="w-3 h-3" />,
  completed: <CheckCircle className="w-3 h-3" />,
  rejected: <XCircle className="w-3 h-3" />,
};

const UserPayments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isPayoutDialogOpen, setIsPayoutDialogOpen] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');

  const { profile, transactions, orders, stats, isLoading: dashboardLoading } = useUserDashboard();
  const { payoutRequests, isLoading: payoutsLoading, createPayout, isCreatingPayout } = usePayoutRequests();
  const { settingsMap } = usePlatformSettings();
  const { isKYCApproved } = useKYC();

  const walletBalance = profile?.wallet_balance || 0;
  const minPayoutAmount = settingsMap.min_payout_amount;
  const canRequestPayout = isKYCApproved && walletBalance >= minPayoutAmount;
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '₹';
  
  // Calculate total order value and profit
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0);
  const totalProfit = stats.totalRevenue;

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    
    if (amount < minPayoutAmount) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum payout amount is $${minPayoutAmount}.`,
        variant: 'destructive',
      });
      return;
    }

    if (amount > walletBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'You do not have enough funds in your wallet.',
        variant: 'destructive',
      });
      return;
    }

    const paymentDetails: Record<string, string> = {};
    if (paymentMethod === 'bank_transfer') {
      if (!bankName || !accountNumber || !accountName) {
        toast({
          title: 'Missing Details',
          description: 'Please fill in all bank details.',
          variant: 'destructive',
        });
        return;
      }
      paymentDetails.bank_name = bankName;
      paymentDetails.account_number = accountNumber;
      paymentDetails.account_name = accountName;
    }

    createPayout({
      amount,
      paymentMethod,
      paymentDetails,
    });

    setIsPayoutDialogOpen(false);
    setPayoutAmount('');
    setBankName('');
    setAccountNumber('');
    setAccountName('');
  };

  if (dashboardLoading || payoutsLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  const pendingPayouts = payoutRequests.filter(p => p.status === 'pending');
  const totalPendingPayout = pendingPayouts.reduce((sum, p) => sum + p.amount, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments & Wallet</h1>
            <p className="text-muted-foreground mt-1">
              Manage your earnings and request payouts.
            </p>
          </div>
          <Dialog open={isPayoutDialogOpen} onOpenChange={setIsPayoutDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" disabled={!canRequestPayout}>
                <Send className="w-4 h-4" />
                Request Payout
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <form onSubmit={handleRequestPayout}>
                <DialogHeader>
                  <DialogTitle>Request Payout</DialogTitle>
                  <DialogDescription>
                    Withdraw your earnings to your bank account. Minimum: {currencySymbol}{minPayoutAmount}
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="bg-muted/50 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Available Balance:</span>
                      <span className="font-bold text-lg">{currencySymbol}{totalOrderValue.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="payout-amount">Amount ({currencySymbol})</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="payout-amount"
                        type="number"
                        step="0.01"
                        min={minPayoutAmount}
                        max={walletBalance}
                        value={payoutAmount}
                        onChange={(e) => setPayoutAmount(e.target.value)}
                        placeholder={minPayoutAmount.toString()}
                        className="pl-10"
                      />
                    </div>
                    <div className="flex gap-2">
                      {[500, 1000, 2500].filter(v => v <= walletBalance).map(preset => (
                        <Button
                          key={preset}
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPayoutAmount(preset.toString())}
                        >
                          {currencySymbol}{preset}
                        </Button>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPayoutAmount(walletBalance.toString())}
                      >
                        Max
                      </Button>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMethod === 'bank_transfer' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="bank-name">Bank Name</Label>
                        <Input
                          id="bank-name"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="Enter bank name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="Enter account number"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="account-name">Account Holder Name</Label>
                        <Input
                          id="account-name"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="Enter account holder name"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingPayout} className="gap-2">
                    {isCreatingPayout && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Send className="w-4 h-4" />
                    Request Payout
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Wallet Balance Card */}
        <div className="dashboard-card bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">Available Balance</p>
                <p className="text-4xl font-bold">{currencySymbol}{totalOrderValue.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 md:gap-6">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-emerald-300">{currencySymbol}{totalProfit.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Total Profit</p>
              </div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-amber-300">{currencySymbol}{totalPendingPayout.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Pending Payouts</p>
              </div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold">{pendingPayouts.length}</p>
                <p className="text-xs text-primary-foreground/70">Pending Requests</p>
              </div>
            </div>
          </div>
        </div>

        {!isKYCApproved && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700">
            KYC verification is required to request payouts. Please complete your KYC verification first.
          </div>
        )}

        {isKYCApproved && walletBalance < minPayoutAmount && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 text-sm text-amber-700">
            You need at least {currencySymbol}{minPayoutAmount} in your wallet to request a payout. Current balance: {currencySymbol}{walletBalance.toFixed(2)}
          </div>
        )}

        {/* Earnings Chart */}
        <EarningsChart orders={orders} currencySymbol={currencySymbol} />

        {/* Commission History */}
        <CommissionHistory />

        {/* Add Funds Section */}
        <AddFundsSection />

        {/* Payout Requests */}
        {payoutRequests.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Payout Requests</h2>
            <div className="dashboard-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests.map((payout) => (
                    <TableRow key={payout.id}>
                      <TableCell className="text-muted-foreground">
                        {format(new Date(payout.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {currencySymbol}{payout.amount.toFixed(2)}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payout.payment_method.replace(/_/g, ' ')}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("gap-1", statusColors[payout.status])}>
                          {statusIcons[payout.status]}
                          {payout.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Transaction History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
            <TransactionExport transactions={transactions} currencySymbol={currencySymbol} />
          </div>
          <div className="dashboard-card divide-y divide-border">
            {transactions.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No transactions yet.</p>
            ) : (
              transactions.map((tx, index) => (
                <div 
                  key={tx.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0 opacity-0 animate-slide-up"
                  style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      tx.amount > 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
                    )}>
                      {tx.amount > 0 ? (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{tx.description || tx.type.replace(/_/g, ' ')}</p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(tx.created_at), 'MMM dd, yyyy • h:mm a')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-semibold",
                      tx.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                    )}>
                      {tx.amount > 0 ? '+' : ''}{currencySymbol}{Math.abs(tx.amount).toFixed(2)}
                    </p>
                    <Badge variant="secondary" className="mt-1 capitalize">
                      {tx.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserPayments;
