import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext";

export default function Header({ showBack = false }: { showBack?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-20 bg-transparent">
      <div className="flex items-center justify-between px-4 py-3 w-full max-w-lg mx-auto">
      <div className="flex items-center gap-2">
        {showBack && (
          <button
            aria-label="Go back"
            onClick={() => navigate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-cream/90 shadow-pill"
          >
            ←
          </button>
        )}
        <Link to="/" className="flex items-center gap-1 font-extrabold text-ink text-lg tracking-tight">
          Bill
          <span className="text-[10px] font-bold bg-ink text-cream px-1.5 py-0.5 rounded-md -rotate-6">
            GPT
          </span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          to="/cards"
          className="px-4 py-2 rounded-full bg-cream text-ink text-sm font-semibold shadow-pill hover:brightness-95 transition"
        >
          Your cards
        </Link>
        <div className="relative" ref={menuRef}>
          <button
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-cream shadow-pill text-ink"
          >
            ☰
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-56 bg-cream rounded-2xl shadow-card overflow-hidden animate-fade-in"
            >
              <div className="px-4 py-3 text-xs text-ink/60 border-b border-ink/10 truncate">
                {user?.email}
              </div>
              <Link
                to="/"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5"
              >
                New search
              </Link>
              <Link
                to="/saved"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Saved comparisons
              </Link>
              <Link
                to="/cards"
                role="menuitem"
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-3 text-sm font-medium text-ink hover:bg-ink/5"
              >
                Your cards
              </Link>
              <button
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                  navigate("/login");
                }}
                className="w-full text-left px-4 py-3 text-sm font-medium text-accent-red hover:bg-ink/5 border-t border-ink/10"
              >
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
