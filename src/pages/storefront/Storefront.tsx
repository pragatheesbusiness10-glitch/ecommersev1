import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePublicStorefront, PublicStorefrontProduct } from '@/hooks/usePublicStorefront';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X,
  ArrowRight,
  Store,
  Loader2,
  CheckCircle,
  Sparkles,
  Star
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { cn } from '@/lib/utils';

interface CartItem {
  product: PublicStorefrontProduct;
  quantity: number;
}

const checkoutSchema = z.object({
  customerName: z.string().trim().min(2, 'Name is required').max(100),
  customerEmail: z.string().trim().email('Valid email is required'),
  customerPhone: z.string().trim().optional(),
  customerAddress: z.string().trim().min(10, 'Address must be at least 10 characters').max(500),
});

const DEFAULT_BANNER = 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&h=400&fit=crop';

const Storefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const { store, products, isLoading, isStoreNotFound } = usePublicStorefront(slug);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  const bannerUrl = store?.storefront_banner || DEFAULT_BANNER;

  const filteredProducts = products.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (sp.product.category?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: PublicStorefrontProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
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
    setIsCartOpen(false);
    setIsCheckoutOpen(true);
  };

  const handleSubmitOrder = async () => {
    setErrors({});
    
    try {
      const validated = checkoutSchema.parse({
        customerName,
        customerEmail,
        customerPhone: customerPhone || undefined,
        customerAddress,
      });

      setIsSubmitting(true);

      const orderPromises = cart.map(async (item) => {
        const { data: productData } = await supabase
          .from('products')
          .select('base_price')
          .eq('id', item.product.product_id)
          .single();

        const basePrice = productData?.base_price || 0;

        const { error } = await supabase
          .from('orders')
          .insert({
            storefront_product_id: item.product.id,
            affiliate_user_id: store?.user_id || '',
            customer_name: validated.customerName,
            customer_email: validated.customerEmail,
            customer_phone: validated.customerPhone || null,
            customer_address: validated.customerAddress,
            quantity: item.quantity,
            selling_price: item.product.selling_price,
            base_price: Number(basePrice),
            status: 'pending_payment',
            order_number: `ORD-${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`,
          });

        if (error) throw error;
      });

      await Promise.all(orderPromises);

      setOrderSuccess(true);
      setCart([]);
      setCustomerName('');
      setCustomerEmail('');
      setCustomerPhone('');
      setCustomerAddress('');

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
        console.error('Order error:', error);
        toast({
          title: 'Order Failed',
          description: 'Could not place order. Please try again.',
          variant: 'destructive',
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseSuccess = () => {
    setOrderSuccess(false);
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

                  <div className="flex items-center justify-between pt-3 border-t border-border">
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        ₹{sp.selling_price.toFixed(2)}
                      </p>
                    </div>
                    <Button
                      className="rounded-full gap-2 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      onClick={() => addToCart(sp)}
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </Button>
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

      {/* Checkout Dialog */}
      <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
        <DialogContent className="sm:max-w-[500px]">
          {orderSuccess ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-center">
                  <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                  Order Placed Successfully!
                </DialogTitle>
                <DialogDescription className="text-center">
                  Thank you for your order. You will receive an email with payment instructions.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button onClick={handleCloseSuccess} className="w-full">
                  Continue Shopping
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Complete Your Order</DialogTitle>
                <DialogDescription>
                  Enter your details to proceed with your order of ₹{cartTotal.toFixed(2)}.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    placeholder="Enter your full name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className={errors.customerName ? 'border-destructive' : ''}
                  />
                  {errors.customerName && (
                    <p className="text-sm text-destructive">{errors.customerName}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className={errors.customerEmail ? 'border-destructive' : ''}
                  />
                  {errors.customerEmail && (
                    <p className="text-sm text-destructive">{errors.customerEmail}</p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Enter your phone number"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your complete delivery address"
                    value={customerAddress}
                    onChange={(e) => setCustomerAddress(e.target.value)}
                    rows={3}
                    className={errors.customerAddress ? 'border-destructive' : ''}
                  />
                  {errors.customerAddress && (
                    <p className="text-sm text-destructive">{errors.customerAddress}</p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmitOrder} disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Place Order
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Storefront;