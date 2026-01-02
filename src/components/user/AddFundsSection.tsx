import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, CreditCard, Building, Smartphone, Copy, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type PaymentMethodId = 'upi' | 'card' | 'bank' | 'usd_wallet';

interface PaymentMethod {
  id: PaymentMethodId;
  name: string;
  icon: React.ElementType;
  enabledKey: string;
  messageKey: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'upi', name: 'UPI', icon: Smartphone, enabledKey: 'payment_method_upi_enabled', messageKey: 'payment_method_upi_message' },
  { id: 'card', name: 'Card', icon: CreditCard, enabledKey: 'payment_method_card_enabled', messageKey: 'payment_method_card_message' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, enabledKey: 'payment_method_bank_enabled', messageKey: 'payment_method_bank_message' },
  { id: 'usd_wallet', name: 'USD Wallet', icon: Wallet, enabledKey: 'payment_method_usd_wallet_enabled', messageKey: 'payment_method_usd_wallet_message' },
];

export const AddFundsSection: React.FC = () => {
  const { settingsMap, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodId | null>(null);
  const [copied, setCopied] = useState(false);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  const methodsConfig = useMemo(() => {
    return paymentMethods.map(method => ({
      ...method,
      enabled: getRawValue(method.enabledKey) === 'true',
      message: getRawValue(method.messageKey) || `${method.name} is not available.`,
    }));
  }, [settings]);

  const selectedConfig = useMemo(() => {
    return methodsConfig.find(m => m.id === selectedMethod);
  }, [selectedMethod, methodsConfig]);

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

  const handleSelectMethod = (methodId: PaymentMethodId) => {
    setSelectedMethod(methodId);
    setCopied(false);
  };

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
        {/* Payment Methods Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {methodsConfig.map((method) => (
            <button
              key={method.id}
              onClick={() => handleSelectMethod(method.id)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                "hover:border-primary/50 hover:bg-primary/5",
                selectedMethod === method.id
                  ? "border-primary bg-primary/10 shadow-sm"
                  : "border-border bg-card"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                selectedMethod === method.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              )}>
                <method.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium">{method.name}</span>
              <Badge 
                variant={method.enabled ? "default" : "secondary"} 
                className={cn(
                  "text-[10px]",
                  method.enabled 
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                    : ""
                )}
              >
                {method.enabled ? 'Available' : 'Not Available'}
              </Badge>
            </button>
          ))}
        </div>

        {/* Dynamic Message Panel */}
        {selectedConfig && (
          <div className={cn(
            "mt-4 p-4 rounded-lg border transition-all duration-200",
            selectedConfig.enabled
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                selectedConfig.enabled
                  ? "bg-emerald-100 dark:bg-emerald-900/50"
                  : "bg-amber-100 dark:bg-amber-900/50"
              )}>
                <selectedConfig.icon className={cn(
                  "w-4 h-4",
                  selectedConfig.enabled
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                )} />
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <h4 className={cn(
                    "font-medium",
                    selectedConfig.enabled
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-amber-800 dark:text-amber-200"
                  )}>
                    {selectedConfig.name}
                  </h4>
                  <p className={cn(
                    "text-sm mt-1",
                    selectedConfig.enabled
                      ? "text-emerald-700 dark:text-emerald-300"
                      : "text-amber-700 dark:text-amber-300"
                  )}>
                    {selectedConfig.message}
                  </p>
                </div>

                {/* USD Wallet ID Display */}
                {selectedMethod === 'usd_wallet' && usdWalletId && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      USD Wallet ID
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
                  </div>
                )}

                {/* Show message if USD Wallet selected but no wallet ID */}
                {selectedMethod === 'usd_wallet' && !usdWalletId && (
                  <p className="text-sm text-muted-foreground">
                    USD Wallet ID not configured. Please contact admin.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Initial state - no method selected */}
        {!selectedMethod && (
          <div className="mt-4 p-4 bg-muted/50 rounded-lg border border-dashed border-muted-foreground/20">
            <p className="text-sm text-muted-foreground text-center">
              Select a payment method above to see details
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
