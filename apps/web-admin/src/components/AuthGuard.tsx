import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "../hooks/useAuth";
import { initAppCheckIfEnabled } from "../services/firebase";
import { setAppCheckToken } from "../services/apiClient";
import { useEffect } from "react";

function Guard() {
  const { user, loading, tenantId, role, logout } = useAuth();
  const location = useLocation();
  useEffect(() => {
    const init = async () => {
      const token = await initAppCheckIfEnabled();
      if (token) setAppCheckToken(token);
    };
    init();
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app text-sm text-secondary">
        Loading session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (!tenantId || !role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-app">
        <div className="w-full max-w-md rounded-xl card-glass border border-theme p-6 shadow-sm space-y-4">
          <h1 className="text-lg font-semibold text-primary">Unauthorized</h1>
          <p className="text-sm text-secondary">
            Logged in but missing role/tenant claims. Refresh token or contact admin.
          </p>
          <button
            onClick={logout}
            className="w-full btn-primary px-3 py-2 text-sm font-semibold"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }
  return <Outlet />;
}

export default function AuthGuard() {
  return (
    <AuthProvider>
      <Guard />
    </AuthProvider>
  );
}


