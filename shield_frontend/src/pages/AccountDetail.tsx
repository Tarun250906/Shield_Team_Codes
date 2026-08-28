import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { api, type AccountDetail as Detail, type NetworkResponse } from "../lib/api";
import { generateTransactions, generateAlerts } from "../lib/mock/generators";
import { RiskBadge, LoadingState, PrototypeTag, StatusBadge } from "../components/ui";
import { Table, THead, TH, TR, TD } from "../components/Table";
import { tierOf, TIER_ACTION, type RiskTier } from "../lib/risk";
import NetworkGraph from "../components/NetworkGraph";

const TABS = ["Overview", "Transactions", "Risk Factors", "Graph View", "Alerts", "Documents"] as const;

export default function AccountDetail() {
  const { id } = useParams();
  const accountId = Number(id);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [network, setNetwork] = useState<NetworkResponse | null>(null);
  const [tab, setTab] = useState<typeof TABS[number]>("Overview");
  const [toast, setToast] = useState<string | null>(null);
  const [status, setStatus] = useState<"Active" | "Frozen" | "Under Review">("Active");

  useEffect(() => {
    setDetail(null);
    api.getAccount(accountId).then(d => {
      setDetail(d);
      setStatus(d.flagged ? "Under Review" : "Active");
    });
    api.getNetwork(accountId).then(setNetwork);
  }, [accountId]);

  const transactions = useMemo(() => generateTransactions(accountId), [accountId]);
  const alerts = useMemo(() => detail ? generateAlerts([detail]) : [], [detail]);

  const doAction = (action: "freeze" | "escalate" | "dismiss") => {
    api.postAction(accountId, action).then(() => {
      if (action === "freeze") setStatus("Frozen");
      setToast(`Account ${accountId} — ${action} logged to audit trail`);
      setTimeout(() => setToast(null), 2500);
    });
  };

  if (!detail) return <LoadingState />;

  const tier = tierOf(detail.shield_score) as RiskTier;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
        <Link to="/accounts" className="hover:text-text-secondary flex items-center gap-1"><ChevronLeft size={12} /> Accounts</Link>
        <ChevronRight size={11} />
        <span className="text-text-secondary">ACC-{accountId}</span>
      </div>

      {/* Header */}
      <div className="bg-surface border border-border rounded-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div>
            <div className="font-mono text-[19px] font-semibold">ACC-{accountId}</div>
            <div className="flex items-center gap-2 mt-1">
              <RiskBadge tier={tier} />
              <StatusBadge status={status} />
            </div>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <div className="font-mono text-[28px] font-bold tabular-nums leading-none">{detail.shield_score.toFixed(0)}<span className="text-text-tertiary text-[14px] font-normal"> / 1000</span></div>
            <div className="text-[10.5px] text-text-tertiary mt-1">SHIELD Score</div>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => doAction("dismiss")} className="px-3 py-1.5 text-[11.5px] rounded-md border border-border text-text-secondary hover:bg-surface-hover">Dismiss</button>
          <button onClick={() => doAction("escalate")} className="px-3 py-1.5 text-[11.5px] rounded-md border border-high/40 text-high hover:bg-high-dim">Escalate</button>
          <button onClick={() => doAction("freeze")} className="px-3 py-1.5 text-[11.5px] rounded-md border border-critical/40 text-critical hover:bg-critical-dim">Freeze Account</button>
        </div>
      </div>

      {/* Basic info strip */}
      <div className="bg-surface border border-border rounded-lg p-4 grid grid-cols-6 gap-4 text-[11.5px]">
        <Info k="Account Type" v={detail.account_type} />
        <Info k="Occupation" v={detail.occupation} />
        <Info k="Segment" v={detail.segment} />
        <Info k="Age" v={detail.age?.toString() ?? "—"} />
        <Info k="Branch" v={detail.branch_code.toString()} />
        <Info k="Opened" v={detail.account_open_date} />
      </div>

      {/* Tabs */}
      <div className="border-b border-border flex gap-1">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-[11.5px] border-b-2 -mb-px transition-colors ${
              tab === t ? "border-brand text-text-primary font-medium" : "border-transparent text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {t}{t === "Alerts" && alerts.length > 0 ? ` (${alerts.length})` : ""}
          </button>
        ))}
      </div>

      {tab === "Overview" && <OverviewTab detail={detail} tier={tier} />}
      {tab === "Transactions" && <TransactionsTab transactions={transactions} />}
      {tab === "Risk Factors" && <RiskFactorsTab detail={detail} />}
      {tab === "Graph View" && <div className="bg-surface border border-border rounded-lg p-4"><NetworkGraph data={network} height={380} /></div>}
      {tab === "Alerts" && <AlertsTab alerts={alerts} />}
      {tab === "Documents" && <DocumentsTab />}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-2 border border-brand/40 text-text-primary text-[12px] px-4 py-2.5 rounded-md shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <div className="text-text-tertiary text-[10px] uppercase tracking-wide mb-0.5">{k}</div>
      <div className="text-text-primary font-medium">{v}</div>
    </div>
  );
}

