import { useCallback, useMemo, useRef, useState } from "react";
import { UploadCloud, FileCheck2, AlertTriangle, Download, Loader2 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { api, type ValidationResponse } from "../lib/api";
import { RiskBadge, PrototypeTag, DisclaimerNote } from "../components/ui";
import { Table, THead, TH, TR, TD, Pagination } from "../components/Table";
import type { RiskTier } from "../lib/risk";

const TIER_COLORS: Record<string, string> = { critical: "#e5484d", high: "#f0883e", medium: "#e8b93f", low: "#2fae66" };
const PAGE_SIZE = 25;

export default function Validate() {
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidationResponse | null>(null);
  const [page, setPage] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const pickFile = (f: File | null) => {
    setError(null);
    setResult(null);
    if (f && !f.name.toLowerCase().endsWith(".csv")) {
      setError("Please choose a .csv file.");
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    pickFile(e.dataTransfer.files?.[0] ?? null);
  }, []);

  const runValidation = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setPage(1);
    try {
      const res = await api.validateDataset(file);
      setResult(res);
    } catch (e: any) {
      setError(e.message || "Something went wrong scoring this file.");
    } finally {
      setLoading(false);
    }
  };

  const donutData = useMemo(() => {
    if (!result) return [];
    return [
      { name: "Critical", tier: "critical", value: result.score_buckets["critical (801-1000)"] ?? 0 },
      { name: "High", tier: "high", value: result.score_buckets["high (651-800)"] ?? 0 },
      { name: "Medium", tier: "medium", value: result.score_buckets["medium (401-650)"] ?? 0 },
      { name: "Low", tier: "low", value: result.score_buckets["low (0-400)"] ?? 0 },
    ];
  }, [result]);

  const totalPages = result ? Math.max(1, Math.ceil(result.results.length / PAGE_SIZE)) : 1;
  const pageRows = result ? result.results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE) : [];

  const downloadCsv = () => {
    if (!result) return;
    const header = "account_id,iso_score,xgb_score,shield_score,risk_tier,flagged\n";
    const rows = result.results
      .map(r => `${r.account_id},${r.iso_score},${r.xgb_score},${r.shield_score},${r.risk_tier},${r.flagged}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shield_validation_predictions.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-secondary">
          Upload a new account-feature CSV (e.g. a judges' validation set) and score it with
          the exact trained model — same encoding, scaling, and thresholds used everywhere
          else in this console. Nothing here refits or retrains on the uploaded file.
        </p>
        <PrototypeTag />
      </div>

      <div className="bg-surface border border-border rounded-lg p-5">
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg py-10 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
            dragOver ? "border-brand bg-brand-dim" : "border-border hover:border-border-strong"
          }`}
        >
          <UploadCloud size={26} className={dragOver ? "text-brand" : "text-text-tertiary"} />
          {file ? (
            <div className="flex items-center gap-2 text-[12.5px] text-text-primary">
              <FileCheck2 size={14} className="text-low" /> {file.name}
              <span className="text-text-tertiary">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
            </div>
          ) : (
            <>
              <div className="text-[12.5px] text-text-secondary">Drag & drop a CSV here, or click to browse</div>
              <div className="text-[10.5px] text-text-tertiary">Same feature schema as training (account_id + F1…F3923; F3924/FRAUD_TGT is target-only)</div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={runValidation}
            disabled={!file || loading}
            className="bg-brand text-black font-medium text-[12.5px] rounded-md px-4 py-2 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? <><Loader2 size={14} className="animate-spin" /> Scoring…</> : "Run Validation"}
          </button>
          {file && !loading && (
            <button onClick={() => { setFile(null); setResult(null); setError(null); }} className="text-[11.5px] text-text-tertiary hover:text-text-secondary">
              Clear
            </button>
          )}
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-[11.5px] text-critical bg-critical-dim border border-critical/30 rounded-md px-3 py-2">
            <AlertTriangle size={13} className="shrink-0" /> {error}
          </div>
        )}
      </div>

      {result && (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-[11px] text-text-secondary mb-1.5">Accounts Scored</div>
              <div className="font-mono text-[26px] font-bold tabular-nums">{result.n_rows.toLocaleString()}</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-[11px] text-text-secondary mb-1.5">Flagged</div>
              <div className="font-mono text-[26px] font-bold tabular-nums text-high">{result.flagged_count.toLocaleString()}</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              <div className="text-[11px] text-text-secondary mb-1.5">Mean SHIELD Score</div>
              <div className="font-mono text-[26px] font-bold tabular-nums">{result.mean_score.toFixed(0)}</div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4 flex flex-col justify-between">
              <div className="text-[11px] text-text-secondary mb-1.5">Export</div>
              <button onClick={downloadCsv} className="flex items-center gap-1.5 text-[11.5px] text-brand hover:underline">
                <Download size={13} /> Download predictions CSV
              </button>
            </div>
          </div>

          {result.warnings.length > 0 && (
            <div className="bg-surface border border-medium/30 rounded-lg p-3.5 space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11.5px] font-medium text-medium">
                <AlertTriangle size={13} /> Schema reconciliation warnings
              </div>
              {result.warnings.map((w, i) => (
                <div key={i} className="text-[11px] text-text-secondary pl-5">{w}</div>
              ))}
            </div>
          )}

          <DisclaimerNote>{result.disclaimer}</DisclaimerNote>

          <div className="grid grid-cols-[220px_1fr] gap-4">
            <div className="bg-surface border border-border rounded-lg p-4">
              <h3 className="text-[12px] font-semibold mb-3">Risk Distribution</h3>
              <div className="w-[150px] h-[150px] mx-auto relative">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" innerRadius={44} outerRadius={64} paddingAngle={2} stroke="none">
                      {donutData.map(d => <Cell key={d.tier} fill={TIER_COLORS[d.tier]} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {donutData.map(d => (
                  <div key={d.tier} className="flex items-center justify-between text-[10.5px]">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: TIER_COLORS[d.tier] }} />
                      <span className="text-text-secondary">{d.name}</span>
                    </div>
                    <span className="font-mono text-text-primary">{d.value.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-lg">
              <Table>
                <THead>
                  <TH>Account ID</TH>
                  <TH align="right">Anomaly</TH>
                  <TH align="right">XGBoost Prob.</TH>
                  <TH align="right">SHIELD Score</TH>
                  <TH>Tier</TH>
                  <TH>Status</TH>
                </THead>
                <tbody>
                  {pageRows.map(r => (
                    <TR key={r.account_id}>
                      <TD className="font-mono">ACC-{r.account_id}</TD>
                      <TD align="right" className="font-mono tabular-nums">{r.iso_score.toFixed(3)}</TD>
                      <TD align="right" className="font-mono tabular-nums">{r.xgb_score.toFixed(3)}</TD>
                      <TD align="right" className="font-mono tabular-nums">{r.shield_score.toFixed(0)}</TD>
                      <TD><RiskBadge tier={r.risk_tier as RiskTier} size="sm" /></TD>
                      <TD className="text-text-tertiary">{r.flagged ? "Requires Review" : "Monitor"}</TD>
                    </TR>
                  ))}
                </tbody>
              </Table>
              <Pagination page={page} totalPages={totalPages} onPage={setPage} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
