import React, { useState, useEffect, useRef } from 'react';
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
  Layout,
  Upload,
  X,
  ExternalLink,
  ArrowRight,
  Store,
  ShoppingCart,
  Shield,
  BarChart3,
  History,
  Clock
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { useSettingsAuditLogs } from '@/hooks/useSettingsAuditLogs';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { PaymentGatewaySettings } from '@/components/admin/PaymentGatewaySettings';
import { USDWalletSettings } from '@/components/admin/USDWalletSettings';
import { MFASettings } from '@/components/mfa/MFASettings';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

const AdminSettings: React.FC = () => {
  const { toast } = useToast();
  const { settingsMap, isLoading, updateSetting, isUpdating } = usePlatformSettings();
  const { logs: settingsLogs, isLoading: isLoadingLogs } = useSettingsAuditLogs(10);
  
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
  
  // Logo upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Email notification settings
  const [resendApiKey, setResendApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isApiKeySaved, setIsApiKeySaved] = useState(false);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [isSavingEmailSettings, setIsSavingEmailSettings] = useState(false);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('branding')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('branding')
        .getPublicUrl(fileName);

      setSiteLogoUrl(publicUrl);
      toast({
        title: "Logo uploaded",
        description: "Your logo has been uploaded successfully. Save to apply.",
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = () => {
    setSiteLogoUrl('');
  };

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
        updateSetting({ key: 'commission_type', value: commissionType, oldValue: settingsMap.commission_type }),
        updateSetting({ key: 'commission_rate', value: commissionRate, oldValue: settingsMap.commission_rate.toString() }),
        updateSetting({ key: 'min_payout_amount', value: minPayoutAmount, oldValue: settingsMap.min_payout_amount.toString() }),
        updateSetting({ key: 'auto_credit_on_complete', value: autoCreditOnComplete.toString(), oldValue: settingsMap.auto_credit_on_complete.toString() }),
        updateSetting({ key: 'auto_user_approval', value: autoUserApproval.toString(), oldValue: settingsMap.auto_user_approval.toString() }),
        updateSetting({ key: 'default_currency', value: defaultCurrency, oldValue: settingsMap.default_currency }),
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
        updateSetting({ key: 'resend_api_key', value: resendApiKey, oldValue: settingsMap.resend_api_key }),
        updateSetting({ key: 'email_notifications_enabled', value: emailNotificationsEnabled.toString(), oldValue: settingsMap.email_notifications_enabled.toString() }),
        updateSetting({ key: 'admin_email', value: adminEmail, oldValue: settingsMap.admin_email }),
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
        updateSetting({ key: 'resend_api_key', value: '', oldValue: settingsMap.resend_api_key }),
        updateSetting({ key: 'email_notifications_enabled', value: 'false', oldValue: settingsMap.email_notifications_enabled.toString() }),
        updateSetting({ key: 'admin_email', value: '', oldValue: settingsMap.admin_email }),
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
        updateSetting({ key: 'site_name', value: siteName, oldValue: settingsMap.site_name }),
        updateSetting({ key: 'site_logo_url', value: siteLogoUrl, oldValue: settingsMap.site_logo_url }),
        updateSetting({ key: 'landing_page_enabled', value: landingPageEnabled.toString(), oldValue: settingsMap.landing_page_enabled.toString() }),
        updateSetting({ key: 'landing_page_title', value: landingPageTitle, oldValue: settingsMap.landing_page_title }),
        updateSetting({ key: 'landing_page_subtitle', value: landingPageSubtitle, oldValue: settingsMap.landing_page_subtitle }),
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
                <Image className="w-4 h-4" /> Logo
              </Label>
              
              {/* Logo Preview */}
              {siteLogoUrl && (
                <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 max-w-md">
                  <img 
                    src={siteLogoUrl} 
                    alt="Logo preview" 
                    className="w-16 h-16 rounded-xl object-cover border border-border"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current Logo</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[200px]">{siteLogoUrl}</p>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Upload Button */}
              <div className="flex gap-2 max-w-md">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingLogo}
                  className="gap-2"
                >
                  {isUploadingLogo ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Upload Logo
                </Button>
                <span className="text-sm text-muted-foreground self-center">or</span>
                <Input
                  value={siteLogoUrl}
                  onChange={(e) => setSiteLogoUrl(e.target.value)}
                  placeholder="Enter logo URL"
                  className="flex-1"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Upload an image or enter a URL. Recommended size: 200x200px. Max 2MB.
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

            <div className="flex gap-2">
              <Button 
                onClick={handleSaveBrandingSettings} 
                disabled={isSavingBranding}
                className="gap-2"
              >
                {isSavingBranding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Branding Settings
              </Button>
              {landingPageEnabled && (
                <Button 
                  variant="outline" 
                  onClick={() => setShowPreview(true)}
                  className="gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Preview Landing Page
                </Button>
              )}
            </div>
          </CardContent>

          {/* Landing Page Preview Dialog */}
          <Dialog open={showPreview} onOpenChange={setShowPreview}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
              <DialogHeader className="p-4 border-b">
                <DialogTitle>Landing Page Preview</DialogTitle>
              </DialogHeader>
              <div className="bg-background">
                {/* Preview Header */}
                <div className="bg-background/80 backdrop-blur-lg border-b border-border">
                  <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {siteLogoUrl ? (
                        <img src={siteLogoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-lg">{siteName.charAt(0)}</span>
                        </div>
                      )}
                      <span className="font-bold text-xl text-foreground">{siteName}</span>
                    </div>
                    <Button size="sm">
                      Sign In
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                </div>

                {/* Preview Hero */}
                <div className="py-16 px-4 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
                  <div className="container mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/20 border border-accent/30 mb-6">
                      <Zap className="w-4 h-4 text-accent" />
                      <span className="text-sm text-white/80">The Future of Affiliate Commerce</span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                      {landingPageTitle || 'Empower Your Affiliate Network'}
                    </h1>
                    <p className="text-lg text-white/70 max-w-xl mx-auto mb-8">
                      {landingPageSubtitle || 'A private e-commerce platform where affiliates run their own storefronts.'}
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                        Get Started
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                      <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                        View Demo Store
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Preview Features */}
                <div className="py-12 px-4">
                  <div className="container mx-auto">
                    <h2 className="text-2xl font-bold text-foreground mb-8 text-center">Everything You Need</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {[
                        { icon: Store, title: 'Private Main Store' },
                        { icon: Users, title: 'Affiliate Storefronts' },
                        { icon: ShoppingCart, title: 'Smart Order Flow' },
                        { icon: Shield, title: 'Secure Payments' },
                        { icon: BarChart3, title: 'Real-time Analytics' },
                        { icon: Zap, title: 'Instant Setup' },
                      ].map((feature, index) => (
                        <div key={index} className="p-4 rounded-xl border border-border bg-card">
                          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                            <feature.icon className="w-5 h-5 text-accent" />
                          </div>
                          <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Preview Footer */}
                <div className="py-6 px-4 border-t border-border">
                  <div className="container mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {siteLogoUrl ? (
                        <img src={siteLogoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                          <span className="text-primary-foreground font-bold text-sm">{siteName.charAt(0)}</span>
                        </div>
                      )}
                      <span className="font-semibold text-foreground">{siteName}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">© 2024 {siteName}. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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

        {/* Security - MFA Settings */}
        <MFASettings />

        {/* Settings Change History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-slate-500/10 flex items-center justify-center">
                <History className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Settings Change History</CardTitle>
                <CardDescription>
                  Recent modifications to platform settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoadingLogs ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : settingsLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No settings changes recorded yet.</p>
              </div>
            ) : (
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-3">
                  {settingsLogs.map((log) => {
                    const settingKey = log.new_value ? Object.keys(log.new_value)[0] : 'unknown';
                    const newValue = log.new_value ? Object.values(log.new_value)[0] : null;
                    const oldValue = log.old_value ? Object.values(log.old_value)[0] : null;
                    
                    // Format display values
                    const formatValue = (val: any) => {
                      if (val === null || val === undefined) return 'N/A';
                      if (typeof val === 'boolean') return val ? 'Enabled' : 'Disabled';
                      if (val === 'true') return 'Enabled';
                      if (val === 'false') return 'Disabled';
                      if (String(val).length > 30) return String(val).substring(0, 30) + '...';
                      return String(val);
                    };

                    // Format setting key for display
                    const formatSettingKey = (key: string) => {
                      return key
                        .replace(/_/g, ' ')
                        .replace(/\b\w/g, l => l.toUpperCase());
                    };

                    return (
                      <div 
                        key={log.id} 
                        className="p-3 rounded-lg bg-muted/50 border border-border/50 hover:bg-muted/70 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge variant="outline" className="text-xs font-mono">
                                {formatSettingKey(settingKey)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <div className="mt-1.5 flex items-center gap-2 text-sm">
                              {oldValue !== null && (
                                <>
                                  <span className="text-muted-foreground line-through">
                                    {formatValue(oldValue)}
                                  </span>
                                  <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                </>
                              )}
                              <span className="font-medium text-foreground">
                                {formatValue(newValue)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {new Date(log.created_at).toLocaleTimeString()}
                            </div>
                            {log.admin_email && (
                              <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                                {log.admin_email}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

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
