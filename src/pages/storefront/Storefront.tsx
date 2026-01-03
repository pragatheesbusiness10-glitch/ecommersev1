import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicStorefront, PublicStorefrontProduct } from '@/hooks/usePublicStorefront';
import { usePublicSettings } from '@/hooks/usePublicSettings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X,
  ArrowRight,
  Store,
  Loader2,
  Sparkles,
  Star,
  MessageSquare,
  AlertTriangle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { ShopifyCheckout, CheckoutData } from '@/components/checkout/ShopifyCheckout';

interface CartItem {
  product: PublicStorefrontProduct;
  quantity: number;
}

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

const Storefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { store, products, isLoading, isStoreNotFound } = usePublicStorefront(slug);
  const { settings: publicSettings, isLoading: isLoadingSettings } = usePublicSettings();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bannerUrl = store?.storefront_banner || DEFAULT_BANNER;

  const filteredProducts = products.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sp.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: PublicStorefrontProduct) => {
    // Check if ordering is enabled
    if (!publicSettings.storefront_ordering_enabled) {
      toast({
        title: 'Ordering Disabled',
        description: publicSettings.storefront_ordering_disabled_message,
        variant: 'destructive',
      });
      return;
    }

    // Check if product is in stock
    if (product.product.stock <= 0) {
      toast({
        title: 'Out of Stock',
        description: `${product.product.name} is currently out of stock.`,
        variant: 'destructive',
      });
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        // Check stock limit
        if (existing.quantity >= product.product.stock) {
          toast({
            title: 'Maximum Quantity Reached',
            description: `Only ${product.product.stock} units available.`,
            variant: 'destructive',
          });
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    toast({
      title: 'Added to Cart',
      description: `${product.product.name} has been added to your cart.`,
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => 
      prev.map(item => {
        if (item.product.id === productId) {
          const newQuantity = item.quantity + delta;
          // Check stock limit when increasing
          if (delta > 0 && newQuantity > item.product.product.stock) {
            toast({
              title: 'Maximum Quantity Reached',
              description: `Only ${item.product.product.stock} units available.`,
              variant: 'destructive',
            });
            return item;
          }
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.product.selling_price * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleCheckout = () => {
    if (!publicSettings.storefront_ordering_enabled) {
      toast({
        title: 'Ordering Disabled',
        description: publicSettings.storefront_ordering_disabled_message,
        variant: 'destructive',
      });
      return;
    }
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = async (data: CheckoutData) => {
    setIsSubmitting(true);

    try {
      // Create orders via secure edge function
      for (const item of cart) {
        const { data: response, error } = await supabase.functions.invoke('create-public-order', {
          body: {
            storefront_product_id: item.product.id,
            customer_name: data.customerName,
            customer_email: data.customerEmail,
            customer_phone: data.customerPhone || undefined,
            customer_address: data.customerAddress,
            quantity: item.quantity,
          },
        });

        if (error) {
          console.error('Order creation error:', error);
          throw new Error(error.message || 'Failed to create order');
        }

        // Check if order creation is disabled or blocked
        if (response?.disabled) {
          throw new Error(response?.error || 'Order creation is currently disabled. Please contact the store owner to place your order.');
        }

        if (!response?.success) {
          throw new Error(response?.error || 'Failed to create order');
        }
      }

      setCart([]);
    } catch (error) {
      console.error('Order error:', error);
      toast({
        title: 'Order Failed',
        description: error instanceof Error ? error.message : 'Order not available. Please contact the store owner.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseCheckout = () => {
    setIsCheckoutOpen(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground animate-pulse">Loading store...</p>
        </div>
      </div>
    );
  }

  if (isStoreNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
        <div className="text-center animate-fade-in">
          <Store className="w-20 h-20 text-muted-foreground mx-auto mb-6" />
          <h1 className="text-3xl font-bold text-foreground mb-3">Store Not Found</h1>
          <p className="text-muted-foreground mb-6">The store you're looking for doesn't exist.</p>
          <Button asChild size="lg">
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  // Transform cart for ShopifyCheckout
  const checkoutCart = cart.map(item => ({
    id: item.product.id,
    name: item.product.product.name,
    price: item.product.selling_price,
    quantity: item.quantity,
    image: item.product.product.image_url || undefined,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300">
                <span className="text-primary-foreground font-bold text-lg">
                  {store?.display_name?.charAt(0) || store?.storefront_name?.charAt(0) || 'S'}
                </span>
              </div>
              <div>
                <h1 className="font-bold text-foreground text-lg">{store?.storefront_name || 'Store'}</h1>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  by {store?.display_name || store?.storefront_name}
                </p>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 h-11 rounded-full border-2 focus:border-primary transition-all"
                />
              </div>
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative gap-2 rounded-full h-11 px-5 hover:bg-accent/10 hover:border-accent transition-all duration-300">
                  <ShoppingCart className="w-5 h-5" />
                  <span className="hidden sm:inline font-medium">Cart</span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center bg-accent text-accent-foreground animate-scale-in font-bold">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingCart className="w-5 h-5" />
                    Shopping Cart
                  </SheetTitle>
                  <SheetDescription>
                    {cart.length === 0 ? 'Your cart is empty' : `${cartItemCount} item(s) in your cart`}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {cart.map((item, index) => (
                    <div 
                      key={item.product.id} 
                      className="flex gap-4 p-4 rounded-2xl bg-muted/50 animate-slide-up hover:bg-muted transition-colors"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {item.product.product.image_url ? (
                        <img
                          src={item.product.product.image_url}
                          alt={item.product.product.name}
                          className="w-20 h-20 rounded-xl object-cover shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center">
                          <span className="text-xs text-muted-foreground">No image</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-foreground truncate">
                          {item.product.product.name}
                        </h4>
                        <p className="text-sm text-accent font-bold">
                          ₹{item.product.selling_price.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-bold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive rounded-full"
                        onClick={() => removeFromCart(item.product.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {cart.length > 0 && (
                  <SheetFooter className="border-t border-border pt-4">
                    <div className="w-full space-y-4">
                      <div className="flex justify-between text-xl font-bold">
                        <span>Total</span>
                        <span className="text-accent">₹{cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full gap-2 h-12 rounded-full text-lg" size="lg" onClick={handleCheckout}>
                        Checkout
                        <ArrowRight className="w-5 h-5" />
                      </Button>
                    </div>
                  </SheetFooter>
                )}
              </SheetContent>
            </Sheet>
          </div>

          {/* Mobile Search */}
          <div className="md:hidden mt-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 rounded-full"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative h-[300px] md:h-[400px] overflow-hidden">
        <img 
          src={bannerUrl}
          alt="Store banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center px-4 animate-fade-in">
            <Badge className="mb-4 bg-accent/90 text-accent-foreground">
              <Star className="w-3 h-3 mr-1" />
              Featured Store
            </Badge>
            <h2 className="text-4xl md:text-6xl font-bold text-foreground mb-4 drop-shadow-lg">
              {store?.storefront_name || 'Our Store'}
            </h2>
            <p className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto drop-shadow">
              Discover amazing products at great prices
            </p>
          </div>
        </div>
      </section>

      {/* Greeting Message */}
      {publicSettings.storefront_greeting_message && (
        <div className="container mx-auto px-4 pt-8">
          <Alert className="bg-primary/5 border-primary/20">
            <MessageSquare className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground">
              {publicSettings.storefront_greeting_message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Ordering Disabled Banner */}
      {!publicSettings.storefront_ordering_enabled && (
        <div className="container mx-auto px-4 pt-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {publicSettings.storefront_ordering_disabled_message}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Products */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-3xl font-bold text-foreground">
              Our Products
            </h3>
            <p className="text-muted-foreground mt-1">
              {filteredProducts.length} products available
            </p>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">This store doesn't have any products yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map((sp, index) => (
              <div
                key={sp.id}
                className={cn(
                  "group bg-card rounded-3xl border border-border overflow-hidden",
                  "transition-all duration-500 hover:shadow-2xl hover:-translate-y-2 hover:border-accent/30",
                  "opacity-0 animate-slide-up"
                )}
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
              >
                <Link to={`/store/${slug}/product/${sp.id}`} className="block">
                  <div className="relative aspect-square overflow-hidden">
                    {sp.product.image_url ? (
                      <img
                        src={sp.product.image_url}
                        alt={sp.product.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                        <span className="text-muted-foreground">No image</span>
                      </div>
                    )}
                    {sp.product.category && (
                      <div className="absolute top-4 right-4">
                        <Badge variant="secondary" className="bg-card/95 backdrop-blur-sm shadow-lg">
                          {sp.product.category}
                        </Badge>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>

                  <div className="p-5 space-y-4">
                    <div>
                      <h3 className="font-bold text-lg text-foreground line-clamp-1 group-hover:text-accent transition-colors duration-300">
                        {sp.product.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1 min-h-[40px]">
                        {sp.custom_description || sp.product.description || 'Premium quality product'}
                      </p>
                    </div>
                  </div>
                </Link>

                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ₹{sp.selling_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        asChild
                      >
                        <Link to={`/store/${slug}/product/${sp.id}`}>
                          Buy Now
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        className="rounded-full gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        onClick={() => addToCart(sp)}
                      >
                        <Plus className="w-4 h-4" />
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredProducts.length === 0 && products.length > 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground text-lg">No products found matching your search.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gradient-to-t from-muted to-background border-t border-border py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">
                {store?.display_name?.charAt(0) || store?.storefront_name?.charAt(0) || 'S'}
              </span>
            </div>
            <span className="font-bold text-foreground">{store?.storefront_name}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {store?.storefront_name || 'Store'}. Powered by Afflux.
          </p>
        </div>
      </footer>

      {/* Shopify-style Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden">
          <ShopifyCheckout
            cart={checkoutCart}
            total={cartTotal}
            storeName={store?.storefront_name || 'Store'}
            onSubmit={handleSubmitOrder}
            onBack={handleCloseCheckout}
            isSubmitting={isSubmitting}
            onUpdateQuantity={updateQuantity}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Storefront;
