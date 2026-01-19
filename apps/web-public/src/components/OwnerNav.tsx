import { Link } from "react-router-dom";
import { useOwnerAuth } from "../hooks/useOwnerAuth";

export default function OwnerNav({ onLoginClick }: { onLoginClick: () => void }) {
  const { user, me, logout } = useOwnerAuth();
  return (
    <div className="border-b border-theme card-glass-strong">
      <div className="mx-auto w-full max-w-7xl px-4 py-2 sm:px-6 lg:px-8 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/owner/my-listings" className="font-medium text-secondary hover:text-primary">
                My Listings
              </Link>
              <Link to="/owner/post-property" className="font-medium text-secondary hover:text-primary">
                Post Property
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onLoginClick}
                className="font-medium text-secondary hover:text-primary"
              >
                Owner Login
              </button>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 text-secondary">
          {user ? (
            <>
              <Link to="/owner/onboard" className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-secondary">
                KYC: {me?.kycStatus === "verified" ? "Verified" : "Not verified"}
              </Link>
              <button onClick={logout} className="rounded-full border border-theme px-3 py-1 text-xs font-semibold text-secondary">
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}



