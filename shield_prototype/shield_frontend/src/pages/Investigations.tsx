import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { api, type AccountSummary, type AccountDetail } from "../lib/api";
import { generateCases, type MockCase } from "../lib/mock/generators";
import { RiskBadge, StatusBadge, LoadingState, PrototypeTag } from "../components/ui";
import { Table, THead, TH, TR, TD } from "../components/Table";
import type { RiskTier } from "../lib/risk";

const TABS = ["My Cases", "Team Cases", "Unassigned", "Closed"] as const;

export default function Investigations() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>("My Cases");
  const [selected, setSelected] = useState<MockCase | null>(null);

  useEffect(() => {
    api.getAccounts({ flagged_only: true, page_size: 100, sort_by: "shield_score", sort_dir: "desc" }).then(res => {
      setAccounts(res.results);
      setLoading(false);
    });
  }, []);

  const cases = useMemo(() => generateCases(accounts), [accounts]);

  const filtered = useMemo(() => {
    if (tab === "My Cases") return cases.filter(c => c.assigned_to === "You" && c.status !== "Resolved");
    if (tab === "Team Cases") return cases.filter(c => c.assigned_to !== "You" && c.status !== "Resolved");
    if (tab === "Unassigned") return cases.filter(c => c.status === "New");
    return cases.filter(c => c.status === "Resolved");
  }, [cases, tab]);

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-secondary">Investigator case management — decisions here feed the future model retraining loop.</p>
        <PrototypeTag />
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <div className="flex px-2 pt-2 gap-1 border-b border-border">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[11.5px] rounded-t-md border-b-2 -mb-px ${tab === t ? "border-brand text-text-primary font-medium" : "border-transparent text-text-tertiary hover:text-text-secondary"}`}>
              {t}
            </button>
          ))}
        </div>
        <Table>
          <THead>
            <TH>Case ID</TH><TH>Alert ID</TH><TH>Account</TH><TH>Risk</TH>
            <TH>Assigned To</TH><TH>Status</TH><TH>SLA</TH><TH>Updated</TH>
          </THead>
          <tbody>
            {filtered.map(c => (
              <TR key={c.case_id} onClick={() => setSelected(c)}>
                <TD className="font-mono text-text-secondary">{c.case_id}</TD>
                <TD className="font-mono text-text-tertiary">{c.alert_id}</TD>
                <TD className="font-mono">ACC-{c.account_id}</TD>
                <TD><RiskBadge tier={c.tier as RiskTier} size="sm" /></TD>
                <TD>{c.assigned_to}</TD>
                <TD><StatusBadge status={c.status} /></TD>
                <TD className="font-mono text-text-tertiary">{c.sla}</TD>
                <TD className="text-text-tertiary">{c.updated}</TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>

      {selected && <CaseWorkspace case_={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function CaseWorkspace({ case_, onClose }: { case_: MockCase; onClose: () => void }) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);
  const [notes, setNotes] = useState("");

  useEffect(() => { api.getAccount(case_.account_id).then(setDetail); }, [case_.account_id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[460px] bg-surface border-l border-border z-40 overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-[11px] text-text-tertiary">{case_.case_id}</div>
            <div className="font-mono text-[17px] font-semibold mt-0.5">ACC-{case_.account_id}</div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <RiskBadge tier={case_.tier as RiskTier} />
          <StatusBadge status={case_.status} />
        </div>

        {detail && (
          <div className="mb-4">
            <div className="text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary mb-2">Risk Factors</div>
            <p className="text-[11.5px] text-text-secondary leading-relaxed border-l-2 border-brand pl-2.5">{detail.narrative}</p>
          </div>
        )}

        <div className="mb-4">
          <div className="text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary mb-2">Investigator Notes</div>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add findings, evidence references, or reasoning…"
            rows={4}
            className="w-full bg-surface-2 border border-border rounded-md p-2.5 text-[11.5px] outline-none focus:border-brand/50 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <button className="border border-low/40 text-low text-[11.5px] rounded-md py-2 hover:bg-low-dim">Mark True Positive</button>
          <button className="border border-border text-text-secondary text-[11.5px] rounded-md py-2 hover:bg-surface-hover">Mark False Positive</button>
          <button className="border border-high/40 text-high text-[11.5px] rounded-md py-2 hover:bg-high-dim">Escalate</button>
          <button className="border border-info/40 text-info text-[11.5px] rounded-md py-2 hover:bg-info-dim">Request Review</button>
        </div>
        <button className="w-full bg-surface-2 border border-border text-text-secondary text-[11.5px] rounded-md py-2 hover:bg-surface-hover">Close Case</button>
      </aside>
    </>
  );
}
