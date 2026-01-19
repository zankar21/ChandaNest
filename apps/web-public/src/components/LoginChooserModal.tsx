import { Link, useNavigate } from "react-router-dom";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function LoginChooserModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const adminBase = import.meta.env.VITE_ADMIN_WEB_BASE_URL || "http://localhost:5174";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-surface-strong/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-primary">Continue as</h2>
          <button
            onClick={onClose}
            className="rounded-full px-2 py-1 text-muted hover:text-secondary"
            aria-label="Close"
          >
            x
          </button>
        </div>
        <div className="mt-4 space-y-3">
          <button
            onClick={() => {
              onClose();
              navigate("/owner/login");
            }}
            className="w-full rounded-xl card-glass border border-theme px-4 py-3 text-left text-sm font-semibold text-primary hover-border-strong"
          >
            Independent Owner (OTP)
            <div className="text-xs text-muted mt-1">Login with mobile OTP</div>
          </button>
          <button
            onClick={() => {
              onClose();
              window.open(`${adminBase}/login`, "_blank", "noopener");
            }}
            className="w-full rounded-xl card-glass border border-theme px-4 py-3 text-left text-sm font-semibold text-primary hover-border-strong"
          >
            Agency / Agent
            <div className="text-xs text-muted mt-1">Business login (admin portal)</div>
          </button>
          <button
            onClick={() => {
              onClose();
              window.open(`${adminBase}/login`, "_blank", "noopener");
            }}
            className="w-full rounded-xl card-glass border border-theme px-4 py-3 text-left text-sm font-semibold text-primary hover-border-strong"
          >
            Enterprise / Builder
            <div className="text-xs text-muted mt-1">Business login (admin portal)</div>
          </button>
        </div>
        <div className="mt-4 text-sm text-secondary">
          <Link to="/business/request" onClick={onClose} className="text-indigo-600 hover:underline">
            Request Business Access
          </Link>
        </div>
      </div>
    </div>
  );
}






