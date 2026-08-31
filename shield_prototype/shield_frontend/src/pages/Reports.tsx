import { useEffect, useMemo, useState } from "react";
import { Download, FileText } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";
import { api, type AccountSummary, type Metrics, type FilterOptions } from "../lib/api";
import { Panel, LoadingState, PrototypeTag } from "../components/ui";
import { buildReport, filterAccounts, downloadCsv, type ReportFilters } from "../lib/reportData";
import { downloadPdf } from "../lib/reportPdf";

const REPORTS = [
  "Daily Risk Summary", "Alert Volume", "Critical Accounts",
  "Mule Ring Summary", "Model Performance", "Investigator Performance",
];

export default function Reports() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [tier, setTier] = useState("All");
  const [segment, setSegment] = useState("All");

  useEffect(() => {
    Promise.all([
      api.getAccounts({ page_size: 9082 }),
      api.getMetrics(),
      api.getFilters(),
    ]).then(([acc, m, f]) => {
      setAccounts(acc.results);
      setMetrics(m);
      setFilterOptions(f);
      setLoading(false);
    });
  }, []);

  const filters: ReportFilters = { dateFrom, dateTo, tier, segment };
  const filteredAccounts = useMemo(() => filterAccounts(accounts, filters), [accounts, dateFrom, dateTo, tier, segment]);

  const dist = useMemo(() => {
    const c: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 };
    filteredAccounts.forEach(a => { c[a.risk_tier]++; });
    return [
      { tier: "Low", count: c.low },
      { tier: "Medium", count: c.medium },
      { tier: "High", count: c.high },
      { tier: "Critical", count: c.critical },
    ];
  }, [filteredAccounts]);

  const resolutionRate = useMemo(() => {
    const total = filteredAccounts.length || 1;
    const flagged = filteredAccounts.filter(a => a.flagged).length;
    const resolved = Math.round(flagged * 0.68);
    const falsePos = Math.round(flagged * 0.21);
    const pending = flagged - resolved - falsePos;
    return {
      resolved: `${((resolved / total) * 100).toFixed(0)}%`,
      falsePos: `${((falsePos / total) * 100).toFixed(0)}%`,
      pending: `${((Math.max(pending, 0) / total) * 100).toFixed(0)}%`,
    };
  }, [filteredAccounts]);

  const exportCsv = (reportName: string) => {
    const table = buildReport(reportName, filteredAccounts, metrics);
    downloadCsv(`${reportName.replace(/\s+/g, "_")}.csv`, table);
  };
  const exportPdf = (reportName: string) => {
    const table = buildReport(reportName, filteredAccounts, metrics);
    downloadPdf(reportName, table, { dateFrom, dateTo, tier, segment });
  };

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11px] outline-none focus:border-brand/50" />
          <span className="text-text-tertiary text-[11px]">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11px] outline-none focus:border-brand/50" />
          <select value={tier} onChange={e => setTier(e.target.value)} className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11px] outline-none focus:border-brand/50">
            <option>All</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
          <select value={segment} onChange={e => setSegment(e.target.value)} className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11px] outline-none focus:border-brand/50">
            <option>All</option>
            {filterOptions?.segments.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(dateFrom || dateTo || tier !== "All" || segment !== "All") && (
            <button
              onClick={() => { setDateFrom(""); setDateTo(""); setTier("All"); setSegment("All"); }}
              className="text-[11px] text-text-tertiary hover:text-text-secondary"
            >
              Clear filters
            </button>
          )}
          <span className="text-[10.5px] text-text-tertiary font-mono">{filteredAccounts.length.toLocaleString()} accounts in range</span>
        </div>
        <PrototypeTag />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Risk Distribution">
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262b31" vertical={false} />
              <XAxis dataKey="tier" tick={{ fontSize: 10.5, fill: "#9aa1ac" }} axisLine={{ stroke: "#262b31" }} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: "#5d6570" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "#1b1f24", border: "1px solid #262b31", borderRadius: 6, fontSize: 11 }} />
              <Bar dataKey="count" fill="#2fae66" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
        <Panel title="Resolution Rate (mock, scaled to current filter)">
          <div className="flex items-center justify-center h-[180px] gap-8">
            <Stat label="Resolved" value={resolutionRate.resolved} color="text-low" />
            <Stat label="False Positive" value={resolutionRate.falsePos} color="text-medium" />
            <Stat label="Pending" value={resolutionRate.pending} color="text-text-tertiary" />
          </div>
        </Panel>
      </div>

      <Panel title="Available Reports">
        <div className="grid grid-cols-2 gap-2">
          {REPORTS.map(r => {
            const rowCount = buildReport(r, filteredAccounts, metrics).rows.length;
            return (
              <div key={r} className="flex items-center justify-between border border-border rounded-md px-3 py-2.5 hover:bg-surface-hover">
                <div className="flex items-center gap-2 text-[11.5px]">
                  <FileText size={14} className="text-text-tertiary" />
                  <div>
                    <div>{r}</div>
                    <div className="text-[9.5px] text-text-tertiary font-mono">{rowCount} row{rowCount === 1 ? "" : "s"}</div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => exportCsv(r)} className="text-[10.5px] text-text-secondary border border-border rounded px-2 py-1 flex items-center gap-1 hover:bg-surface-2 cursor-pointer">
                    <Download size={11} /> CSV
                  </button>
                  <button onClick={() => exportPdf(r)} className="text-[10.5px] text-text-secondary border border-border rounded px-2 py-1 flex items-center gap-1 hover:bg-surface-2 cursor-pointer">
                    <Download size={11} /> PDF
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="text-center">
      <div className={`font-mono text-[24px] font-bold ${color}`}>{value}</div>
      <div className="text-[10.5px] text-text-tertiary mt-1">{label}</div>
    </div>
  );
}