function OverviewTab({ detail, tier }: { detail: Detail; tier: RiskTier }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="bg-surface border border-border rounded-lg p-4">
        <h3 className="text-[12px] font-semibold mb-3">Risk Summary</h3>
        <div className="space-y-2.5 text-[11.5px]">
          <Row k="SHIELD Risk Score" v={`${detail.shield_score.toFixed(0)} / 1000`} />
          <Row k="Risk Tier" v={tier[0].toUpperCase() + tier.slice(1)} />
          <Row k="Model Score (XGBoost)" v={detail.xgb_score.toFixed(3)} />
          <Row k="Anomaly Score (Isolation Forest)" v={detail.iso_score.toFixed(2)} />
          <Row k="Recommended Action" v={TIER_ACTION[tier]} />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg p-4 col-span-2">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[12px] font-semibold">Top Risk Factors (SHAP)</h3>
        </div>
        <p className="text-[11px] text-text-secondary leading-relaxed mb-3 border-l-2 border-brand pl-2.5">{detail.narrative}</p>
        <ShapBars factors={detail.top_factors} />
      </div>
    </div>
  );
}

function ShapBars({ factors }: { factors: Detail["top_factors"] }) {
  const max = Math.max(...factors.map(f => Math.abs(f.impact)), 0.01);
  return (
    <div className="space-y-2">
      {factors.map(f => {
        const pct = Math.abs(f.impact) / max * 100;
        const positive = f.direction === "increases_risk";
        return (
          <div key={f.feature} className="flex items-center gap-2 text-[11px]">
            <span className="w-40 shrink-0 text-text-secondary truncate font-mono text-[10.5px]">{f.feature.replace(/_/g, " ")}</span>
            <div className="flex-1 h-3.5 bg-surface-2 rounded relative overflow-hidden">
              <div
                className={`absolute top-0 bottom-0 ${positive ? "bg-critical/70" : "bg-low/70"}`}
                style={{ width: `${pct / 2}%`, [positive ? "left" : "right"]: "50%" } as React.CSSProperties}
              />
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border-strong" />
            </div>
            <span className={`font-mono w-14 text-right ${positive ? "text-critical" : "text-low"}`}>{f.impact > 0 ? "+" : ""}{f.impact.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RiskFactorsTab({ detail }: { detail: Detail }) {
  return (
    <div className="bg-surface border border-border rounded-lg p-4">
      <h3 className="text-[12px] font-semibold mb-1">Full SHAP Explanation</h3>
      <p className="text-[11px] text-text-tertiary mb-4">Signed contribution of each feature to this account's SHIELD Score. Positive values increase risk, negative values decrease it.</p>
      <ShapBars factors={detail.top_factors} />
    </div>
  );
}

function TransactionsTab({ transactions }: { transactions: ReturnType<typeof generateTransactions> }) {
  const [filter, setFilter] = useState<"All" | "Incoming" | "Outgoing" | "Flagged">("All");
  const rows = transactions.filter(t => {
    if (filter === "All") return true;
    if (filter === "Flagged") return t.flagged;
    return t.direction === filter;
  });
  return (
    <div className="bg-surface border border-border rounded-lg">
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex gap-1">
          {(["All", "Incoming", "Outgoing", "Flagged"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-2.5 py-1.5 text-[11px] rounded-md ${filter === f ? "bg-surface-2 text-text-primary" : "text-text-tertiary hover:text-text-secondary"}`}>{f}</button>
          ))}
        </div>
        <PrototypeTag />
      </div>
      <Table>
        <THead>
          <TH>Timestamp</TH><TH>Direction</TH><TH>Counterparty</TH><TH>Channel</TH>
          <TH align="right">Amount</TH><TH>Device</TH><TH>Risk</TH>
        </THead>
        <tbody>
          {rows.map((t, i) => (
            <TR key={i}>
              <TD className="font-mono text-text-tertiary">{t.timestamp}</TD>
              <TD className={t.direction === "Incoming" ? "text-low" : "text-text-secondary"}>{t.direction}</TD>
              <TD className="font-mono">{t.counterparty}</TD>
              <TD>{t.channel}</TD>
              <TD align="right" className="font-mono tabular-nums">₹{t.amount.toLocaleString("en-IN")}</TD>
              <TD className="text-text-tertiary">{t.device}</TD>
              <TD>{t.flagged ? <StatusBadge status="Escalated" /> : <span className="text-text-tertiary">—</span>}</TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function AlertsTab({ alerts }: { alerts: ReturnType<typeof generateAlerts> }) {
  if (!alerts.length) return <div className="text-[11.5px] text-text-tertiary p-4">No alerts for this account.</div>;
  return (
    <div className="bg-surface border border-border rounded-lg">
      <Table>
        <THead><TH>Alert ID</TH><TH>Type</TH><TH align="right">Risk Score</TH><TH>Time</TH><TH>Status</TH></THead>
        <tbody>
          {alerts.map(a => (
            <TR key={a.alert_id}>
              <TD className="font-mono text-text-secondary">{a.alert_id}</TD>
              <TD>{a.alert_type}</TD>
              <TD align="right" className="font-mono">{a.risk_score.toFixed(0)}</TD>
              <TD className="text-text-tertiary">{a.time}</TD>
              <TD><StatusBadge status={a.status} /></TD>
            </TR>
          ))}
        </tbody>
      </Table>
    </div>
  );
}

function DocumentsTab() {
  return (
    <div className="bg-surface border border-border rounded-lg p-8 text-center text-[11.5px] text-text-tertiary">
      No KYC documents linked in this prototype dataset.
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-border/60 pb-2 last:border-0 last:pb-0">
      <span className="text-text-tertiary">{k}</span>
      <span className="font-mono text-text-primary">{v}</span>
    </div>
  );
}
