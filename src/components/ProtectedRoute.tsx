/**
 * ProtectedRoute – Redirects unauthenticated users to /auth
 * Optionally restricts by role (buyer, seller, admin)
 */
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface Props {
  children: React.ReactNode;
  requiredRole?: "buyer" | "seller" | "admin";
}

const ProtectedRoute = ({ children, requiredRole }: Props) => {
  const { session, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Role-based access control
  if (requiredRole && profile?.role !== requiredRole && profile?.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center glass-card p-8 rounded-2xl max-w-md">
          <p className="text-4xl mb-4">🔒</p>
          <h2 className="font-display text-xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">
            You need <span className="text-primary font-semibold capitalize">{requiredRole}</span> role to access this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
