import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/contexts/AuthContext';
import { mockStorefrontProducts } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink, 
  Copy, 
  Settings, 
  Trash2, 
  Edit,
  MoreVertical,
  Eye,
  EyeOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from 'react-router-dom';

const UserStorefront: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');

  const userProducts = mockStorefrontProducts.filter(sp => sp.userId === user?.id);
  
  const filteredProducts = userProducts.filter(sp =>
    sp.product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sp.product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const storefrontUrl = `/store/${user?.storefrontSlug}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.origin + storefrontUrl);
    toast({
      title: 'URL Copied',
      description: 'Storefront URL has been copied to clipboard.',
    });
  };

  const handleToggleProduct = (productId: string, currentStatus: boolean) => {
    toast({
      title: currentStatus ? 'Product Hidden' : 'Product Visible',
      description: `Product has been ${currentStatus ? 'hidden from' : 'shown on'} your storefront.`,
    });
  };

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
              <h2 className="text-lg font-semibold text-foreground">{user?.storefrontName}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Share this link with your customers
              </p>
            </div>
            <div className="flex items-center gap-2">
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
              <Button variant="outline" size="icon">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Products Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-foreground">{userProducts.length}</p>
            <p className="text-sm text-muted-foreground">Total Products</p>
          </div>
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-green-600">
              {userProducts.filter(p => p.isActive).length}
            </p>
            <p className="text-sm text-muted-foreground">Active Products</p>
          </div>
          <div className="dashboard-card text-center">
            <p className="text-3xl font-bold text-muted-foreground">
              {userProducts.filter(p => !p.isActive).length}
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
              <img 
                src={sp.product.image} 
                alt={sp.product.name}
                className="w-20 h-20 rounded-xl object-cover flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-foreground">{sp.product.name}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {sp.customDescription || sp.product.description}
                    </p>
                  </div>
                  <Badge variant={sp.isActive ? 'active' : 'inactive'}>
                    {sp.isActive ? 'Active' : 'Hidden'}
                  </Badge>
                </div>
                
                <div className="flex flex-wrap items-center gap-4 mt-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Your Price</p>
                    <p className="font-bold text-lg text-foreground">${sp.sellingPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Base Cost</p>
                    <p className="font-medium text-muted-foreground">${sp.product.basePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Your Profit</p>
                    <p className="font-semibold text-green-600">
                      ${(sp.sellingPrice - sp.product.basePrice).toFixed(2)}
                    </p>
                  </div>
                  <Badge variant="secondary">{sp.product.category}</Badge>
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
                    <DropdownMenuItem onClick={() => handleToggleProduct(sp.id, sp.isActive)}>
                      {sp.isActive ? (
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
                    <DropdownMenuItem className="text-destructive">
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
              {userProducts.length === 0 
                ? "You haven't added any products to your storefront yet."
                : "No products found matching your search."}
            </p>
            {userProducts.length === 0 && (
              <Button asChild>
                <Link to="/dashboard/products">Browse Products</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default UserStorefront;
