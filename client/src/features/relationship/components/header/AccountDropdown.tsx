import { useEffect, useRef, useState } from "react";
import { useAuthStore } from "../../../auth/store/store";
import Avatar from "../../../../common/components/avatar/Avatar";
import useLogout from "../../../auth/hooks/useLogout";
import useLogoutAll from "../../../auth/hooks/useLogoutAll";
import { Button } from "../../../../common/components/button";

const AccountDropdown = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const user = useAuthStore((s) => s.user);
  const { loading: logoutLoading, logoutUser } = useLogout();
  const { loading: logoutAllLoading, logoutAllUser } = useLogoutAll();

  // Close dropdown on outside click or Esc key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // !menuRef.current.contains(event.target)
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    setIsOpen(false);
  };

  const handleLogoutAll = async () => {
    await logoutAllUser();
    setIsOpen(false);
  };

  return (
    <div className="relative self-end sm:self-auto" ref={menuRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="User account settings menu"
        className="flex items-center gap-3 py-2 px-3.5 rounded-2xl border border-slate-200/80 bg-white hover:bg-slate-50 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
      >
        <Avatar
          imageUrl={user?.imageUrl ?? null}
          size="w-9 h-9"
          bgColor="bg-indigo-50"
          textColor="text-indigo-600"
        />

        <div className="text-left hidden sm:block">
          <span className="block text-sm font-semibold text-slate-800 leading-tight">
            My account
          </span>
          <span className="block text-xs text-slate-400 font-normal">
            Account settings
          </span>
        </div>

        <svg
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className="absolute right-0 mt-2 w-56 rounded-2xl bg-white shadow-xl border border-slate-100 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
        >
          <div className="px-3 py-2 border-b border-slate-100 mb-1">
            <p className="text-xs font-semibold text-slate-800">Signed in as</p>
            <p className="text-xs text-slate-500 truncate">user@example.com</p>
          </div>

          <Button
            role="menuitem"
            unstyled={true}
            disabled={logoutLoading || logoutAllLoading}
            loading={logoutLoading}
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 rounded-xl transition text-left"
          >
            <svg
              className="w-4 h-4 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Log out
          </Button>

          <Button
            role="menuitem"
            unstyled={true}
            onClick={handleLogoutAll}
            disabled={logoutLoading || logoutAllLoading}
            loading={logoutAllLoading}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition text-left"
          >
            <svg
              className="w-4 h-4 text-rose-500"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Log out all devices
          </Button>
        </div>
      )}
    </div>
  );
};

export default AccountDropdown;
