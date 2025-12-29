import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { Award, Save, Loader2, Percent } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const LEVEL_CONFIG = [
  { key: 'bronze', label: 'Bronze', color: 'bg-amber-700', settingKey: 'commission_rate_bronze' },
  { key: 'silver', label: 'Silver', color: 'bg-gray-400', settingKey: 'commission_rate_silver' },
  { key: 'gold', label: 'Gold', color: 'bg-yellow-500', settingKey: 'commission_rate_gold' },
] as const;

export const LevelCommissionSettings: React.FC = () => {
  const { settingsMap, updateSetting, isUpdating } = usePlatformSettings();
  const { toast } = useToast();

  const [rates, setRates] = useState({
    bronze: settingsMap.commission_rate_bronze,
    silver: settingsMap.commission_rate_silver,
    gold: settingsMap.commission_rate_gold,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRates({
      bronze: settingsMap.commission_rate_bronze,
      silver: settingsMap.commission_rate_silver,
      gold: settingsMap.commission_rate_gold,
    });
  }, [settingsMap.commission_rate_bronze, settingsMap.commission_rate_silver, settingsMap.commission_rate_gold]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      for (const level of LEVEL_CONFIG) {
        const newValue = rates[level.key as keyof typeof rates];
        const oldValue = settingsMap[level.settingKey as keyof typeof settingsMap];
        
        if (newValue !== oldValue) {
          await new Promise<void>((resolve, reject) => {
            updateSetting(
              { key: level.settingKey, value: String(newValue), oldValue: String(oldValue) },
              {
                onSuccess: () => resolve(),
                onError: (error) => reject(error),
              }
            );
          });
        }
      }
      
      toast({
        title: 'Commission Rates Updated',
        description: 'Level-based commission rates have been saved successfully.',
      });
    } catch (error) {
      console.error('Error saving commission rates:', error);
      toast({
        title: 'Error',
        description: 'Failed to save commission rates.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const hasChanges =
    rates.bronze !== settingsMap.commission_rate_bronze ||
    rates.silver !== settingsMap.commission_rate_silver ||
    rates.gold !== settingsMap.commission_rate_gold;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="w-5 h-5" />
          Level-Based Commission Rates
        </CardTitle>
        <CardDescription>
          Configure commission rates for each user level. Users earn this percentage of profit on completed orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LEVEL_CONFIG.map((level) => (
            <div key={level.key} className="space-y-2 p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between">
                <Badge className={`${level.color} text-white`}>
                  {level.label}
                </Badge>
                <Percent className="w-4 h-4 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`rate-${level.key}`}>Commission Rate</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`rate-${level.key}`}
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={rates[level.key as keyof typeof rates]}
                    onChange={(e) => setRates(prev => ({
                      ...prev,
                      [level.key]: parseFloat(e.target.value) || 0
                    }))}
                    className="max-w-24"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={isSaving || isUpdating || !hasChanges}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Rates
              </>
            )}
          </Button>
        </div>

        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>How it works:</strong> When an order is completed, the affiliate earns a commission based on their user level.
            For example, if a Bronze user makes ₹100 profit on an order, they earn ₹{rates.bronze} ({rates.bronze}% of ₹100).
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
