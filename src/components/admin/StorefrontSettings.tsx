import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Save, Loader2, Check, AlertTriangle } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const StorefrontSettings: React.FC = () => {
  const { settingsMap, updateSettingAsync, isUpdating, settings } = usePlatformSettings();
  const { toast } = useToast();
  const [orderFailedMessage, setOrderFailedMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Helper to get raw setting value
  const getRawValue = (key: string): string => {
    const setting = settings.find(s => s.key === key);
    return setting?.value || '';
  };

  useEffect(() => {
    setOrderFailedMessage(settingsMap.order_failed_message || 'Order not available in India or you are using VPN, fake order.');
  }, [settingsMap.order_failed_message]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettingAsync({
        key: 'order_failed_message',
        value: orderFailedMessage,
        oldValue: getRawValue('order_failed_message')
      });
      setSaved(true);
      toast({
        title: 'Settings Saved',
        description: 'Storefront settings have been updated.',
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
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <ShoppingCart className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <CardTitle>Storefront Settings</CardTitle>
            <CardDescription>
              Configure public storefront behavior and messages
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="space-y-1">
              <h4 className="font-medium">Order Failed Message</h4>
              <p className="text-sm text-muted-foreground">
                This message is shown when an order is blocked due to geo-restriction or VPN detection.
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="order-failed-message">Custom Error Message</Label>
            <Textarea
              id="order-failed-message"
              value={orderFailedMessage}
              onChange={(e) => setOrderFailedMessage(e.target.value)}
              placeholder="Enter the error message shown to blocked users"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This message appears when orders are blocked from India or VPN/proxy users.
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
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
          {saved ? 'Saved!' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
