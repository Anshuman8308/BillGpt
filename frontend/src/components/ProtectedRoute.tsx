import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-surface-gradient flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-4 border-cream/40 border-t-cream animate-spin" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
