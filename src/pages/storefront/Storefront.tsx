import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { mockUsers, mockStorefrontProducts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  X,
  ArrowRight,
  Store
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StorefrontProduct } from '@/types';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet';

interface CartItem {
  product: StorefrontProduct;
  quantity: number;
}

const Storefront: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Find the user by storefront slug
  const storeOwner = mockUsers.find(u => u.storefrontSlug === slug);
  
  // Get products for this storefront
  const storefrontProducts = mockStorefrontProducts.filter(
    sp => sp.userId === storeOwner?.id && sp.isActive
  );

  const filteredProducts = storefrontProducts.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addToCart = (product: StorefrontProduct) => {
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
    (sum, item) => sum + item.product.sellingPrice * item.quantity,
    0
  );

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (!storeOwner) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Store className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Store Not Found</h1>
          <p className="text-muted-foreground mb-4">The store you're looking for doesn't exist.</p>
          <Button asChild>
            <Link to="/">Go Home</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold">
                  {storeOwner.name.charAt(0)}
                </span>
              </div>
              <div>
                <h1 className="font-bold text-foreground">{storeOwner.storefrontName}</h1>
                <p className="text-xs text-muted-foreground">by {storeOwner.name}</p>
              </div>
            </div>

            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Sheet open={isCartOpen} onOpenChange={setIsCartOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span className="hidden sm:inline">Cart</span>
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center bg-accent text-accent-foreground">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="flex flex-col">
                <SheetHeader>
                  <SheetTitle>Shopping Cart</SheetTitle>
                  <SheetDescription>
                    {cart.length === 0 ? 'Your cart is empty' : `${cartItemCount} item(s) in your cart`}
                  </SheetDescription>
                </SheetHeader>
                
                <div className="flex-1 overflow-y-auto py-4 space-y-4">
                  {cart.map(item => (
                    <div key={item.product.id} className="flex gap-4 p-4 rounded-xl bg-muted/50">
                      <img
                        src={item.product.product.image}
                        alt={item.product.product.name}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">
                          {item.product.product.name}
                        </h4>
                        <p className="text-sm text-accent font-semibold">
                          ${item.product.sellingPrice.toFixed(2)}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => updateQuantity(item.product.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground"
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
                      <div className="flex justify-between text-lg font-semibold">
                        <span>Total</span>
                        <span>${cartTotal.toFixed(2)}</span>
                      </div>
                      <Button className="w-full gap-2" size="lg">
                        Checkout
                        <ArrowRight className="w-4 h-4" />
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Welcome to {storeOwner.storefrontName}
          </h2>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto">
            Discover our curated collection of premium products at great prices.
          </p>
        </div>
      </section>

      {/* Products */}
      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-2xl font-bold text-foreground">
            Our Products
            <span className="text-muted-foreground font-normal text-base ml-2">
              ({filteredProducts.length})
            </span>
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((sp, index) => (
            <div
              key={sp.id}
              className="group bg-card rounded-2xl border border-border overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="relative aspect-square overflow-hidden">
                <img
                  src={sp.product.image}
                  alt={sp.product.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute top-3 right-3">
                  <Badge variant="secondary" className="bg-card/90 backdrop-blur-sm">
                    {sp.product.category}
                  </Badge>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                    {sp.product.name}
                  </h3>
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                    {sp.customDescription || sp.product.description}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <p className="text-2xl font-bold text-foreground">
                    ${sp.sellingPrice.toFixed(2)}
                  </p>
                  <Button
                    variant="accent"
                    size="sm"
                    onClick={() => addToCart(sp)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found.</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} {storeOwner.storefrontName}. Powered by Afflux.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Storefront;
