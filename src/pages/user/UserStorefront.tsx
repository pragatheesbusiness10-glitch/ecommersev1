import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { useProducts, StorefrontProduct } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Settings, 
  Trash2, 
  Edit,
  MoreVertical,
  Eye,
  EyeOff,
  Loader2,
  Save,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const storefrontSchema = z.object({
  storefrontName: z.string().trim().min(3, 'Storefront name must be at least 3 characters').max(50, 'Storefront name must be less than 50 characters'),
  storefrontSlug: z.string().trim().min(3, 'Slug must be at least 3 characters').max(30, 'Slug must be less than 30 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
});

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

const UserStorefront: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { storefrontProducts, updateStorefrontProduct, removeFromStorefront, isLoading } = useProducts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [storefrontName, setStorefrontName] = useState(user?.storefrontName || '');
  const [storefrontSlug, setStorefrontSlug] = useState(user?.storefrontSlug || '');
  const [storefrontBanner, setStorefrontBanner] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setStorefrontName(user?.storefrontName || '');
    setStorefrontSlug(user?.storefrontSlug || '');
    // Fetch banner from profile
    const fetchBanner = async () => {
      if (user?.id) {
        const { data } = await supabase
          .from('profiles')
          .select('storefront_banner')
          .eq('user_id', user.id)
          .maybeSingle();
        if (data?.storefront_banner) {
          setStorefrontBanner(data.storefront_banner);
        }
      }
    };
    fetchBanner();
  }, [user?.storefrontName, user?.storefrontSlug, user?.id]);

  const filteredProducts = storefrontProducts.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sp.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const storefrontUrl = user?.storefrontSlug ? `/store/${user.storefrontSlug}` : null;

  const handleCopyUrl = () => {
    if (storefrontUrl) {
      navigator.clipboard.writeText(window.location.origin + storefrontUrl);
      toast({
        title: 'URL Copied',
        description: 'Storefront URL has been copied to clipboard.',
      });
    }
  };

  const handleToggleProduct = async (product: StorefrontProduct) => {
    try {
      await updateStorefrontProduct({
        id: product.id,
        isActive: !product.is_active,
      });
      toast({
        title: product.is_active ? 'Product Hidden' : 'Product Visible',
        description: `Product has been ${product.is_active ? 'hidden from' : 'shown on'} your storefront.`,
      });
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleRemoveProduct = async (product: StorefrontProduct) => {
    try {
      await removeFromStorefront(product.id);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleSaveSettings = async () => {
    setErrors({});
    
    try {
      const validated = storefrontSchema.parse({ storefrontName, storefrontSlug });
      setIsSaving(true);

      // Check if slug is already taken
      const { data: existingSlug } = await supabase
        .from('profiles')
        .select('id')
        .eq('storefront_slug', validated.storefrontSlug)
        .neq('user_id', user?.id || '')
        .maybeSingle();

      if (existingSlug) {
        setErrors({ storefrontSlug: 'This URL is already taken. Please choose another.' });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          storefront_name: validated.storefrontName,
          storefront_slug: validated.storefrontSlug,
          storefront_banner: storefrontBanner || DEFAULT_BANNER,
        })
        .eq('user_id', user?.id || '');

      if (error) throw error;

      toast({
        title: 'Settings Saved',
        description: 'Your storefront settings have been updated.',
      });
      setIsSettingsOpen(false);
      
      // Refresh the page to update user context
      window.location.reload();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      } else {
        console.error('Error saving settings:', error);
        toast({
          title: 'Error',
          description: 'Could not save settings. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 30);
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Storefront</h1>
            <p className="text-muted-foreground mt-1">
              Manage products listed on your public storefront.
            </p>
          </div>
          <Button asChild>
            <Link to="/dashboard/products">Add More Products</Link>
          </Button>
        </div>

        {/* Storefront URL Card */}
        <div className="dashboard-card">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {user?.storefrontName || 'Set up your storefront'}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {storefrontUrl ? 'Share this link with your customers' : 'Configure your storefront to start selling'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {storefrontUrl ? (
                <>
                  <div className="flex-1 lg:flex-none">
                    <Input
                      readOnly
                      value={window.location.origin + storefrontUrl}
                      className="w-full lg:w-80 bg-muted/50 font-mono text-sm"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={handleCopyUrl}>
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="icon" asChild>
                    <Link to={storefrontUrl} target="_blank">
                      <ExternalLink className="w-4 h-4" />
                    </Link>
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No storefront URL configured</p>
              )}
              <Button variant="outline" size="icon" onClick={() => setIsSettingsOpen(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-foreground">{storefrontProducts.length}</p>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </div>
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-green-600">
              {storefrontProducts.filter(p => p.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Products</p>
          </div>
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-muted-foreground">
              {storefrontProducts.filter(p => !p.is_active).length}
            </p>
            <p className="text-sm text-muted-foreground">Hidden Products</p>
          </div>
        </div>

        {/* Search */}
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        {/* Products List */}
        <div className="space-y-4">
          {filteredProducts.map((sp, index) => (
            <div 
              key={sp.id}
              className="dashboard-card flex flex-col sm:flex-row sm:items-center gap-4 opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              {sp.product.image_url ? (
                <img 
                  src={sp.product.image_url} 
                  alt={sp.product.name}
                  className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                  <span className="text-xs text-muted-foreground">No image</span>
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{sp.product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {sp.custom_description || sp.product.description || 'No description'}
                    </p>
                  </div>
                  <Badge variant={sp.is_active ? 'active' : 'inactive'}>
                    {sp.is_active ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Price</p>
                    <p className="font-bold text-lg text-foreground">${sp.selling_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Base Cost</p>
                    <p className="font-medium text-muted-foreground">${sp.product.base_price.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Profit</p>
                    <p className="font-semibold text-green-600">
                      ${(sp.selling_price - sp.product.base_price).toFixed(2)}
                    </p>
                  </div>
                  {sp.product.category && (
                    <Badge variant="secondary">{sp.product.category}</Badge>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 sm:flex-shrink-0">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Pricing
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleToggleProduct(sp)}>
                      {sp.is_active ? (
                        <>
                          <EyeOff className="w-4 h-4 mr-2" />
                          Hide from Store
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4 mr-2" />
                          Show on Store
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleRemoveProduct(sp)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              {storefrontProducts.length === 0 
                ? "You haven't added any products to your storefront yet."
                : "No products found matching your search."}
            </p>
            {storefrontProducts.length === 0 && (
              <Button asChild>
                <Link to="/dashboard/products">Browse Products</Link>
              </Button>
            )}
          </div>
        )}

        {/* Storefront Settings Dialog */}
        <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Storefront Settings</DialogTitle>
              <DialogDescription>
                Configure your storefront name and URL. This is how customers will find your store.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
              <div className="grid gap-2">
                <Label htmlFor="storefront-name">Storefront Name</Label>
                <Input
                  id="storefront-name"
                  placeholder="My Awesome Store"
                  value={storefrontName}
                  onChange={(e) => {
                    setStorefrontName(e.target.value);
                    if (!storefrontSlug || storefrontSlug === generateSlug(user?.storefrontName || '')) {
                      setStorefrontSlug(generateSlug(e.target.value));
                    }
                  }}
                  className={errors.storefrontName ? 'border-destructive' : ''}
                />
                {errors.storefrontName && (
                  <p className="text-sm text-destructive">{errors.storefrontName}</p>
                )}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storefront-slug">Storefront URL</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{window.location.origin}/store/</span>
                  <Input
                    id="storefront-slug"
                    placeholder="my-store"
                    value={storefrontSlug}
                    onChange={(e) => setStorefrontSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className={`flex-1 ${errors.storefrontSlug ? 'border-destructive' : ''}`}
                  />
                </div>
                {errors.storefrontSlug && (
                  <p className="text-sm text-destructive">{errors.storefrontSlug}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens. This will be your public store URL.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="storefront-banner">Banner Image URL</Label>
                <Input
                  id="storefront-banner"
                  placeholder="https://example.com/banner.jpg"
                  value={storefrontBanner}
                  onChange={(e) => setStorefrontBanner(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL for your store's hero banner image. Leave empty to use the default banner.
                </p>
                {storefrontBanner && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                    <img 
                      src={storefrontBanner} 
                      alt="Banner preview" 
                      className="w-full h-24 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BANNER;
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
                    <p className="absolute bottom-2 left-2 text-xs text-muted-foreground">Preview</p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setIsSettingsOpen(false)}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveSettings} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Settings
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserStorefront;
