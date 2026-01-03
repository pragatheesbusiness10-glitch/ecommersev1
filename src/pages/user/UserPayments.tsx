import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  DollarSign,
  Save,
  AlertTriangle
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
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankStatement, setBankStatement] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [ifscValidation, setIfscValidation] = useState<{
    valid: boolean | null;
    bank?: string;
    branch?: string;
    error?: string;
    loading: boolean;
  }>({ valid: null, loading: false });
  const [accountNumberError, setAccountNumberError] = useState('');
  
  // UPI state
  const [upiId, setUpiId] = useState('');
  const [upiIdError, setUpiIdError] = useState('');
  
  // Save payment details state
  const [savePaymentDetails, setSavePaymentDetails] = useState(false);
  const [savedPaymentDetails, setSavedPaymentDetails] = useState<{
    bank?: { accountName: string; accountNumber: string; ifscCode: string; bankName?: string; branchName?: string };
    upi?: { upiId: string };
  } | null>(null);
  const [useSavedDetails, setUseSavedDetails] = useState(false);

  const { profile, transactions, orders, stats, isLoading: dashboardLoading } = useUserDashboard();
  const { payoutRequests, isLoading: payoutsLoading, createPayout, isCreatingPayout } = usePayoutRequests();
  const { settingsMap } = usePlatformSettings();
  const { isKYCApproved } = useKYC();

  const walletBalance = profile?.wallet_balance || 0;
  const minPayoutAmount = settingsMap.min_payout_amount;
  const payoutEnabled = settingsMap.payout_enabled;
  const payoutDisabledMessage = settingsMap.payout_disabled_message;
  const canRequestPayout = payoutEnabled && isKYCApproved && walletBalance >= minPayoutAmount;
  const currencySymbol = CURRENCY_SYMBOLS[settingsMap.default_currency] || '₹';
  
  // Calculate total order value and profit
  const totalOrderValue = orders.reduce((sum, o) => sum + (o.selling_price * o.quantity), 0);
  const totalProfit = stats.totalRevenue;

  // Load saved payment details from profile
  useEffect(() => {
    if (profile?.saved_payment_details) {
      const details = profile.saved_payment_details as typeof savedPaymentDetails;
      setSavedPaymentDetails(details);
    }
  }, [profile]);

  // Apply saved details when checkbox is toggled
  useEffect(() => {
    if (useSavedDetails && savedPaymentDetails) {
      if (paymentMethod === 'bank_transfer' && savedPaymentDetails.bank) {
        setAccountName(savedPaymentDetails.bank.accountName);
        setAccountNumber(savedPaymentDetails.bank.accountNumber);
        setConfirmAccountNumber(savedPaymentDetails.bank.accountNumber);
        setIfscCode(savedPaymentDetails.bank.ifscCode);
        if (savedPaymentDetails.bank.bankName) {
          setIfscValidation({
            valid: true,
            bank: savedPaymentDetails.bank.bankName,
            branch: savedPaymentDetails.bank.branchName,
            loading: false
          });
        }
      } else if (paymentMethod === 'upi' && savedPaymentDetails.upi) {
        setUpiId(savedPaymentDetails.upi.upiId);
      }
    }
  }, [useSavedDetails, paymentMethod, savedPaymentDetails]);

  // Validate UPI ID format
  const validateUpiId = (id: string): boolean => {
    // UPI ID format: username@bankhandle (e.g., name@upi, phone@paytm)
    const upiPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;
    return upiPattern.test(id);
  };

  const handleUpiIdChange = (value: string) => {
    const lowercaseValue = value.toLowerCase();
    setUpiId(lowercaseValue);
    
    if (lowercaseValue.length > 0 && !validateUpiId(lowercaseValue)) {
      setUpiIdError('Invalid UPI ID format (e.g., name@upi, phone@paytm)');
    } else {
      setUpiIdError('');
    }
  };

  // Validate IFSC code with API
  const validateIfsc = async (code: string) => {
    if (code.length !== 11) {
      setIfscValidation({ valid: null, loading: false });
      return;
    }
    
    setIfscValidation({ valid: null, loading: true });
    
    try {
      const { data, error } = await supabase.functions.invoke('validate-ifsc', {
        body: { ifsc: code }
      });
      
      if (error) throw error;
      
      if (data.valid) {
        setIfscValidation({
          valid: true,
          bank: data.bank,
          branch: data.branch,
          loading: false
        });
      } else {
        setIfscValidation({
          valid: false,
          error: data.error || 'Invalid IFSC code',
          loading: false
        });
      }
    } catch (err) {
      setIfscValidation({
        valid: false,
        error: 'Failed to validate IFSC',
        loading: false
      });
    }
  };

  // Handle IFSC code change with debounce
  const handleIfscChange = (value: string) => {
    const uppercaseValue = value.toUpperCase();
    setIfscCode(uppercaseValue);
    
    // Reset validation when typing
    if (uppercaseValue.length < 11) {
      setIfscValidation({ valid: null, loading: false });
    } else if (uppercaseValue.length === 11) {
      validateIfsc(uppercaseValue);
    }
  };

  // Validate account number format
  const handleAccountNumberChange = (value: string) => {
    // Only allow digits
    const digitsOnly = value.replace(/\D/g, '');
    setAccountNumber(digitsOnly);
    
    if (digitsOnly.length > 0 && (digitsOnly.length < 9 || digitsOnly.length > 18)) {
      setAccountNumberError('Account number must be 9-18 digits');
    } else {
      setAccountNumberError('');
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(payoutAmount);
    
    if (amount < minPayoutAmount) {
      toast({
        title: 'Invalid Amount',
        description: `Minimum payout amount is ${currencySymbol}${minPayoutAmount}.`,
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
      if (!accountName || !accountNumber || !confirmAccountNumber || !ifscCode) {
        toast({
          title: 'Missing Details',
          description: 'Please fill in all bank details.',
          variant: 'destructive',
        });
        return;
      }
      if (accountNumber !== confirmAccountNumber) {
        toast({
          title: 'Account Number Mismatch',
          description: 'Account numbers do not match.',
          variant: 'destructive',
        });
        return;
      }

      // Validate IFSC code format (4 letters + 0 + 6 alphanumeric)
      const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/;
      if (!ifscPattern.test(ifscCode)) {
        toast({
          title: 'Invalid IFSC Code',
          description: 'IFSC code must be 11 characters: 4 letters, followed by 0, then 6 alphanumeric characters.',
          variant: 'destructive',
        });
        return;
      }

      // Upload bank statement if provided
      let bankStatementUrl = '';
      if (bankStatement && user) {
        setIsUploadingFile(true);
        const fileExt = bankStatement.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payout-documents')
          .upload(fileName, bankStatement);
        
        setIsUploadingFile(false);
        
        if (uploadError) {
          toast({
            title: 'Upload Failed',
            description: 'Failed to upload bank statement. Please try again.',
            variant: 'destructive',
          });
          return;
        }
        
        bankStatementUrl = uploadData.path;
      }

      paymentDetails.account_name = accountName;
      paymentDetails.account_number = accountNumber;
      paymentDetails.ifsc_code = ifscCode;
      paymentDetails.bank_statement_path = bankStatementUrl;
      
      // Save bank details to profile if checkbox is checked
      if (savePaymentDetails && user) {
        const newSavedDetails = {
          ...savedPaymentDetails,
          bank: {
            accountName,
            accountNumber,
            ifscCode,
            bankName: ifscValidation.bank,
            branchName: ifscValidation.branch
          }
        };
        await supabase
          .from('profiles')
          .update({ saved_payment_details: newSavedDetails })
          .eq('user_id', user.id);
        setSavedPaymentDetails(newSavedDetails);
      }
    }

    if (paymentMethod === 'upi') {
      if (!upiId || !validateUpiId(upiId)) {
        toast({
          title: 'Invalid UPI ID',
          description: 'Please enter a valid UPI ID (e.g., name@upi).',
          variant: 'destructive',
        });
        return;
      }
      paymentDetails.upi_id = upiId;
      
      // Save UPI details to profile if checkbox is checked
      if (savePaymentDetails && user) {
        const newSavedDetails = {
          ...savedPaymentDetails,
          upi: { upiId }
        };
        await supabase
          .from('profiles')
          .update({ saved_payment_details: newSavedDetails })
          .eq('user_id', user.id);
        setSavedPaymentDetails(newSavedDetails);
      }
    }

    createPayout({
      amount,
      paymentMethod,
      paymentDetails,
    });

    setIsPayoutDialogOpen(false);
    setPayoutAmount('');
    setAccountName('');
    setAccountNumber('');
    setConfirmAccountNumber('');
    setIfscCode('');
    setBankStatement(null);
    setUpiId('');
    setUpiIdError('');
    setSavePaymentDetails(false);
    setUseSavedDetails(false);
    setIfscValidation({ valid: null, loading: false });
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
        {/* Payout Disabled Warning */}
        {!payoutEnabled && (
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">Payout Requests Disabled</p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">{payoutDisabledMessage}</p>
            </div>
          </div>
        )}

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
                    <Select value={paymentMethod} onValueChange={(v) => {
                      setPaymentMethod(v);
                      setUseSavedDetails(false);
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                        <SelectItem value="upi">UPI</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="crypto">Cryptocurrency</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Use saved details option */}
                  {((paymentMethod === 'bank_transfer' && savedPaymentDetails?.bank) ||
                    (paymentMethod === 'upi' && savedPaymentDetails?.upi)) && (
                    <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <Checkbox
                        id="use-saved"
                        checked={useSavedDetails}
                        onCheckedChange={(checked) => setUseSavedDetails(checked === true)}
                      />
                      <Label htmlFor="use-saved" className="text-sm cursor-pointer flex-1">
                        Use saved {paymentMethod === 'bank_transfer' ? 'bank' : 'UPI'} details
                        {paymentMethod === 'bank_transfer' && savedPaymentDetails?.bank && (
                          <span className="text-muted-foreground ml-1">
                            (****{savedPaymentDetails.bank.accountNumber.slice(-4)})
                          </span>
                        )}
                        {paymentMethod === 'upi' && savedPaymentDetails?.upi && (
                          <span className="text-muted-foreground ml-1">
                            ({savedPaymentDetails.upi.upiId})
                          </span>
                        )}
                      </Label>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="upi-id">UPI ID</Label>
                        <Input
                          id="upi-id"
                          value={upiId}
                          onChange={(e) => handleUpiIdChange(e.target.value)}
                          placeholder="Enter UPI ID (e.g., name@upi)"
                          disabled={useSavedDetails}
                          className={cn(
                            upiId && !upiIdError && "border-emerald-500",
                            upiIdError && "border-red-500"
                          )}
                        />
                        {upiIdError && (
                          <p className="text-xs text-red-500">{upiIdError}</p>
                        )}
                        {upiId && !upiIdError && (
                          <p className="text-xs text-emerald-600">✓ Valid UPI ID format</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-upi"
                          checked={savePaymentDetails}
                          onCheckedChange={(checked) => setSavePaymentDetails(checked === true)}
                          disabled={useSavedDetails}
                        />
                        <Label htmlFor="save-upi" className="text-sm cursor-pointer">
                          <Save className="w-3 h-3 inline mr-1" />
                          Save UPI ID for future payouts
                        </Label>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'bank_transfer' && (
                    <div className="space-y-3">
                      <div className="grid gap-2">
                        <Label htmlFor="account-name">Account Holder Name</Label>
                        <Input
                          id="account-name"
                          value={accountName}
                          onChange={(e) => setAccountName(e.target.value)}
                          placeholder="Enter account holder name"
                          disabled={useSavedDetails}
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="account-number">Account Number</Label>
                        <Input
                          id="account-number"
                          value={accountNumber}
                          onChange={(e) => handleAccountNumberChange(e.target.value)}
                          placeholder="Enter account number (9-18 digits)"
                          maxLength={18}
                          disabled={useSavedDetails}
                        />
                        {accountNumberError && (
                          <p className="text-xs text-red-500">{accountNumberError}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="confirm-account-number">Confirm Account Number</Label>
                        <Input
                          id="confirm-account-number"
                          value={confirmAccountNumber}
                          onChange={(e) => setConfirmAccountNumber(e.target.value.replace(/\D/g, ''))}
                          placeholder="Re-enter account number"
                          maxLength={18}
                          disabled={useSavedDetails}
                        />
                        {confirmAccountNumber && accountNumber !== confirmAccountNumber && (
                          <p className="text-xs text-red-500">Account numbers do not match</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="ifsc-code">IFSC Code</Label>
                        <div className="relative">
                          <Input
                            id="ifsc-code"
                            value={ifscCode}
                            onChange={(e) => handleIfscChange(e.target.value)}
                            placeholder="Enter IFSC code (e.g., SBIN0001234)"
                            maxLength={11}
                            disabled={useSavedDetails}
                            className={cn(
                              ifscValidation.valid === true && "border-emerald-500 focus-visible:ring-emerald-500",
                              ifscValidation.valid === false && "border-red-500 focus-visible:ring-red-500"
                            )}
                          />
                          {ifscValidation.loading && (
                            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                          )}
                          {ifscValidation.valid === true && !ifscValidation.loading && (
                            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                          )}
                          {ifscValidation.valid === false && !ifscValidation.loading && (
                            <XCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-500" />
                          )}
                        </div>
                        {ifscValidation.valid === true && ifscValidation.bank && (
                          <p className="text-xs text-emerald-600">
                            ✓ {ifscValidation.bank} - {ifscValidation.branch}
                          </p>
                        )}
                        {ifscValidation.valid === false && ifscValidation.error && (
                          <p className="text-xs text-red-500">{ifscValidation.error}</p>
                        )}
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="bank-statement">Passbook Or 3 Months Bank Statement</Label>
                        <Input
                          id="bank-statement"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => setBankStatement(e.target.files?.[0] || null)}
                          className="cursor-pointer"
                        />
                        <p className="text-xs text-muted-foreground">Upload PDF or image (optional)</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="save-bank"
                          checked={savePaymentDetails}
                          onCheckedChange={(checked) => setSavePaymentDetails(checked === true)}
                          disabled={useSavedDetails}
                        />
                        <Label htmlFor="save-bank" className="text-sm cursor-pointer">
                          <Save className="w-3 h-3 inline mr-1" />
                          Save bank details for future payouts
                        </Label>
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsPayoutDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreatingPayout || isUploadingFile} className="gap-2">
                    {(isCreatingPayout || isUploadingFile) && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Send className="w-4 h-4" />
                    {isUploadingFile ? 'Uploading...' : 'Request Payout'}
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

        {/* Payout Requests - Moved to top */}
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

        {/* Earnings Chart */}
        <EarningsChart orders={orders} currencySymbol={currencySymbol} />

        {/* Commission History */}
        <CommissionHistory />

        {/* Add Funds Section */}
        <AddFundsSection />

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
