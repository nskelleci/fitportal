import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { currentUser, userProfile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Yükleniyor...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If roles are specified, check if user has one of them
  if (allowedRoles.length > 0 && (!userProfile || !allowedRoles.includes(userProfile.role))) {
    // Redirect to unauthorized or dashboard based on role
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

