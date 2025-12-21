import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

// Pages
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminOrders from "./pages/admin/AdminOrders";

// User Pages
import UserDashboard from "./pages/user/UserDashboard";
import UserProducts from "./pages/user/UserProducts";
import UserOrders from "./pages/user/UserOrders";
import UserStorefront from "./pages/user/UserStorefront";
import UserPayments from "./pages/user/UserPayments";

// Storefront
import Storefront from "./pages/storefront/Storefront";

const queryClient = new QueryClient();

// Protected Route Component
const ProtectedRoute: React.FC<{ 
  children: React.ReactNode; 
  allowedRoles?: ('admin' | 'user')[];
}> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} replace />;
  }
  
  return <>{children}</>;
};

const AppRoutes = () => {
  const { isAuthenticated, user } = useAuth();

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> : <Index />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={user?.role === 'admin' ? '/admin' : '/dashboard'} /> : <Login />} />
      
      {/* Storefront (Public) */}
      <Route path="/store/:slug" element={<Storefront />} />
      
      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/products" element={<ProtectedRoute allowedRoles={['admin']}><AdminProducts /></ProtectedRoute>} />
      <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin']}><AdminUsers /></ProtectedRoute>} />
      <Route path="/admin/orders" element={<ProtectedRoute allowedRoles={['admin']}><AdminOrders /></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      
      {/* User Routes */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['user']}><UserDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/products" element={<ProtectedRoute allowedRoles={['user']}><UserProducts /></ProtectedRoute>} />
      <Route path="/dashboard/orders" element={<ProtectedRoute allowedRoles={['user']}><UserOrders /></ProtectedRoute>} />
      <Route path="/dashboard/storefront" element={<ProtectedRoute allowedRoles={['user']}><UserStorefront /></ProtectedRoute>} />
      <Route path="/dashboard/payments" element={<ProtectedRoute allowedRoles={['user']}><UserPayments /></ProtectedRoute>} />
      
      {/* Catch All */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
