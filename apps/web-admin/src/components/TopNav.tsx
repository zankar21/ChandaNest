import { Link, useLocation, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import Dropdown from "./Dropdown";
import { useAuth } from "../hooks/useAuth";
import { isPlatformAdminRole, isTenantAdminRole } from "../utils/roles";

type NavItem = { label: string; to: string; requiresTenantAdmin?: boolean; requiresPlatformAdmin?: boolean };

const primaryNav: NavItem[] = [
  { label: "Dashboard", to: "/" },
  { label: "Listings", to: "/listings" },
  { label: "Projects", to: "/projects" },
  { label: "Pending Approvals", to: "/pending-approvals" },
  { label: "Leads", to: "/leads" },
  { label: "Team", to: "/team", requiresTenantAdmin: true },
  { label: "Billing", to: "/billing", requiresTenantAdmin: true }
];

const moreNav: NavItem[] = [
  { label: "Add Unit", to: "/add?mode=project_unit" },
  { label: "Pending KYC", to: "/pending-kyc" },
  { label: "Buyer Requests", to: "/buyer-requests" },
  { label: "Agencies", to: "/agencies" },
  { label: "Enterprises", to: "/enterprises" },
  { label: "Org Listings", to: "/org-listings" },
  { label: "Mandates", to: "/mandates" },
  { label: "Requests", to: "/business-requests", requiresPlatformAdmin: true }
];

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 8l4 4 4-4" />
    </svg>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 6h14M3 10h14M3 14h14" />
    </svg>
  );
}

function initials(email?: string | null) {
  if (!email) return "U";
  const name = email.split("@")[0] || "U";
  const parts = name.replace(/[^a-zA-Z0-9]/g, " ").split(" ").filter(Boolean);
  const first = parts[0]?.[0] || "U";
  const second = parts[1]?.[0] || "";
  return `${first}${second}`.toUpperCase();
}

export default function TopNav() {
  const { user, role, logout, tenantId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isPlatformAdmin = isPlatformAdminRole(role);
  const isTenantAdmin = isTenantAdminRole(role) || isPlatformAdmin;

  const isActive = (to: string) => {
    if (to === "/") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname.startsWith(to);
  };

  const primaryItems = useMemo(
    () =>
      primaryNav.filter((item) => {
        if (item.requiresPlatformAdmin && !isPlatformAdmin) return false;
        if (item.requiresTenantAdmin && !isTenantAdmin) return false;
        return true;
      }),
    [isPlatformAdmin, isTenantAdmin]
  );

  const moreItems = useMemo(
    () =>
      moreNav.filter((item) => {
        if (item.requiresPlatformAdmin && !isPlatformAdmin) return false;
        if (item.requiresTenantAdmin && !isTenantAdmin) return false;
        return true;
      }),
    [isPlatformAdmin, isTenantAdmin]
  );

  return (
    <header className="h-16 border-b border-theme card-glass-strong">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-primary">
            <div className="text-lg font-semibold">ChandaNest</div>
            <div className="text-xs text-muted">Admin</div>
          </Link>
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-secondary">
            {tenantId ? `Tenant: ${tenantId}` : "Tenant"}
          </span>
        </div>

        <nav className="hidden items-center gap-1 md:flex">
          {primaryItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                isActive(item.to)
                  ? "bg-surface text-primary"
                  : "text-secondary hover:bg-surface hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Dropdown
            align="left"
            trigger={(open) => (
              <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-secondary hover:bg-surface hover:text-primary">
                More
                <ChevronDownIcon
                  className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            )}
          >
            <div className="flex flex-col gap-2">
              <div>
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Create
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {moreItems
                    .filter((item) => ["Add Unit"].includes(item.label))
                    .map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                      >
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
              <div className="h-px bg-surface" />
              <div>
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Operations
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {moreItems
                    .filter((item) =>
                      ["Pending KYC", "Pending Approvals", "Buyer Requests", "Requests"].includes(item.label)
                    )
                    .map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                      >
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
              <div className="h-px bg-surface" />
              <div>
                <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
                  Directory
                </div>
                <div className="mt-1 flex flex-col gap-1">
                  {moreItems
                    .filter((item) => ["Agencies", "Enterprises", "Org Listings", "Mandates"].includes(item.label))
                    .map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                      >
                        {item.label}
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </Dropdown>
        </nav>

        <div className="flex items-center gap-3">
          <Dropdown
            align="right"
            trigger={(open) => (
              <span className="inline-flex items-center gap-2 rounded-lg btn-primary px-3 py-2 text-sm font-semibold">
                + New
                <ChevronDownIcon
                  className={`h-4 w-4 text-white/80 transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="px-3 pt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Create</div>
              <Link
                to="/listings/new"
                className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              >
                New Listing
              </Link>
              <Link
                to="/projects/new"
                className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              >
                New Project
              </Link>
              <Link
                to="/add?mode=project_unit"
                className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              >
                New Unit
              </Link>
            </div>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={(open) => (
              <span className="inline-flex items-center gap-2 rounded-full bg-surface px-2.5 py-1.5 text-xs font-semibold text-primary">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface">
                  {initials(user?.email)}
                </span>
                <ChevronDownIcon
                  className={`h-4 w-4 text-muted transition-transform ${open ? "rotate-180" : ""}`}
                />
              </span>
            )}
          >
            <div className="flex flex-col gap-1">
              <div className="px-3 py-2 text-xs text-muted">{user?.email || "user@chandanest"}</div>
              <button
                type="button"
                disabled
                className="rounded-xl px-3 py-2 text-left text-sm text-muted cursor-not-allowed"
              >
                Settings
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  navigate("/login");
                }}
                className="rounded-xl px-3 py-2 text-left text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
              >
                Logout
              </button>
            </div>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={() => (
              <span
                className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-secondary hover:bg-surface hover:text-primary md:hidden"
                aria-label="Open menu"
              >
                <MenuIcon className="h-4 w-4 text-muted" />
                Menu
              </span>
            )}
          >
            <div className="flex flex-col gap-1">
              {primaryItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                >
                  {item.label}
                </Link>
              ))}
              {moreItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="rounded-xl px-3 py-2 text-sm text-secondary hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/40"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}


