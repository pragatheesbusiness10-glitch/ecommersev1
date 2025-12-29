import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, Save, Loader2, Check } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { useToast } from '@/hooks/use-toast';

export const USDWalletSettings: React.FC = () => {
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  const { toast } = useToast();
  const [walletId, setWalletId] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setWalletId(settingsMap.usd_wallet_id || '');
  }, [settingsMap.usd_wallet_id]);

  const handleSave = async () => {
    try {
      await updateSetting({ 
        key: 'usd_wallet_id', 
        value: walletId,
        oldValue: settingsMap.usd_wallet_id 
      });
      setSaved(true);
      toast({
        title: 'Wallet ID Saved',
        description: 'USD Wallet ID has been updated successfully.',
      });
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save wallet ID.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <CardTitle>USD Wallet Settings</CardTitle>
            <CardDescription>
              Configure the USD wallet ID for user payments. This will be displayed to users for fund transfers.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="usd-wallet-id">USD Wallet ID</Label>
          <Input
            id="usd-wallet-id"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            placeholder="Enter USD wallet address or ID"
            className="font-mono"
          />
          <p className="text-xs text-muted-foreground">
            This wallet ID will be shown to all users in their payment dashboard.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="w-full"
        >
          {isUpdating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? 'Saved!' : 'Save Wallet ID'}
        </Button>
      </CardContent>
    </Card>
  );
};