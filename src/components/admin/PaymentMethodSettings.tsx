import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Smartphone, CreditCard, Building, Wallet, Save, Loader2, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

interface PaymentMethodConfig {
  id: string;
  name: string;
  icon: React.ElementType;
  enabledKey: string;
  messageKey: string;
  hasWalletId?: boolean;
}

const paymentMethods: PaymentMethodConfig[] = [
  { id: 'upi', name: 'UPI', icon: Smartphone, enabledKey: 'payment_method_upi_enabled', messageKey: 'payment_method_upi_message' },
  { id: 'card', name: 'Card', icon: CreditCard, enabledKey: 'payment_method_card_enabled', messageKey: 'payment_method_card_message' },
  { id: 'bank', name: 'Bank Transfer', icon: Building, enabledKey: 'payment_method_bank_enabled', messageKey: 'payment_method_bank_message' },
  { id: 'usd_wallet', name: 'USD Wallet', icon: Wallet, enabledKey: 'payment_method_usd_wallet_enabled', messageKey: 'payment_method_usd_wallet_message', hasWalletId: true },
];

export const PaymentMethodSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [localSettings, setLocalSettings] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  useEffect(() => {
    const newSettings: Record<string, string> = {};
    paymentMethods.forEach(method => {
      newSettings[method.enabledKey] = getRawValue(method.enabledKey) || 'false';
      newSettings[method.messageKey] = getRawValue(method.messageKey) || '';
    });
    newSettings['usd_wallet_id'] = settingsMap.usd_wallet_id || '';
    setLocalSettings(newSettings);
  }, [settings, settingsMap.usd_wallet_id]);

  const handleToggle = (key: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: prev[key] === 'true' ? 'false' : 'true'
    }));
  };

  const handleInputChange = (key: string, value: string) => {
    setLocalSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const updatePromises = Object.entries(localSettings).map(([key, value]) => 
        updateSettingAsync({ key, value, oldValue: getRawValue(key) })
      );
      await Promise.all(updatePromises);
      setSaved(true);
      toast({
        title: 'Settings Saved',
        description: 'All payment method settings have been updated.',
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save settings.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle>Payment Method Settings</CardTitle>
            <CardDescription>
              Configure payment methods and custom messages for users
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {paymentMethods.map((method) => (
          <div key={method.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <method.icon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium">{method.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {localSettings[method.enabledKey] === 'true' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>
              <Switch
                checked={localSettings[method.enabledKey] === 'true'}
                onCheckedChange={() => handleToggle(method.enabledKey)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${method.id}-message`}>Custom Message</Label>
              <Textarea
                id={`${method.id}-message`}
                value={localSettings[method.messageKey] || ''}
                onChange={(e) => handleInputChange(method.messageKey, e.target.value)}
                placeholder={`Message shown when ${method.name} is selected`}
                rows={2}
              />
            </div>

            {method.hasWalletId && (
              <div className="space-y-2">
                <Label htmlFor="usd-wallet-id">USD Wallet ID</Label>
                <Input
                  id="usd-wallet-id"
                  value={localSettings['usd_wallet_id'] || ''}
                  onChange={(e) => handleInputChange('usd_wallet_id', e.target.value)}
                  placeholder="Enter USD wallet address or ID"
                  className="font-mono"
                />
              </div>
            )}
          </div>
        ))}

        <Button
          onClick={handleSaveAll}
          disabled={saving || isUpdating}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save All Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
