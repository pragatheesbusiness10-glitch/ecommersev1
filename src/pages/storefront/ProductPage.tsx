import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { 
  ArrowLeft, 
  ShoppingBag, 
  Loader2, 
  Package, 
  Minus, 
  Plus,
  Store,
  AlertTriangle,
  MessageSquare
} from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ShopifyCheckout, CheckoutData } from '@/components/checkout/ShopifyCheckout';
import { cn } from '@/lib/utils';

interface ProductDetails {
  id: string;
  product_id: string;
  selling_price: number;
  custom_description: string | null;
  is_active: boolean;
  user_id: string;
  product: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    category: string | null;
    stock: number;
  };
  store: {
    storefront_name: string | null;
    storefront_slug: string | null;
  };
}

const ProductPage = () => {
  const { slug, productId } = useParams<{ slug: string; productId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { settings: publicSettings } = usePublicSettings();

  // Fetch product details
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['public-product', productId],
    queryFn: async () => {
      if (!productId) return null;

      const { data, error } = await supabase
        .from('storefront_products')
        .select(`
          id,
          product_id,
          selling_price,
          custom_description,
          is_active,
          user_id,
          products!inner(
            id,
            name,
            description,
            image_url,
            category,
            stock
          )
        `)
        .eq('id', productId)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching product:', error);
        throw error;
      }

      if (!data) return null;

      // Fetch store info
      const { data: storeData } = await supabase
        .from('profiles')
        .select('storefront_name, storefront_slug')
        .eq('user_id', data.user_id)
        .single();

      const productsData = data.products as unknown as ProductDetails['product'];

      return {
        id: data.id,
        product_id: data.product_id,
        selling_price: Number(data.selling_price),
        custom_description: data.custom_description,
        is_active: data.is_active,
        user_id: data.user_id,
        product: productsData,
        store: storeData || { storefront_name: null, storefront_slug: null },
      } as ProductDetails;
    },
    enabled: !!productId,
  });

  const handleQuantityChange = (delta: number) => {
    const newQuantity = quantity + delta;
    if (newQuantity >= 1 && newQuantity <= (product?.product.stock || 1)) {
      setQuantity(newQuantity);
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    
    // Check if ordering is enabled
    if (!publicSettings.storefront_ordering_enabled) {
      toast({
        title: 'Ordering Disabled',
        description: publicSettings.storefront_ordering_disabled_message,
        variant: 'destructive',
      });
      return;
    }

    if (product.product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: 'This product is currently out of stock.',
        variant: 'destructive',
      });
      return;
    }

    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = async (data: CheckoutData) => {
    if (!product) return;

    setIsSubmitting(true);
    try {
      const { data: response, error } = await supabase.functions.invoke('create-public-order', {
        body: {
          storefront_product_id: product.id,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone || undefined,
          customer_address: data.customerAddress,
          quantity: quantity,
        },
      });

      if (error) throw error;
      if (!response?.success) {
        throw new Error(response?.error || 'Failed to place order');
      }

      toast({
        title: 'Order Placed Successfully!',
        description: `Your order #${response.order_number} has been placed. Check your email for details.`,
      });

      setIsCheckoutOpen(false);
      navigate(`/store/${slug}`);
    } catch (error: any) {
      console.error('Error placing order:', error);
      toast({
        title: 'Order Failed',
        description: error.message || 'Failed to place order. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-10 h-10 text-destructive" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Product Not Found</h1>
            <p className="text-muted-foreground">
              The product you're looking for doesn't exist or is no longer available.
            </p>
          </div>
          <Button onClick={() => navigate(`/store/${slug}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Button>
        </div>
      </div>
    );
  }

  const isOutOfStock = product.product.stock <= 0;
  const totalPrice = product.selling_price * quantity;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              className="gap-2"
              onClick={() => navigate(`/store/${slug}`)}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Store
            </Button>
            {product.store.storefront_name && (
              <Link 
                to={`/store/${product.store.storefront_slug}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Store className="w-4 h-4" />
                <span className="font-medium">{product.store.storefront_name}</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Product Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Ordering Disabled Banner */}
        {!publicSettings.storefront_ordering_enabled && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {publicSettings.storefront_ordering_disabled_message}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Product Image */}
          <div className="space-y-4">
            <div className="relative aspect-square rounded-3xl overflow-hidden bg-card border border-border">
              {product.product.image_url ? (
                <img
                  src={product.product.image_url}
                  alt={product.product.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Package className="w-24 h-24 text-muted-foreground/50" />
                </div>
              )}
              {product.product.category && (
                <div className="absolute top-6 right-6">
                  <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm shadow-lg text-sm px-4 py-1">
                    {product.product.category}
                  </Badge>
                </div>
              )}
              {isOutOfStock && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center">
                  <Badge variant="destructive" className="text-lg px-6 py-2">
                    Out of Stock
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Product Details */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
                {product.product.name}
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                {product.custom_description || product.product.description || 'Premium quality product'}
              </p>
            </div>

            {/* Price */}
            <div className="py-6 border-y border-border">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  ₹{product.selling_price.toFixed(2)}
                </span>
              </div>
              {!isOutOfStock && (
                <p className="text-sm text-muted-foreground mt-2">
                  {product.product.stock} items available
                </p>
              )}
            </div>

            {/* Quantity Selector */}
            {!isOutOfStock && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">Quantity</label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center border border-border rounded-xl overflow-hidden">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-12 w-12"
                      onClick={() => handleQuantityChange(-1)}
                      disabled={quantity <= 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-16 text-center font-semibold text-lg">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-none h-12 w-12"
                      onClick={() => handleQuantityChange(1)}
                      disabled={quantity >= product.product.stock}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-muted-foreground">
                    Total: <span className="font-bold text-foreground">₹{totalPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Buy Now Button */}
            <Button
              size="lg"
              className={cn(
                "w-full h-14 text-lg font-semibold rounded-2xl gap-3",
                "shadow-lg hover:shadow-xl transition-all duration-300",
                (isOutOfStock || !publicSettings.storefront_ordering_enabled) && "opacity-50 cursor-not-allowed"
              )}
              onClick={handleBuyNow}
              disabled={isOutOfStock || !publicSettings.storefront_ordering_enabled}
            >
              <ShoppingBag className="w-5 h-5" />
              {!publicSettings.storefront_ordering_enabled 
                ? 'Ordering Disabled' 
                : isOutOfStock 
                  ? 'Out of Stock' 
                  : 'Buy Now'}
            </Button>

            {/* Additional Info */}
            <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
              <h3 className="font-semibold text-foreground">Product Information</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">SKU</span>
                  <span className="font-medium text-foreground">{product.product_id.slice(0, 8).toUpperCase()}</span>
                </div>
                {product.product.category && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium text-foreground">{product.product.category}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Availability</span>
                  <span className={cn(
                    "font-medium",
                    isOutOfStock ? "text-destructive" : "text-green-600 dark:text-green-400"
                  )}>
                    {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
          <ShopifyCheckout
            cart={[{
              id: product.id,
              name: product.product.name,
              price: product.selling_price,
              quantity: quantity,
              image: product.product.image_url || undefined,
            }]}
            total={totalPrice}
            storeName={product.store.storefront_name || 'Store'}
            onBack={() => setIsCheckoutOpen(false)}
            onSubmit={handleSubmitOrder}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductPage;
