import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Settings,
  Percent,
  DollarSign,
  Wallet,
  Zap,
  Loader2,
  Save,
  Users,
  Globe,
  Mail,
  Eye,
  EyeOff,
  Check,
  Image,
  Type,
  Layout
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { PaymentGatewaySettings } from '@/components/admin/PaymentGatewaySettings';

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, isLoading, updateSetting, isUpdating } = usePlatformSettings();
  
  const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
  const [commissionRate, setCommissionRate] = useState('100');
  const [minPayoutAmount, setMinPayoutAmount] = useState('50');
  const [autoCreditOnComplete, setAutoCreditOnComplete] = useState(true);
  const [autoUserApproval, setAutoUserApproval] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [hasChanges, setHasChanges] = useState(false);
  
  // Branding settings
  const [siteName, setSiteName] = useState('Affiliate Platform');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [landingPageEnabled, setLandingPageEnabled] = useState(true);
  const [landingPageTitle, setLandingPageTitle] = useState('');
  const [landingPageSubtitle, setLandingPageSubtitle] = useState('');
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  
  // Email notification settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);

  // Load settings on mount
  useEffect(() => {
    if (!isLoading) {
      setCommissionType(settingsMap.commission_type);
      setCommissionRate(settingsMap.commission_rate.toString());
      setMinPayoutAmount(settingsMap.min_payout_amount.toString());
      setAutoCreditOnComplete(settingsMap.auto_credit_on_complete);
      setAutoUserApproval(settingsMap.auto_user_approval);
      setDefaultCurrency(settingsMap.default_currency);
      // Load branding settings
      setSiteName(settingsMap.site_name);
      setSiteLogoUrl(settingsMap.site_logo_url);
      setLandingPageEnabled(settingsMap.landing_page_enabled);
      setLandingPageTitle(settingsMap.landing_page_title);
      setLandingPageSubtitle(settingsMap.landing_page_subtitle);
      // Load email settings from platform_settings
      setResendApiKey(settingsMap.resend_api_key || '');
      setEmailNotificationsEnabled(settingsMap.email_notifications_enabled);
      setAdminEmail(settingsMap.admin_email || '');
      if (settingsMap.resend_api_key) {
        setIsApiKeySaved(true);
      }
    }
  }, [isLoading, settingsMap]);

  // Track changes
  useEffect(() => {
    const changed = 
      commissionType !== settingsMap.commission_type ||
      commissionRate !== settingsMap.commission_rate.toString() ||
      minPayoutAmount !== settingsMap.min_payout_amount.toString() ||
      autoCreditOnComplete !== settingsMap.auto_credit_on_complete ||
      autoUserApproval !== settingsMap.auto_user_approval ||
      defaultCurrency !== settingsMap.default_currency;
    setHasChanges(changed);
  }, [commissionType, commissionRate, minPayoutAmount, autoCreditOnComplete, autoUserApproval, defaultCurrency, settingsMap]);

  const handleSaveAll = async () => {
    try {
      await Promise.all([
        updateSetting({ key: 'commission_type', value: commissionType }),
        updateSetting({ key: 'commission_rate', value: commissionRate }),
        updateSetting({ key: 'min_payout_amount', value: minPayoutAmount }),
        updateSetting({ key: 'auto_credit_on_complete', value: autoCreditOnComplete.toString() }),
        updateSetting({ key: 'auto_user_approval', value: autoUserApproval.toString() }),
        updateSetting({ key: 'default_currency', value: defaultCurrency }),
      ]);
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleSaveEmailSettings = async () => {
    if (!resendApiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter a Resend API key.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSavingEmailSettings(true);
    try {
      await Promise.all([
        updateSetting({ key: 'resend_api_key', value: resendApiKey }),
        updateSetting({ key: 'email_notifications_enabled', value: emailNotificationsEnabled.toString() }),
        updateSetting({ key: 'admin_email', value: adminEmail }),
      ]);
      setIsApiKeySaved(true);
      toast({
        title: "Email Settings Saved",
        description: "Your email notification settings have been saved.",
      });
    } catch (error) {
      console.error('Error saving email settings:', error);
      toast({
        title: "Error",
        description: "Failed to save email settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleClearApiKey = async () => {
    setIsSavingEmailSettings(true);
    try {
      await Promise.all([
        updateSetting({ key: 'resend_api_key', value: '' }),
        updateSetting({ key: 'email_notifications_enabled', value: 'false' }),
        updateSetting({ key: 'admin_email', value: '' }),
      ]);
      setResendApiKey('');
      setIsApiKeySaved(false);
      setEmailNotificationsEnabled(false);
      setAdminEmail('');
      toast({
        title: "Settings Cleared",
        description: "Email notification settings have been cleared.",
      });
    } catch (error) {
      console.error('Error clearing settings:', error);
    } finally {
      setIsSavingEmailSettings(false);
    }
  };

  const handleSaveBrandingSettings = async () => {
    setIsSavingBranding(true);
    try {
      await Promise.all([
        updateSetting({ key: 'site_name', value: siteName }),
        updateSetting({ key: 'site_logo_url', value: siteLogoUrl }),
        updateSetting({ key: 'landing_page_enabled', value: landingPageEnabled.toString() }),
        updateSetting({ key: 'landing_page_title', value: landingPageTitle }),
        updateSetting({ key: 'landing_page_subtitle', value: landingPageSubtitle }),
      ]);
      toast({
        title: "Branding Settings Saved",
        description: "Your branding settings have been updated.",
      });
    } catch (error) {
      console.error('Error saving branding settings:', error);
      toast({
        title: "Error",
        description: "Failed to save branding settings.",
        variant: "destructive",
      });
    } finally {
      setIsSavingBranding(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Skeleton className="h-9 w-32" />
          <div className="grid gap-6">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground mt-1">
              Configure platform settings and business rules.
            </p>
          </div>
          {hasChanges && (
            <Button onClick={handleSaveAll} disabled={isUpdating} className="gap-2">
              {isUpdating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          )}
        </div>

        {/* User Approval Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-violet-600" />
              </div>
              <div>
                <CardTitle>User Approval</CardTitle>
                <CardDescription>
                  Control how new users are onboarded to the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-Approve New Users</Label>
                <p className="text-sm text-muted-foreground">
                  {autoUserApproval 
                    ? 'New users are automatically approved and can use all features immediately.'
                    : 'New users require manual approval before they can add products or receive orders.'}
                </p>
              </div>
              <Switch
                checked={autoUserApproval}
                onCheckedChange={setAutoUserApproval}
              />
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">When auto-approval is OFF, pending users cannot:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>Add products to their storefront</li>
                <li>Activate their storefront</li>
                <li>Receive customer orders</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Branding Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
                <Layout className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <CardTitle>Branding & Landing Page</CardTitle>
                <CardDescription>
                  Customize your platform's name, logo, and landing page.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Type className="w-4 h-4" /> Site Name
              </Label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="Your Platform Name"
                className="max-w-md"
              />
            </div>

            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Image className="w-4 h-4" /> Logo URL
              </Label>
              <Input
                value={siteLogoUrl}
                onChange={(e) => setSiteLogoUrl(e.target.value)}
                placeholder="https://example.com/logo.png"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Leave empty to use the default logo. Recommended size: 200x200px.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Landing Page</Label>
                <p className="text-sm text-muted-foreground">
                  Show the public landing page at the root URL.
                </p>
              </div>
              <Switch
                checked={landingPageEnabled}
                onCheckedChange={setLandingPageEnabled}
              />
            </div>

            {landingPageEnabled && (
              <>
                <div className="grid gap-2">
                  <Label>Landing Page Title</Label>
                  <Input
                    value={landingPageTitle}
                    onChange={(e) => setLandingPageTitle(e.target.value)}
                    placeholder="Welcome to Our Platform"
                    className="max-w-md"
                  />
                </div>

                <div className="grid gap-2">
                  <Label>Landing Page Subtitle</Label>
                  <Input
                    value={landingPageSubtitle}
                    onChange={(e) => setLandingPageSubtitle(e.target.value)}
                    placeholder="Join our affiliate network and start earning today"
                    className="max-w-md"
                  />
                </div>
              </>
            )}

            <Button 
              onClick={handleSaveBrandingSettings} 
              disabled={isSavingBranding}
              className="gap-2"
            >
              {isSavingBranding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Branding Settings
            </Button>
          </CardContent>
        </Card>

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <Globe className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <CardTitle>Currency Settings</CardTitle>
                <CardDescription>
                  Set the default currency for the platform.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Default Currency</Label>
              <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
                <SelectTrigger className="max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CURRENCY_SYMBOLS).map(([code, symbol]) => (
                    <SelectItem key={code} value={code}>
                      {symbol} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                This currency will be used across all dashboards, orders, and wallet balances.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {settingsMap.display_currencies.map(code => (
                <Badge key={code} variant="secondary">
                  {CURRENCY_SYMBOLS[code]} {code}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Commission Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle>Commission Settings</CardTitle>
                <CardDescription>
                  Configure default affiliate commissions. Can be overridden per user.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Commission Type</Label>
              <Select 
                value={commissionType} 
                onValueChange={(value: 'percentage' | 'fixed') => setCommissionType(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage of Profit</SelectItem>
                  <SelectItem value="fixed">Fixed Amount per Unit</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {commissionType === 'percentage' 
                  ? 'Affiliates earn a percentage of their profit margin (selling price - base price).'
                  : 'Affiliates earn a fixed amount for each unit sold.'}
              </p>
            </div>

            <div className="grid gap-2">
              <Label>
                {commissionType === 'percentage' ? 'Default Commission Rate (%)' : 'Commission per Unit'}
              </Label>
              <div className="relative max-w-xs">
                {commissionType === 'percentage' ? (
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                ) : (
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                )}
                <Input
                  type="number"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  className="pl-10"
                  min="0"
                  max={commissionType === 'percentage' ? '100' : undefined}
                  step={commissionType === 'percentage' ? '1' : '0.01'}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {commissionType === 'percentage' 
                  ? `Affiliates receive ${commissionRate}% of their profit margin by default.`
                  : `Affiliates receive ${CURRENCY_SYMBOLS[defaultCurrency]}${(parseFloat(commissionRate) || 0).toFixed(2)} per unit sold.`}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Payout Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Payout Settings</CardTitle>
                <CardDescription>
                  Configure wallet and payout rules.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>Minimum Payout Amount</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {CURRENCY_SYMBOLS[defaultCurrency]}
                </span>
                <Input
                  type="number"
                  value={minPayoutAmount}
                  onChange={(e) => setMinPayoutAmount(e.target.value)}
                  className="pl-10"
                  min="0"
                  step="1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Affiliates must have at least {CURRENCY_SYMBOLS[defaultCurrency]}{minPayoutAmount} in their wallet to request a payout.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Automation Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Zap className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Automation</CardTitle>
                <CardDescription>
                  Configure automatic actions and workflows.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Auto-credit on Order Completion</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically credit affiliate wallet when an order is marked as completed.
                </p>
              </div>
              <Switch
                checked={autoCreditOnComplete}
                onCheckedChange={setAutoCreditOnComplete}
              />
            </div>
          </CardContent>
        </Card>

        {/* Email Notification Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Email Notifications</CardTitle>
                <CardDescription>
                  Configure email notifications for chat messages using Resend.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Enable Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Send email notifications when users send chat messages.
                </p>
              </div>
              <Switch
                checked={emailNotificationsEnabled}
                onCheckedChange={(checked) => {
                  setEmailNotificationsEnabled(checked);
                  localStorage.setItem('email_notifications_enabled', checked.toString());
                }}
              />
            </div>
            
            <div className="grid gap-2">
              <Label>Admin Email (for notifications)</Label>
              <Input
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@example.com"
                className="max-w-md"
              />
              <p className="text-sm text-muted-foreground">
                Notifications will be sent to this email address.
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label>Resend API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={resendApiKey}
                    onChange={(e) => {
                      setResendApiKey(e.target.value);
                      setIsApiKeySaved(false);
                    }}
                    placeholder="re_xxxxxxxxx..."
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
                <Button 
                  onClick={handleSaveEmailSettings} 
                  disabled={!resendApiKey.trim() || isSavingEmailSettings}
                  className="gap-2"
                >
                  {isSavingEmailSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Email Settings
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Get your API key from <a href="https://resend.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">resend.com</a>.
              </p>
            </div>

            {isApiKeySaved && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4 text-sm">
                <p className="font-medium text-emerald-600 mb-2">✓ Email Settings Configured</p>
                <p className="text-muted-foreground">
                  Email notifications are ready. When enabled, chat messages will trigger email notifications.
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleClearApiKey}
                  disabled={isSavingEmailSettings}
                  className="mt-2 text-destructive hover:text-destructive"
                >
                  Clear Settings
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Gateway Settings */}
        <PaymentGatewaySettings />

        {/* Commission Preview */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Commission Preview</CardTitle>
            <CardDescription>
              Example calculation based on current settings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Example Order:</span>
                <span>1 unit @ {CURRENCY_SYMBOLS[defaultCurrency]}100 (base: {CURRENCY_SYMBOLS[defaultCurrency]}70)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span>{CURRENCY_SYMBOLS[defaultCurrency]}30.00</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2">
                <span className="text-muted-foreground">Affiliate Commission:</span>
                <span className="font-semibold text-emerald-600">
                  {commissionType === 'percentage' 
                    ? `${CURRENCY_SYMBOLS[defaultCurrency]}${((30 * parseFloat(commissionRate || '0')) / 100).toFixed(2)}`
                    : `${CURRENCY_SYMBOLS[defaultCurrency]}${(parseFloat(commissionRate || '0')).toFixed(2)}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminSettings;
