import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api, type AccountSummary, type AccountDetail } from "../lib/api";
import { generateAlerts, type MockAlert } from "../lib/mock/generators";
import { RiskBadge, StatusBadge, LoadingState, PrototypeTag } from "../components/ui";
import { Table, THead, TH, TR, TD, Pagination } from "../components/Table";
import type { RiskTier } from "../lib/risk";

const TABS = ["All Alerts", "Critical", "High", "Medium", "Low"] as const;
const PAGE_SIZE = 20;

export default function Alerts() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("All Alerts");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<MockAlert | null>(null);

  useEffect(() => {
    api.getAccounts({ page_size: 400, sort_by: "shield_score", sort_dir: "desc" }).then(a => {
      setAccounts(a.results);
      setLoading(false);
    });
  }, []);

  const allAlerts = useMemo(() => generateAlerts(accounts), [accounts]);

  const filtered = useMemo(() => {
    return allAlerts.filter(a => {
      if (tab !== "All Alerts" && a.tier !== tab.toLowerCase()) return false;
      if (search && !a.account_id.toString().includes(search) && !a.alert_id.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allAlerts, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const counts = useMemo(() => {
    const c: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    allAlerts.forEach(a => { c[a.tier] = (c[a.tier] ?? 0) + 1; });
    return c;
  }, [allAlerts]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-secondary">Review and manage system-generated risk alerts.</p>
        <PrototypeTag />
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <div className="flex items-center justify-between px-4 pt-3">
          <div className="flex gap-1">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setPage(1); }}
                className={`px-3 py-1.5 text-[11.5px] rounded-t-md border-b-2 transition-colors ${
                  tab === t ? "border-brand text-text-primary font-medium" : "border-transparent text-text-tertiary hover:text-text-secondary"
                }`}
              >
                {t} {t !== "All Alerts" && <span className="font-mono ml-1 text-[10px]">{counts[t.toLowerCase()] ?? 0}</span>}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search alerts…"
            className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11.5px] w-56 outline-none focus:border-brand/50 mb-2"
          />
        </div>

        <Table>
          <THead>
            <TH>Alert ID</TH>
            <TH>Account ID</TH>
            <TH>Alert Type</TH>
            <TH align="right">Risk Score</TH>
            <TH>Tier</TH>
            <TH align="right">Amount</TH>
            <TH>Time</TH>
            <TH>Status</TH>
          </THead>
          <tbody>
            {pageItems.map(a => (
              <TR key={a.alert_id} onClick={() => setSelected(a)}>
                <TD className="font-mono text-[11px] text-text-secondary">{a.alert_id}</TD>
                <TD className="font-mono">ACC-{a.account_id}</TD>
                <TD>{a.alert_type}</TD>
                <TD align="right" className="font-mono tabular-nums">{a.risk_score.toFixed(0)}</TD>
                <TD><RiskBadge tier={a.tier as RiskTier} size="sm" /></TD>
                <TD align="right" className="font-mono tabular-nums">₹{a.amount.toLocaleString("en-IN")}</TD>
                <TD className="text-text-tertiary">{a.time}</TD>
                <TD><StatusBadge status={a.status} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>

      {selected && <AlertDrawer alert={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AlertDrawer({ alert, onClose }: { alert: MockAlert; onClose: () => void }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.getAccount(alert.account_id).then(setDetail);
  }, [alert.account_id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[420px] bg-surface border-l border-border z-40 overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-[11px] text-text-tertiary">{alert.alert_id}</div>
            <div className="font-mono text-[17px] font-semibold mt-0.5">ACC-{alert.account_id}</div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <RiskBadge tier={alert.tier as RiskTier} />
          <StatusBadge status={alert.status} />
        </div>

        <Section label="Alert Summary">
          <Row k="Alert Type" v={alert.alert_type} />
          <Row k="Risk Score" v={alert.risk_score.toFixed(0) + " / 1000"} />
          <Row k="Amount" v={`₹${alert.amount.toLocaleString("en-IN")}`} />
          <Row k="Time" v={alert.time} />
        </Section>

        {detail ? (
          <>
            <Section label="Why it triggered">
              <p className="text-[11.5px] text-text-secondary leading-relaxed">{detail.narrative}</p>
            </Section>

            <Section label="Model Scores">
              <Row k="XGBoost Probability" v={detail.xgb_score.toFixed(3)} />
              <Row k="Anomaly Score (Isolation Forest)" v={detail.iso_score.toFixed(2)} />
            </Section>

            <Section label="SHAP Contribution">
              <div className="space-y-1.5">
                {detail.top_factors.slice(0, 5).map(f => (
                  <div key={f.feature} className="flex items-center gap-2 text-[10.5px]">
                    <span className="font-mono text-text-tertiary flex-1 truncate">{f.feature.replace(/_/g, " ")}</span>
                    <span className={`font-mono ${f.direction === "increases_risk" ? "text-critical" : "text-low"}`}>
                      {f.impact > 0 ? "+" : ""}{f.impact.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          </>
        ) : (
          <div className="text-[11px] text-text-tertiary py-3">Loading model explanation…</div>
        )}

        <Section label="Recommended Action">
          <p className="text-[11.5px] text-text-secondary">
            {alert.tier === "critical" ? "Potential account freeze + SAR draft + investigator review" :
             alert.tier === "high" ? "Investigator alert + transaction hold where applicable" :
             alert.tier === "medium" ? "Enhanced monitoring + manual review" : "Monitor"}
          </p>
        </Section>

        <button
          onClick={() => navigate(`/accounts/${alert.account_id}`)}
          className="w-full mt-2 bg-brand text-black font-medium text-[12px] rounded-md py-2 hover:brightness-110"
        >
          Open Full Account
        </button>
      </aside>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary mb-2">{label}</div>
      {children}
    </div>
  );
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between text-[11.5px] py-1 border-b border-border/60 last:border-0">
      <span className="text-text-tertiary">{k}</span>
      <span className="font-mono text-text-primary">{v}</span>
    </div>
  );
}
