import type { ReactNode } from "react";
import { TIER_BAR_CLASS, TIER_BG_CLASS, TIER_LABEL, type RiskTier } from "../lib/risk";

export function RiskBadge({ tier, size = "md" }: { tier: RiskTier; size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-1.5 py-0.5 text-[9.5px]" : "px-2 py-0.5 text-[10.5px]";
  return (
    <span
      className={`inline-flex items-center rounded border font-mono font-medium uppercase tracking-wide ${pad} ${TIER_BG_CLASS[tier]}`}
    >
      {TIER_LABEL[tier]}
    </span>
  );
}

export function RiskScoreBar({ score, tier, compact = false }: { score: number; tier: RiskTier; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "min-w-[110px]"}`}>
      <span className="font-mono text-[12px] tabular-nums text-text-primary w-8 text-right">{Math.round(score)}</span>
      <div className="flex-1 h-1.5 rounded-full bg-surface-2 overflow-hidden">
        <div className={`h-full rounded-full ${TIER_BAR_CLASS[tier]}`} style={{ width: `${score / 10}%` }} />
      </div>
    </div>
  );
}

export function MetricCard({
  label, value, sub, trend, accent,
}: { label: string; value: ReactNode; sub?: ReactNode; trend?: string; accent?: "brand" | "critical" | "high" | "info" }) {
  const accentClass = accent === "critical" ? "text-critical" : accent === "high" ? "text-high" : accent === "info" ? "text-info" : "text-text-primary";
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <div className="text-[11px] text-text-secondary mb-1.5">{label}</div>
      <div className={`font-mono text-[26px] font-bold tabular-nums leading-none ${accentClass}`}>{value}</div>
      {(sub || trend) && (
        <div className="mt-1.5 text-[10.5px] text-text-tertiary flex items-center gap-1.5">
          {trend && <span className="text-low font-medium">{trend}</span>}
          {sub}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${className}`}>
      {title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-[12px] font-semibold text-text-primary">{title}</h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Live: "bg-low-dim text-low border-low/30",
    Healthy: "bg-low-dim text-low border-low/30",
    Active: "bg-low-dim text-low border-low/30",
    New: "bg-info-dim text-info border-info/30",
    Delayed: "bg-medium-dim text-medium border-medium/30",
    "In Review": "bg-medium-dim text-medium border-medium/30",
    Pending: "bg-medium-dim text-medium border-medium/30",
    "Pending Approval": "bg-medium-dim text-medium border-medium/30",
    Assigned: "bg-info-dim text-info border-info/30",
    "In Progress": "bg-info-dim text-info border-info/30",
    Escalated: "bg-high-dim text-high border-high/30",
    Offline: "bg-critical-dim text-critical border-critical/30",
    Error: "bg-critical-dim text-critical border-critical/30",
    Rejected: "bg-critical-dim text-critical border-critical/30",
    Frozen: "bg-critical-dim text-critical border-critical/30",
    Resolved: "bg-surface-2 text-text-tertiary border-border",
    Dismissed: "bg-surface-2 text-text-tertiary border-border",
    Closed: "bg-surface-2 text-text-tertiary border-border",
    Draft: "bg-surface-2 text-text-secondary border-border",
    Approved: "bg-low-dim text-low border-low/30",
    Filed: "bg-low-dim text-low border-low/30",
  };
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${map[status] ?? "bg-surface-2 text-text-secondary border-border"}`}>
      {status}
    </span>
  );
}

export function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center py-10 text-[12px] text-text-tertiary">{label}</div>
  );
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10 text-[12px] text-text-tertiary">
      <span className="w-2 h-2 rounded-full bg-brand animate-pulse-dot mr-2" /> Loading…
    </div>
  );
}

export function DisclaimerNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-1.5 text-[10.5px] text-text-tertiary bg-surface-2 border border-border rounded px-2.5 py-1.5">
      <span className="text-medium shrink-0">⚠</span>
      <span>{children}</span>
    </div>
  );
}

export function PrototypeTag() {
  return (
    <span className="inline-flex items-center rounded border border-info/30 bg-info-dim text-info px-1.5 py-0.5 text-[9.5px] font-mono font-medium uppercase tracking-wide">
      Simulated / Prototype
    </span>
  );
}
