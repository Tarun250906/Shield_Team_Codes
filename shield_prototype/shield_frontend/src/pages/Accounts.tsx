import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type AccountSummary, type FilterOptions } from "../lib/api";
import { RiskBadge, RiskScoreBar, LoadingState } from "../components/ui";
import { Table, THead, TH, TR, TD, Pagination } from "../components/Table";

const PAGE_SIZE = 25;

export default function Accounts() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AccountSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<FilterOptions | null>(null);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [occupation, setOccupation] = useState("");
  const [accountType, setAccountType] = useState("");
  const [segment, setSegment] = useState("");
  const [flaggedOnly, setFlaggedOnly] = useState(false);
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("shield_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  useEffect(() => { api.getFilters().then(setFilters); }, []);

  const load = useCallback(() => {
    setLoading(true);
    api.getAccounts({
      search: search || undefined,
      occupation: occupation || undefined,
      account_type: accountType || undefined,
      segment: segment || undefined,
      flagged_only: flaggedOnly || undefined,
      min_score: minScore,
      sort_by: sortBy,
      sort_dir: sortDir,
      page,
      page_size: PAGE_SIZE,
    }).then(res => {
      setRows(res.results);
      setTotal(res.total);
      setLoading(false);
    });
  }, [search, occupation, accountType, segment, flaggedOnly, minScore, sortBy, sortDir, page]);

  useEffect(() => { load(); }, [load]);

  const toggleSort = (key: string) => {
    if (sortBy === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir("desc"); }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="bg-surface border border-border rounded-lg p-3 flex flex-wrap items-center gap-2.5">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search account ID…"
          className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11.5px] w-40 outline-none focus:border-brand/50"
        />
        <Select value={accountType} onChange={v => { setAccountType(v); setPage(1); }} placeholder="Account type" options={filters?.account_types ?? []} />
        <Select value={occupation} onChange={v => { setOccupation(v); setPage(1); }} placeholder="Occupation" options={filters?.occupations ?? []} />
        <Select value={segment} onChange={v => { setSegment(v); setPage(1); }} placeholder="Segment" options={filters?.segments ?? []} />
        <label className="flex items-center gap-1.5 text-[11.5px] text-text-secondary cursor-pointer">
          <input type="checkbox" checked={flaggedOnly} onChange={e => { setFlaggedOnly(e.target.checked); setPage(1); }} className="accent-brand" />
          Flagged only
        </label>
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <span>Min score</span>
          <input type="range" min={0} max={1000} value={minScore} onChange={e => { setMinScore(Number(e.target.value)); setPage(1); }} className="w-24 accent-brand" />
          <span className="font-mono w-9">{minScore}</span>
        </div>
        <span className="ml-auto font-mono text-[11px] text-text-tertiary">{total.toLocaleString()} accounts</span>
      </div>

      <div className="bg-surface border border-border rounded-lg">
        {loading ? <LoadingState /> : (
          <Table>
            <THead>
              <SortTH label="Account ID" k="account_id" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TH>Type</TH>
              <TH>Occupation</TH>
              <SortTH label="Age" k="age" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortTH label="Anomaly" k="iso_score" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortTH label="XGBoost Prob." k="xgb_score" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
              <SortTH label="SHIELD Score" k="shield_score" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} />
              <TH>Tier</TH>
              <TH>Status</TH>
            </THead>
            <tbody>
              {rows.map(a => (
                <TR key={a.account_id} onClick={() => navigate(`/accounts/${a.account_id}`)}>
                  <TD className="font-mono">ACC-{a.account_id}</TD>
                  <TD>{a.account_type}</TD>
                  <TD>{a.occupation}</TD>
                  <TD align="right" className="font-mono tabular-nums">{a.age ?? "—"}</TD>
                  <TD align="right" className="font-mono tabular-nums">{a.iso_score.toFixed(2)}</TD>
                  <TD align="right" className="font-mono tabular-nums">{a.xgb_score.toFixed(3)}</TD>
                  <TD><RiskScoreBar score={a.shield_score} tier={a.risk_tier} /></TD>
                  <TD><RiskBadge tier={a.risk_tier} size="sm" /></TD>
                  <TD className="text-text-tertiary">{a.flagged ? "Under Review" : "Active"}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
        <Pagination page={page} totalPages={totalPages} onPage={setPage} />
      </div>
    </div>
  );
}

function Select({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder: string }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11.5px] text-text-secondary outline-none focus:border-brand/50"
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SortTH({ label, k, sortBy, sortDir, onSort, align }: { label: string; k: string; sortBy: string; sortDir: string; onSort: (k: string) => void; align?: "left" | "right" }) {
  const active = sortBy === k;
  return (
    <th
      onClick={() => onSort(k)}
      className={`px-3 py-2.5 text-[10.5px] font-medium uppercase tracking-wide cursor-pointer select-none whitespace-nowrap text-${align ?? "left"} ${active ? "text-brand" : "text-text-tertiary hover:text-text-secondary"}`}
    >
      {label} {active && (sortDir === "asc" ? "↑" : "↓")}
    </th>
  );
}
