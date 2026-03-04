import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Navbar from "@/components/Navbar";
import AIAssistant from "@/components/AIAssistant";
import Index from "./pages/Index";
import BookDetail from "./pages/BookDetail";
import Search from "./pages/Search";
import SellerStudio from "./pages/SellerStudio";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/" || location.pathname === "/auth";

  return (
    <>
      {!isAuthPage && <Navbar />}
      <Routes>
        {/* Public */}
        <Route path="/" element={<Auth />} />
        <Route path="/auth" element={<Auth />} />

        {/* Protected */}
        <Route path="/home" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/book/:id" element={<ProtectedRoute><BookDetail /></ProtectedRoute>} />
        <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
        <Route path="/seller-studio" element={<ProtectedRoute><SellerStudio /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/transactions" element={<ProtectedRoute><Transactions /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><Admin /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {!isAuthPage && <AIAssistant />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
