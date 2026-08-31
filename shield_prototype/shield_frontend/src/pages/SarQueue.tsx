import { useEffect, useMemo, useState } from "react";
import { X, Download } from "lucide-react";
import { api, type AccountSummary, type AccountDetail } from "../lib/api";
import { generateSars, type MockSar } from "../lib/mock/generators";
import { RiskBadge, StatusBadge, LoadingState, PrototypeTag } from "../components/ui";
import { Table, THead, TH, TR, TD } from "../components/Table";
import type { RiskTier } from "../lib/risk";

const SAR_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected", "Filed"];

export default function SarQueue() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("All");
  const [statusOverrides, setStatusOverrides] = useState<Record<string, string>>({});
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [reviewing, setReviewing] = useState<MockSar | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    api.getAccounts({ page_size: 400, sort_by: "shield_score", sort_dir: "desc" }).then(res => {
      setAccounts(res.results);
      setLoading(false);
    });
  }, []);

  const baseSars = useMemo(() => generateSars(accounts), [accounts]);
  const sars = useMemo(
    () => baseSars.map(s => ({ ...s, status: statusOverrides[s.sar_id] ?? s.status })),
    [baseSars, statusOverrides]
  );

  const filtered = tab === "All" ? sars : sars.filter(s => s.status === tab);
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    sars.forEach(s => { c[s.status] = (c[s.status] ?? 0) + 1; });
    return c;
  }, [sars]);

  const setStatus = (sarId: string, status: string) => {
    setStatusOverrides(prev => ({ ...prev, [sarId]: status }));
    setToast(`${sarId} → ${status}`);
    setTimeout(() => setToast(null), 2000);
  };

  const exportSar = (s: MockSar) => {
    const rows = [
      ["Field", "Value"],
      ["SAR ID", s.sar_id],
      ["Account", `ACC-${s.account_id}`],
      ["Risk Tier", s.tier],
      ["Amount (INR)", String(s.amount)],
      ["Created", s.created],
      ["Status", statusOverrides[s.sar_id] ?? s.status],
      ["Due", s.due],
      ["Investigator Note", (notesById[s.sar_id] ?? "").replace(/\n/g, " ")],
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.sar_id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-secondary">Suspicious Activity Report workflow — mock document generation only.</p>
        <PrototypeTag />
      </div>

      <div className="bg-yellow-500/10 border border-medium/30 rounded-lg px-3 py-2 text-[11px] text-medium">
        This prototype does not file reports with FIU-IND or any regulator. All SAR statuses below are a simulated internal workflow.
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <div className="flex px-2 pt-2 gap-1 border-b border-border">
          {["All", ...SAR_STATUSES].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-3 py-2 text-[11.5px] rounded-t-md border-b-2 -mb-px ${tab === t ? "border-brand text-text-primary font-medium" : "border-transparent text-text-tertiary hover:text-text-secondary"}`}>
              {t}{t !== "All" && ` (${counts[t] ?? 0})`}
            </button>
          ))}
        </div>
        <Table>
          <THead>
            <TH>SAR ID</TH><TH>Account</TH><TH>Risk</TH><TH align="right">Amount</TH>
            <TH>Created</TH><TH>Status</TH><TH>Due</TH><TH>Actions</TH>
          </THead>
          <tbody>
            {filtered.map(s => (
              <TR key={s.sar_id}>
                <TD className="font-mono text-text-secondary">{s.sar_id}</TD>
                <TD className="font-mono">ACC-{s.account_id}</TD>
                <TD><RiskBadge tier={s.tier as RiskTier} size="sm" /></TD>
                <TD align="right" className="font-mono tabular-nums">₹{s.amount.toLocaleString("en-IN")}</TD>
                <TD className="text-text-tertiary">{s.created}</TD>
                <TD><StatusBadge status={s.status} /></TD>
                <TD className="font-mono text-text-tertiary">{s.due}</TD>
                <TD>
                  <div className="flex gap-2.5 whitespace-nowrap">
                    <button onClick={() => setReviewing(s)} className="text-[10.5px] text-info hover:underline cursor-pointer">Review</button>
                    <button onClick={() => exportSar(s)} className="text-[10.5px] text-text-tertiary hover:underline cursor-pointer flex items-center gap-1">
                      <Download size={10} /> Export
                    </button>
                  </div>
                </TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>

      {reviewing && (
        <SarReviewDrawer
          sar={{ ...reviewing, status: statusOverrides[reviewing.sar_id] ?? reviewing.status }}
          note={notesById[reviewing.sar_id] ?? ""}
          onNoteChange={n => setNotesById(prev => ({ ...prev, [reviewing.sar_id]: n }))}
          onStatusChange={status => setStatus(reviewing.sar_id, status)}
          onExport={() => exportSar(reviewing)}
          onClose={() => setReviewing(null)}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-surface-2 border border-brand/40 text-text-primary text-[12px] px-4 py-2.5 rounded-md shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function SarReviewDrawer({
  sar, note, onNoteChange, onStatusChange, onExport, onClose,
}: {
  sar: MockSar;
  note: string;
  onNoteChange: (n: string) => void;
  onStatusChange: (s: string) => void;
  onExport: () => void;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<AccountDetail | null>(null);

  useEffect(() => { api.getAccount(sar.account_id).then(setDetail); }, [sar.account_id]);

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[440px] bg-surface border-l border-border z-40 overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-mono text-[11px] text-text-tertiary">{sar.sar_id}</div>
            <div className="font-mono text-[17px] font-semibold mt-0.5">ACC-{sar.account_id}</div>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <RiskBadge tier={sar.tier as RiskTier} />
          <StatusBadge status={sar.status} />
        </div>

        <Section label="SAR Summary">
          <Row k="Amount" v={`₹${sar.amount.toLocaleString("en-IN")}`} />
          <Row k="Created" v={sar.created} />
          <Row k="Due" v={sar.due} />
          {detail && <Row k="SHIELD Score" v={`${detail.shield_score.toFixed(0)} / 1000`} />}
        </Section>

        {detail ? (
          <Section label="Reason for Alert">
            <p className="text-[11.5px] text-text-secondary leading-relaxed">{detail.narrative}</p>
          </Section>
        ) : (
          <div className="text-[11px] text-text-tertiary py-2">Loading account risk factors…</div>
        )}

        <Section label="Change Status">
          <div className="flex flex-wrap gap-1.5">
            {SAR_STATUSES.map(st => (
              <button
                key={st}
                onClick={() => onStatusChange(st)}
                className={`text-[10.5px] px-2.5 py-1.5 rounded border ${
                  sar.status === st ? "border-brand text-brand bg-brand-dim" : "border-border text-text-secondary hover:bg-surface-hover"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Investigator Note">
          <textarea
            value={note}
            onChange={e => onNoteChange(e.target.value)}
            placeholder="Add investigation notes…"
            rows={4}
            className="w-full bg-surface-2 border border-border rounded-md p-2.5 text-[11.5px] outline-none focus:border-brand/50 resize-none"
          />
        </Section>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <button onClick={() => onStatusChange("Approved")} className="border border-low/40 text-low text-[11.5px] rounded-md py-2 hover:bg-low-dim">Approve</button>
          <button onClick={() => onStatusChange("Rejected")} className="border border-critical/40 text-critical text-[11.5px] rounded-md py-2 hover:bg-critical-dim">Reject</button>
        </div>
        <button onClick={onExport} className="w-full mt-2 flex items-center justify-center gap-1.5 bg-surface-2 border border-border text-text-secondary text-[11.5px] rounded-md py-2 hover:bg-surface-hover">
          <Download size={12} /> Export CSV
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
