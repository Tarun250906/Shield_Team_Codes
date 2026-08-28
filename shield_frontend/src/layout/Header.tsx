import { Search, Bell, ChevronDown, LogOut } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../lib/auth";

const TITLES: Record<string, string> = {
  "/overview": "Overview",
  "/alerts": "Alerts",
  "/accounts": "Accounts",
  "/network": "Network & Ring Detection",
  "/investigations": "Investigations",
  "/sar": "SAR Queue",
  "/validate": "Validate Dataset",
  "/model-monitor": "Model Monitor",
  "/reports": "Reports",
  "/data-feeds": "Data Feeds",
  "/settings": "Settings",
};

export default function Header() {
  const loc = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const base = "/" + loc.pathname.split("/")[1];
  const title = TITLES[base] ?? (loc.pathname.startsWith("/accounts/") ? "Account Detail" : "SHIELD");

  const initials = (user?.display_name ?? "AN")
    .split(" ")
    .map(w => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center px-5 gap-6 shrink-0">
      <div className="text-[13.5px] font-semibold text-text-primary whitespace-nowrap">{title}</div>

      <div className="flex-1 max-w-md relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          placeholder="Search account, alert, case…"
          className="w-full bg-surface-2 border border-border rounded-md pl-8 pr-3 py-1.5 text-[12.5px] text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand/50"
        />
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <div className="flex items-center gap-1.5 text-[11.5px] text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-low animate-pulse-dot" />
          System Operational
        </div>
        <button className="relative text-text-secondary hover:text-text-primary">
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-critical" />
        </button>
        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="flex items-center gap-1.5 text-[12px] text-text-secondary cursor-pointer hover:text-text-primary"
          >
            <div className="w-6 h-6 rounded-full bg-surface-2 border border-border flex items-center justify-center text-[10px] font-medium text-text-primary">
              {initials}
            </div>
            {user?.role ?? "Analyst"}
            <ChevronDown size={13} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-9 w-44 bg-surface-2 border border-border rounded-md shadow-lg z-50 py-1">
                <div className="px-3 py-2 border-b border-border">
                  <div className="text-[11.5px] font-medium text-text-primary">{user?.display_name}</div>
                  <div className="text-[10px] text-text-tertiary">{user?.username}</div>
                </div>
                <button
                  onClick={() => { logout(); navigate("/login"); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-[11.5px] text-critical hover:bg-critical-dim"
                >
                  <LogOut size={13} /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
