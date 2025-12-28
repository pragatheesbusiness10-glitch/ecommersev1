import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { ThemeToggle } from '@/components/ThemeToggle';
import { NotificationCenter } from '@/components/admin/NotificationCenter';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Store,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Wallet,
  FileText,
  Send,
  Shield,
  MessageCircle,
  LifeBuoy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserChatWidget } from '@/components/chat/UserChatWidget';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/admin' },
  { icon: Users, label: 'Users', href: '/admin/users' },
  { icon: Package, label: 'Products', href: '/admin/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/admin/orders' },
  { icon: Wallet, label: 'Wallet', href: '/admin/wallet' },
  { icon: Send, label: 'Payouts', href: '/admin/payouts' },
  { icon: Shield, label: 'KYC', href: '/admin/kyc' },
  { icon: MessageCircle, label: 'Chat', href: '/admin/chat' },
  { icon: FileText, label: 'Reports', href: '/admin/reports' },
  { icon: Settings, label: 'Settings', href: '/admin/settings' },
];

const userNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Store, label: 'My Storefront', href: '/dashboard/storefront' },
  { icon: Package, label: 'Browse Products', href: '/dashboard/products' },
  { icon: ShoppingCart, label: 'Orders', href: '/dashboard/orders' },
  { icon: Wallet, label: 'Payments', href: '/dashboard/payments' },
  { icon: Shield, label: 'KYC Verification', href: '/dashboard/kyc' },
  { icon: LifeBuoy, label: 'Raise Ticket', href: '/dashboard/support' },
];

export const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { settingsMap } = usePlatformSettings();
  
  const siteName = settingsMap.site_name || 'Afflux';
  const logoUrl = settingsMap.site_logo_url;

  // Fetch pending KYC count for admin
  const { data: pendingKYCCount = 0 } = useQuery({
    queryKey: ['pending-kyc-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('kyc_submissions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'submitted');

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  // Fetch pending chat messages count for admin
  const { data: pendingChatCount = 0 } = useQuery({
    queryKey: ['pending-chat-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'user')
        .eq('is_read', false);

      if (error) return 0;
      return count || 0;
    },
    enabled: user?.role === 'admin',
  });

  const navItems = user?.role === 'admin' ? adminNavItems : userNavItems;
  const isUserRole = user?.role === 'user';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-sidebar border-b border-sidebar-border z-50 flex items-center justify-between px-4">
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-sidebar-foreground p-2 rounded-lg hover:bg-sidebar-accent transition-colors"
        >
          {isSidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        <div className="flex items-center gap-2">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="w-8 h-8 rounded-lg object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">{siteName.charAt(0)}</span>
            </div>
          )}
          <span className="font-semibold text-sidebar-foreground">{siteName}</span>
        </div>
        <ThemeToggle className="text-sidebar-foreground hover:bg-sidebar-accent" />
      </header>

      {/* Sidebar */}
      <aside className={cn(
        "fixed top-0 left-0 h-full w-64 bg-sidebar border-r border-sidebar-border z-40 transition-transform duration-300 ease-in-out",
        "lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                <img src={logoUrl} alt={siteName} className="w-10 h-10 rounded-xl object-cover shadow-lg" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center shadow-lg">
                  <span className="text-accent-foreground font-bold text-lg">{siteName.charAt(0)}</span>
                </div>
              )}
              <div>
                <span className="font-bold text-lg text-sidebar-foreground">{siteName}</span>
                <p className="text-xs text-sidebar-foreground/60">
                  {user?.role === 'admin' ? 'Admin Panel' : 'Affiliate Hub'}
                </p>
              </div>
            </div>
            {/* Admin Notification Center */}
            {user?.role === 'admin' && <NotificationCenter />}
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              const showKYCBadge = item.href === '/admin/kyc' && pendingKYCCount > 0;
              const showChatBadge = item.href === '/admin/chat' && pendingChatCount > 0;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
                    isActive 
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
                      : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span>{item.label}</span>
                  {showKYCBadge && (
                    <Badge className="ml-auto bg-amber-500 text-white text-xs px-1.5 py-0.5 h-5">
                      {pendingKYCCount}
                    </Badge>
                  )}
                  {showChatBadge && (
                    <Badge className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 h-5">
                      {pendingChatCount}
                    </Badge>
                  )}
                  {isActive && !showKYCBadge && !showChatBadge && <ChevronRight className="w-4 h-4 ml-auto" />}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-sidebar-accent/50 mb-3">
              <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-accent font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" />
              <span>Sign out</span>
            </Button>
            <ThemeToggle className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent mt-1" variant="ghost" />
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </main>

      {/* User Chat Widget - only show for non-admin users */}
      {isUserRole && <UserChatWidget />}
    </div>
  );
};
