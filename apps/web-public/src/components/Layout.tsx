import { Link, useLocation } from "react-router-dom";
import React from "react";
import LoginChooserModal from "./LoginChooserModal";
import markLight from "../assets/brand/chandanest-mark-light.png";
import { useOwnerAuth } from "../hooks/useOwnerAuth";

type Props = { children: React.ReactNode };

export default function Layout({ children }: Props) {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="theme-dark min-h-screen bg-app text-primary flex flex-col">
      <Header onLoginClick={() => setLoginOpen(true)} />
      <main className="flex-1">
        {isHome ? (
          children
        ) : (
          <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">{children}</div>
        )}
      </main>
      <footer className="mt-10 border-t border-theme card-glass-strong">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 text-sm text-muted">
          © {new Date().getFullYear()} ChandaNest. Crafted for modern living.
        </div>
      </footer>
      <LoginChooserModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}

function Header({ onLoginClick }: { onLoginClick: () => void }) {
  const { user, me, logout } = useOwnerAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const toggleMenu = () => setMenuOpen((prev) => !prev);
  const closeMenu = () => setMenuOpen(false);
  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <header className="sticky top-3 z-30 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex h-14 items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/50 px-4 shadow-xl backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="group flex items-center gap-3 rounded-full border border-transparent px-2 py-1 transition duration-200 ease-out hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30 focus-visible:ring-offset-0 focus-visible:border-white/14"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/7 border border-white/14 shadow-[0_8px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/10 transition duration-200 ease-out group-hover:bg-white/10 group-hover:border-white/18 md:h-10 md:w-10">
                <span className="absolute -inset-3 rounded-full bg-gradient-to-tr from-indigo-500/25 via-cyan-400/20 to-purple-500/25 blur-xl opacity-0 transition duration-200 ease-out group-hover:opacity-100" />
                <img
                  src={markLight}
                  alt="ChandaNest"
                  className="relative h-5 w-5 object-contain opacity-95"
                />
              </span>
              <span className="text-lg font-semibold tracking-tight text-white/90 sm:hidden">CNest</span>
              <div className="hidden sm:inline">
                <span className="relative inline-block">
                  <span className="inline-flex items-center gap-2">
                    <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
                      ChandaNest
                    </span>
                    <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-cyan-400/90 shadow-[0_0_18px_rgba(34,211,238,0.35)]" />
                  </span>
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 rounded-full bg-gradient-to-r from-cyan-300/70 via-indigo-400/45 to-transparent opacity-0 blur-[0.2px] transition duration-200 ease-out group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100" />
                  <span aria-hidden="true" className="pointer-events-none absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 rounded-full bg-white/18 opacity-0 transition duration-200 ease-out group-hover:scale-x-100 group-hover:opacity-100 group-focus-visible:scale-x-100 group-focus-visible:opacity-100" />
                </span>
              </div>
            </Link>
            <span className="hidden sm:inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-secondary">
              Chandrapur
            </span>
          </div>
          <div className="flex items-center gap-2">
            <nav className="hidden md:flex items-center gap-2">
              <Link
                to="/"
                aria-current={isActive("/") ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive("/")
                    ? "border border-white/20 bg-white/15 text-primary shadow-[0_8px_20px_rgba(0,0,0,0.25)]"
                    : "border border-transparent text-secondary hover:border-white/10 hover:text-primary"
                }`}
              >
                Explore
              </Link>
              <Link
                to="/projects"
                aria-current={isActive("/projects") ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive("/projects")
                    ? "border border-white/20 bg-white/10 text-primary"
                    : "border border-transparent text-secondary hover:border-white/10 hover:text-primary"
                }`}
              >
                Projects
              </Link>
              <Link
                to="/map"
                aria-current={isActive("/map") ? "page" : undefined}
                className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                  isActive("/map")
                    ? "border border-white/20 bg-white/10 text-primary"
                    : "border border-transparent text-secondary hover:border-white/10 hover:text-primary"
                }`}
              >
                Map
              </Link>
            </nav>
            {user ? (
              <div className="relative flex items-center gap-2" onMouseLeave={closeMenu}>
                <span className="hidden h-6 w-px bg-white/10 md:inline-block" />
                <button
                  type="button"
                  onClick={toggleMenu}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-secondary transition duration-200 ease-out hover:-translate-y-0.5 hover:bg-white/10 hover:text-primary hover:shadow-lg"
                >
                  <span className="hidden sm:inline">{me?.fullName || "Owner"}</span>
                  <span className="inline sm:hidden">Owner</span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400/80" />
                  <span className="text-xs text-muted">v</span>
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 mt-2 w-48 rounded-2xl border border-white/10 bg-surface/95 p-2 text-sm text-secondary shadow-xl">
                    <Link
                      to="/owner/my-listings"
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2 hover:bg-white/5"
                    >
                      My Listings
                    </Link>
                    <Link
                      to="/owner/post-property"
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2 hover:bg-white/5"
                    >
                      Post Property
                    </Link>
                    <Link
                      to="/owner/onboard"
                      onClick={closeMenu}
                      className="block rounded-lg px-3 py-2 hover:bg-white/5"
                    >
                      KYC: {me?.kycStatus === "verified" ? "Verified" : "Not verified"}
                    </Link>
                    <button
                      type="button"
                      onMouseDown={logout}
                      onClick={closeMenu}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left hover:bg-white/5"
                    >
                      Logout
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-full bg-gradient-to-r from-indigo-500 to-indigo-700 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_30px_rgba(79,70,229,0.35)] transition duration-200 ease-out hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(79,70,229,0.45)]"
              >
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}



