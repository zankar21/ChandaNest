import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useOwnerAuth } from "../hooks/useOwnerAuth";

export default function OwnerGuard() {
  const { user, loading, profileLoading, ownerReady, me } = useOwnerAuth();
  const location = useLocation();

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface text-sm text-secondary">
        Loading owner session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/owner/login" state={{ from: location.pathname }} replace />;
  }

  const needsOnboarding = !me?.onboardedAt;
  if (needsOnboarding && !location.pathname.startsWith("/owner/onboard")) {
    return <Navigate to="/owner/onboard" replace />;
  }

  return <Outlet />;
}




