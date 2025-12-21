import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductCard } from '@/components/dashboard/ProductCard';
import { mockProducts, mockStorefrontProducts } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Store } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Product } from '@/types';

const UserProducts: React.FC = () => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [sellingPrice, setSellingPrice] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const { toast } = useToast();

  // Products already in user's storefront
  const userStorefrontProductIds = mockStorefrontProducts
    .filter(sp => sp.userId === user?.id)
    .map(sp => sp.productId);

  const filteredProducts = mockProducts.filter(product =>
    product.isActive &&
    (product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddToStorefront = (product: Product) => {
    setSelectedProduct(product);
    setSellingPrice((product.basePrice * 1.3).toFixed(2)); // Default 30% markup
    setCustomDescription('');
    setIsAddDialogOpen(true);
  };

  const handleConfirmAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    const price = parseFloat(sellingPrice);
    if (price <= selectedProduct.basePrice) {
      toast({
        title: 'Invalid Price',
        description: 'Selling price must be higher than the base price.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Product Added',
      description: `${selectedProduct.name} has been added to your storefront at $${price.toFixed(2)}.`,
    });
    setIsAddDialogOpen(false);
    setSelectedProduct(null);
  };

  const categories = [...new Set(mockProducts.map(p => p.category))];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Browse Products</h1>
            <p className="text-muted-foreground mt-1">
              Add products from the main catalog to your storefront with custom pricing.
            </p>
          </div>
          <Button variant="outline" className="gap-2">
            <Store className="w-4 h-4" />
            View My Storefront
          </Button>
        </div>

        {/* Info Banner */}
        <div className="dashboard-card bg-muted/50 border-muted">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">How it works:</strong> Browse products below and add them to your storefront. 
            Set your own selling price (must be higher than the base price shown). Your profit = Selling Price - Base Price.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="w-4 h-4" />
              All
            </Button>
            {categories.map(category => (
              <Button key={category} variant="ghost" size="sm">
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product, index) => {
            const isInStorefront = userStorefrontProductIds.includes(product.id);
            return (
              <div key={product.id} className="relative">
                {isInStorefront && (
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ In Storefront
                    </span>
                  </div>
                )}
                <ProductCard
                  product={product}
                  mode="user"
                  onAddToStorefront={isInStorefront ? undefined : handleAddToStorefront}
                  delay={index * 50}
                />
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No products found matching your search.</p>
          </div>
        )}

        {/* Add to Storefront Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleConfirmAdd}>
              <DialogHeader>
                <DialogTitle>Add to Storefront</DialogTitle>
                <DialogDescription>
                  Set your selling price for this product. Your profit is the difference between your price and the base price.
                </DialogDescription>
              </DialogHeader>
              {selectedProduct && (
                <div className="py-4 space-y-4">
                  <div className="flex gap-4 p-4 rounded-xl bg-muted/50">
                    <img 
                      src={selectedProduct.image} 
                      alt={selectedProduct.name}
                      className="w-20 h-20 rounded-lg object-cover"
                    />
                    <div>
                      <h3 className="font-semibold">{selectedProduct.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {selectedProduct.description}
                      </p>
                      <p className="text-sm font-medium text-accent mt-1">
                        Base Price: ${selectedProduct.basePrice.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="selling-price">Your Selling Price ($)</Label>
                    <Input
                      id="selling-price"
                      type="number"
                      step="0.01"
                      min={selectedProduct.basePrice + 0.01}
                      value={sellingPrice}
                      onChange={(e) => setSellingPrice(e.target.value)}
                      className="text-lg font-semibold"
                    />
                    {parseFloat(sellingPrice) > selectedProduct.basePrice && (
                      <p className="text-sm text-green-600">
                        Your profit: ${(parseFloat(sellingPrice) - selectedProduct.basePrice).toFixed(2)} per sale
                      </p>
                    )}
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="custom-description">Custom Description (Optional)</Label>
                    <Textarea
                      id="custom-description"
                      placeholder="Add your own description or leave empty to use the original..."
                      value={customDescription}
                      onChange={(e) => setCustomDescription(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Add to Storefront</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default UserProducts;
