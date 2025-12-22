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
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Trash2,
  Percent
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { useAdminUsers, AffiliateUser, UserStatus } from '@/hooks/useAdminUsers';
import { usePlatformSettings, CURRENCY_SYMBOLS } from '@/hooks/usePlatformSettings';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const statusConfig: Record<UserStatus, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Pending', 
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    icon: <Clock className="w-3 h-3" />
  },
  approved: { 
    label: 'Approved', 
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    icon: <CheckCircle className="w-3 h-3" />
  },
  disabled: { 
    label: 'Disabled', 
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    icon: <XCircle className="w-3 h-3" />
  },
};

const AdminUsers: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCommissionDialogOpen, setIsCommissionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AffiliateUser | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    storefrontName: '',
    storefrontSlug: '',
  });
  const [commissionOverride, setCommissionOverride] = useState('');
  const [useDefaultCommission, setUseDefaultCommission] = useState(true);
  
  const { 
    affiliates, 
    isLoading, 
    toggleStatus, 
    isTogglingStatus,
    updateProfile,
    isUpdatingProfile,
    updateUserStatus,
    isUpdatingUserStatus,
    updateCommission,
    isUpdatingCommission,
    deleteUser,
    isDeletingUser,
  } = useAdminUsers();

  const { settingsMap } = usePlatformSettings();

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

  const handleOpenCommission = (user: AffiliateUser) => {
    setSelectedUser(user);
    setUseDefaultCommission(user.commission_override === null);
    setCommissionOverride(user.commission_override?.toString() || settingsMap.commission_rate.toString());
    setIsCommissionDialogOpen(true);
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

  const handleSaveCommission = () => {
    if (!selectedUser) return;
    
    updateCommission({
      userId: selectedUser.user_id,
      commissionOverride: useDefaultCommission ? null : parseFloat(commissionOverride),
    });
    setIsCommissionDialogOpen(false);
  };

  const handleUpdateStatus = (user: AffiliateUser, status: UserStatus) => {
    updateUserStatus({ userId: user.user_id, status });
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    deleteUser({ userId: selectedUser.user_id });
    setIsDeleteDialogOpen(false);
  };

  const handleViewStorefront = (user: AffiliateUser) => {
    if (user.storefront_slug) {
      window.open(`/store/${user.storefront_slug}`, '_blank');
    }
  };

  const pendingCount = affiliates.filter(u => u.user_status === 'pending').length;
  const approvedCount = affiliates.filter(u => u.user_status === 'approved').length;

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
              Manage your affiliate resellers. {affiliates.length} total.
            </p>
          </div>
          <div className="flex gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="border-amber-500/50 text-amber-600">
                <Clock className="w-3 h-3 mr-1" />
                {pendingCount} Pending
              </Badge>
            )}
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-600">
              <CheckCircle className="w-3 h-3 mr-1" />
              {approvedCount} Approved
            </Badge>
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
                    <DropdownMenuItem onClick={() => handleOpenCommission(user)}>
                      <Percent className="w-4 h-4 mr-2" />
                      Set Commission
                    </DropdownMenuItem>
                    {user.storefront_slug && (
                      <DropdownMenuItem onClick={() => handleViewStorefront(user)}>
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Storefront
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {user.user_status === 'pending' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'approved')}
                        className="text-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Approve User
                      </DropdownMenuItem>
                    )}
                    {user.user_status !== 'disabled' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'disabled')}
                        className="text-red-600"
                      >
                        <XCircle className="w-4 h-4 mr-2" />
                        Disable User
                      </DropdownMenuItem>
                    )}
                    {user.user_status === 'disabled' && (
                      <DropdownMenuItem 
                        onClick={() => handleUpdateStatus(user, 'approved')}
                        className="text-emerald-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Re-enable User
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        setSelectedUser(user);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Permanently
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
                {user.commission_override !== null && (
                  <div className="flex items-center gap-2 text-sm text-violet-600">
                    <Percent className="w-4 h-4" />
                    Custom: {user.commission_override}%
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <Badge className={cn("gap-1 border", statusConfig[user.user_status].color)}>
                  {statusConfig[user.user_status].icon}
                  {statusConfig[user.user_status].label}
                </Badge>
                <div className="flex items-center gap-1 text-right">
                  <Wallet className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {CURRENCY_SYMBOLS[settingsMap.default_currency]}{user.wallet_balance.toFixed(2)}
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

        {/* Commission Dialog */}
        <Dialog open={isCommissionDialogOpen} onOpenChange={setIsCommissionDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Set Commission Rate</DialogTitle>
              <DialogDescription>
                Override the default commission for {selectedUser?.name}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  id="use-default"
                  checked={useDefaultCommission}
                  onChange={(e) => setUseDefaultCommission(e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="use-default">Use default commission ({settingsMap.commission_rate}%)</Label>
              </div>
              {!useDefaultCommission && (
                <div className="grid gap-2">
                  <Label>Custom Commission Rate (%)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionOverride}
                    onChange={(e) => setCommissionOverride(e.target.value)}
                  />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCommissionDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveCommission} disabled={isUpdatingCommission}>
                {isUpdatingCommission && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Commission
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete User Permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete {selectedUser?.name} and all their data including orders, 
                storefront products, and wallet transactions. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeletingUser}
              >
                {isDeletingUser && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Delete Permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminUsers;
