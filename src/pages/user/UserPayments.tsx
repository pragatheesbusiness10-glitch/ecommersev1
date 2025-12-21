import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockOrders } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Wallet, 
  Plus, 
  ArrowUpRight, 
  ArrowDownLeft,
  CreditCard,
  History
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
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';

const UserPayments: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isAddFundsOpen, setIsAddFundsOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const userOrders = mockOrders.filter(o => o.userId === user?.id);
  
  // Calculate payment stats
  const totalPaid = userOrders
    .filter(o => o.status !== 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);
  
  const totalPending = userOrders
    .filter(o => o.status === 'pending_payment')
    .reduce((sum, o) => sum + (o.basePrice * o.quantity), 0);

  const totalProfit = userOrders
    .filter(o => o.status === 'completed')
    .reduce((sum, o) => sum + ((o.sellingPrice - o.basePrice) * o.quantity), 0);

  // Mock transaction history
  const transactions = [
    { id: '1', type: 'deposit', amount: 500, date: '2024-03-18T10:00:00Z', description: 'Wallet top-up' },
    { id: '2', type: 'payment', amount: -149.99, date: '2024-03-17T14:00:00Z', description: 'Order ORD-002 payment' },
    { id: '3', type: 'deposit', amount: 1000, date: '2024-03-15T09:00:00Z', description: 'Wallet top-up' },
    { id: '4', type: 'payment', amount: -89.99, date: '2024-03-10T11:00:00Z', description: 'Order ORD-001 payment' },
  ];

  const handleAddFunds = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(amount);
    if (value <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount.',
        variant: 'destructive',
      });
      return;
    }
    toast({
      title: 'Funds Added',
      description: `$${value.toFixed(2)} has been added to your wallet.`,
    });
    setIsAddFundsOpen(false);
    setAmount('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payments & Wallet</h1>
            <p className="text-muted-foreground mt-1">
              Manage your wallet and view payment history.
            </p>
          </div>
          <Dialog open={isAddFundsOpen} onOpenChange={setIsAddFundsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Funds
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
              <form onSubmit={handleAddFunds}>
                <DialogHeader>
                  <DialogTitle>Add Funds to Wallet</DialogTitle>
                  <DialogDescription>
                    Top up your wallet balance to pay for orders.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="100.00"
                      className="text-lg"
                    />
                  </div>
                  <div className="flex gap-2">
                    {[50, 100, 250, 500].map(preset => (
                      <Button
                        key={preset}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setAmount(preset.toString())}
                      >
                        ${preset}
                      </Button>
                    ))}
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddFundsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="gap-2">
                    <CreditCard className="w-4 h-4" />
                    Add Funds
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Wallet Balance Card */}
        <div 
          className="dashboard-card bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-foreground/20 flex items-center justify-center">
                <Wallet className="w-8 h-8" />
              </div>
              <div>
                <p className="text-primary-foreground/70 text-sm">Wallet Balance</p>
                <p className="text-4xl font-bold">${user?.walletBalance.toFixed(2)}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Total Paid</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-300">${totalPending.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-300">${totalProfit.toFixed(2)}</p>
                <p className="text-xs text-primary-foreground/70">Total Profit</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="dashboard-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <ArrowDownLeft className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Deposits</p>
                <p className="text-xl font-bold text-foreground">$1,500.00</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                <ArrowUpRight className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Payments</p>
                <p className="text-xl font-bold text-foreground">${totalPaid.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="dashboard-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <History className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-bold text-foreground">
                  {userOrders.filter(o => o.status === 'pending_payment').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Transaction History</h2>
          <div className="dashboard-card divide-y divide-border">
            {transactions.map((tx, index) => (
              <div 
                key={tx.id}
                className="flex items-center justify-between py-4 first:pt-0 last:pb-0 opacity-0 animate-slide-up"
                style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    tx.type === 'deposit' ? 'bg-green-100' : 'bg-red-100'
                  }`}>
                    {tx.type === 'deposit' ? (
                      <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    ) : (
                      <ArrowUpRight className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{tx.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(tx.date), 'MMM dd, yyyy • h:mm a')}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toFixed(2)}
                  </p>
                  <Badge variant={tx.type === 'deposit' ? 'active' : 'secondary'} className="mt-1">
                    {tx.type === 'deposit' ? 'Deposit' : 'Payment'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserPayments;
