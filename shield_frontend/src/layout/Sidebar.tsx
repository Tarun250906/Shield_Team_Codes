import { NavLink } from "react-router-dom";
import {
  LayoutDashboard, Bell, Users, Network, FolderSearch, FileWarning,
  Activity, BarChart3, Radio, Settings, ChevronsLeft, ChevronsRight, ShieldCheck, UploadCloud,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { to: "/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/alerts", label: "Alerts", icon: Bell, badge: 23 },
  { to: "/accounts", label: "Accounts", icon: Users },
  { to: "/network", label: "Network", icon: Network },
  { to: "/investigations", label: "Investigations", icon: FolderSearch },
  { to: "/sar", label: "SAR Queue", icon: FileWarning },
  { to: "/validate", label: "Validate", icon: UploadCloud },
  { to: "/model-monitor", label: "Model Monitor", icon: Activity },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/data-feeds", label: "Data Feeds", icon: Radio },
  { to: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 flex flex-col bg-surface border-r border-border transition-all duration-200 ${
        collapsed ? "w-[64px]" : "w-[228px]"
      }`}
    >
      <div className="h-14 flex items-center gap-2 px-4 border-b border-border shrink-0">
        <ShieldCheck size={20} className="text-brand shrink-0" strokeWidth={2.2} />
        {!collapsed && (
          <span className="font-semibold text-[15px] tracking-tight text-text-primary">SHIELD</span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2">
        {NAV.map(({ to, label, icon: Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `mx-2 mb-0.5 flex items-center gap-3 rounded-md px-2.5 py-2 text-[12.5px] transition-colors ${
                isActive
                  ? "bg-brand-dim text-brand font-medium"
                  : "text-text-secondary hover:bg-surface-hover hover:text-text-primary"
              }`
            }
          >
            <Icon size={16} className="shrink-0" strokeWidth={2} />
            {!collapsed && <span className="flex-1 truncate">{label}</span>}
            {!collapsed && badge && (
              <span className="text-[10px] font-mono font-semibold bg-critical text-white rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                {badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center gap-2 px-4 py-3 border-t border-border text-text-tertiary hover:text-text-secondary text-[12px] shrink-0"
      >
        {collapsed ? <ChevronsRight size={15} /> : <><ChevronsLeft size={15} /> Collapse</>}
      </button>
    </aside>
  );
}
