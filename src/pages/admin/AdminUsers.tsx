import React, { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  MoreVertical, 
  Edit, 
  Power, 
  ExternalLink,
  Mail,
  Calendar,
  Store,
  Wallet,
  Loader2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useAdminUsers, AffiliateUser } from '@/hooks/useAdminUsers';
import { Skeleton } from '@/components/ui/skeleton';

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AffiliateUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    storefrontName: '',
    storefrontSlug: '',
  });
  
  const { 
    affiliates, 
    isLoading, 
    toggleStatus, 
    isTogglingStatus,
    updateProfile,
    isUpdatingProfile,
  } = useAdminUsers();

  const filteredUsers = affiliates.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.storefront_slug?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEdit = (user: AffiliateUser) => {
    setSelectedUser(user);
    setEditForm({
      name: user.name,
      storefrontName: user.storefront_name || '',
      storefrontSlug: user.storefront_slug || '',
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    updateProfile({
      userId: selectedUser.user_id,
      name: editForm.name,
      storefrontName: editForm.storefrontName,
      storefrontSlug: editForm.storefrontSlug,
    });
    setIsEditDialogOpen(false);
  };

  const handleToggleStatus = (user: AffiliateUser) => {
    toggleStatus({ userId: user.user_id, isActive: user.is_active });
  };

  const handleViewStorefront = (user: AffiliateUser) => {
    if (user.storefront_slug) {
      window.open(`/store/${user.storefront_slug}`, '_blank');
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <Skeleton className="h-9 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
            </div>
          </div>
          <Skeleton className="h-10 w-full max-w-md" />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl" />
            ))}
          </div>
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
            <h1 className="text-3xl font-bold text-foreground">Affiliates</h1>
            <p className="text-muted-foreground mt-1">
              Manage your affiliate resellers. {affiliates.length} affiliates total.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search affiliates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredUsers.map((user, index) => (
            <div 
              key={user.id}
              className="dashboard-card opacity-0 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'forwards' }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{user.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {user.storefront_name || 'No storefront name'}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEdit(user)}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Details
                    </DropdownMenuItem>
                    {user.storefront_slug && (
                      <DropdownMenuItem onClick={() => handleViewStorefront(user)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Storefront
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleToggleStatus(user)}
                      disabled={isTogglingStatus}
                    >
                      <Power className="w-4 h-4 mr-2" />
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{user.email}</span>
                </div>
                {user.storefront_slug && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Store className="w-4 h-4" />
                    <span className="truncate">/store/{user.storefront_slug}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                  {user.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <div className="flex items-center gap-1 text-right">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      ${user.wallet_balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredUsers.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'No affiliates found matching your search.' : 'No affiliates registered yet.'}
            </p>
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <form onSubmit={handleSaveEdit}>
              <DialogHeader>
                <DialogTitle>Edit Affiliate</DialogTitle>
                <DialogDescription>
                  Update the affiliate's profile information.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-name">Full Name</Label>
                  <Input 
                    id="edit-name" 
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="John Smith" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-storefront-name">Storefront Name</Label>
                  <Input 
                    id="edit-storefront-name" 
                    value={editForm.storefrontName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, storefrontName: e.target.value }))}
                    placeholder="John's Premium Store" 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="edit-storefront-slug">Storefront URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">/store/</span>
                    <Input 
                      id="edit-storefront-slug" 
                      value={editForm.storefrontSlug}
                      onChange={(e) => setEditForm(prev => ({ ...prev, storefrontSlug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                      placeholder="johns-store" 
                      className="flex-1" 
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isUpdatingProfile}>
                  {isUpdatingProfile && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
