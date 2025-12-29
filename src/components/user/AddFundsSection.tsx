import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Wallet, CreditCard, Building, Smartphone, AlertTriangle, Copy, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const AddFundsSection: React.FC = () => {
  const { settingsMap } = usePlatformSettings();
  const { toast } = useToast();
  const [copied, setCopied] = React.useState(false);

  const usdWalletId = settingsMap.usd_wallet_id;

  const handleCopyWalletId = () => {
    if (usdWalletId) {
      navigator.clipboard.writeText(usdWalletId);
      setCopied(true);
      toast({
        title: 'Copied!',
        description: 'Wallet ID copied to clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const paymentMethods = [
    { id: 'upi', name: 'UPI', icon: Smartphone, disabled: true },
    { id: 'card', name: 'Card', icon: CreditCard, disabled: true },
    { id: 'bank', name: 'Bank Transfer', icon: Building, disabled: true },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Add Funds</CardTitle>
            <CardDescription>
              Fund your wallet to process orders
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Warning Alert */}
        <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-700">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-800 dark:text-amber-200">Payment Method Not Available</AlertTitle>
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            This payment method is not available for you.
            <br />
            <strong>You must pay using USD via the wallet ID provided by admin.</strong>
          </AlertDescription>
        </Alert>

        {/* Payment Methods - All Disabled */}
        <div className="grid grid-cols-3 gap-3">
          {paymentMethods.map((method) => (
            <Button
              key={method.id}
              variant="outline"
              disabled
              className="flex flex-col items-center gap-2 h-auto py-4 opacity-50 cursor-not-allowed"
            >
              <method.icon className="w-5 h-5" />
              <span className="text-xs">{method.name}</span>
              <Badge variant="secondary" className="text-[10px]">Disabled</Badge>
            </Button>
          ))}
        </div>

        {/* USD Wallet ID Display */}
        {usdWalletId && (
          <div className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Admin Provided USD Wallet ID
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-background px-3 py-2 rounded border text-sm font-mono break-all">
                {usdWalletId}
              </code>
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyWalletId}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Send USD to this wallet ID and notify admin for fund credit.
            </p>
          </div>
        )}

        {!usdWalletId && (
          <div className="mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              USD Wallet ID not configured. Please contact admin.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};