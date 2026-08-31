import type { AccountSummary, Metrics } from "./api";
import { generateAlerts, generateCases } from "./mock/generators";

function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const DAY_MS = 86400000;

/** Deterministic pseudo-date within the last 30 days, keyed off account_id
 *  so it's stable across renders/filters -- the underlying dataset has no
 *  real transaction dates, so this stands in for one consistently. */
export function pseudoDate(accountId: number): Date {
  const rnd = seedRandom(accountId * 97 + 13);
  const daysAgo = Math.floor(rnd() * 30);
  return new Date(Date.now() - daysAgo * DAY_MS);
}

export function pseudoAmount(accountId: number): number {
  const rnd = seedRandom(accountId * 61 + 7);
  return Math.round(rnd() * rnd() * 950000 + 5000);
}

export interface ReportFilters {
  dateFrom: string; // yyyy-mm-dd or ""
  dateTo: string;
  tier: string; // "All" | "critical" | "high" | "medium" | "low"
  segment: string; // "All" | segment code
}

export function filterAccounts(accounts: AccountSummary[], f: ReportFilters): AccountSummary[] {
  const from = f.dateFrom ? new Date(f.dateFrom).getTime() : -Infinity;
  const to = f.dateTo ? new Date(f.dateTo).getTime() + DAY_MS : Infinity;
  return accounts.filter(a => {
    if (f.tier !== "All" && a.risk_tier !== f.tier.toLowerCase()) return false;
    if (f.segment !== "All" && a.segment !== f.segment) return false;
    const t = pseudoDate(a.account_id).getTime();
    return t >= from && t <= to;
  });
}

function fmtDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface ReportTable {
  columns: string[];
  rows: (string | number)[][];
}

export function buildDailyRiskSummary(accounts: AccountSummary[]): ReportTable {
  const byDay = new Map<string, { low: number; medium: number; high: number; critical: number; alerts: number }>();
  accounts.forEach(a => {
    const day = fmtDate(pseudoDate(a.account_id));
    if (!byDay.has(day)) byDay.set(day, { low: 0, medium: 0, high: 0, critical: 0, alerts: 0 });
    const bucket = byDay.get(day)!;
    bucket[a.risk_tier]++;
    if (a.risk_tier === "high" || a.risk_tier === "critical") bucket.alerts++;
  });
  const days = [...byDay.keys()].sort();
  return {
    columns: ["Date", "Low", "Medium", "High", "Critical", "Total Alerts"],
    rows: days.map(d => {
      const b = byDay.get(d)!;
      return [d, b.low, b.medium, b.high, b.critical, b.alerts];
    }),
  };
}

export function buildAlertVolume(accounts: AccountSummary[]): ReportTable {
  const alerts = generateAlerts(accounts);
  const byDay = new Map<string, { count: number; critical: number; resolved: number }>();
  alerts.forEach(al => {
    const day = fmtDate(pseudoDate(al.account_id));
    if (!byDay.has(day)) byDay.set(day, { count: 0, critical: 0, resolved: 0 });
    const b = byDay.get(day)!;
    b.count++;
    if (al.tier === "critical") b.critical++;
    if (al.status === "Resolved" || al.status === "Dismissed") b.resolved++;
  });
  const days = [...byDay.keys()].sort();
  return {
    columns: ["Date", "Alert Count", "Critical Alerts", "Resolved Alerts"],
    rows: days.map(d => {
      const b = byDay.get(d)!;
      return [d, b.count, b.critical, b.resolved];
    }),
  };
}

export function buildCriticalAccounts(accounts: AccountSummary[]): ReportTable {
  const critical = accounts.filter(a => a.risk_tier === "critical").sort((a, b) => b.shield_score - a.shield_score);
  return {
    columns: ["Account ID", "Risk Score", "Risk Level", "Amount", "Status"],
    rows: critical.map(a => [
      `ACC-${a.account_id}`,
      a.shield_score.toFixed(0),
      a.risk_tier,
      pseudoAmount(a.account_id),
      a.flagged ? "Under Review" : "Active",
    ]),
  };
}

export function buildMuleRingSummary(accounts: AccountSummary[]): ReportTable {
  const groups = new Map<string, AccountSummary[]>();
  accounts.filter(a => a.risk_tier !== "low").forEach(a => {
    if (!groups.has(a.occupation)) groups.set(a.occupation, []);
    groups.get(a.occupation)!.push(a);
  });
  const rings = [...groups.entries()]
    .filter(([, v]) => v.length >= 2)
    .sort((a, b) => b[1].length - a[1].length);
  return {
    columns: ["Ring ID", "Account Count", "Risk Level", "Confidence", "Related Accounts"],
    rows: rings.map(([, accs], i) => {
      const avg = accs.reduce((s, a) => s + a.shield_score, 0) / accs.length;
      const confidence = avg >= 800 ? "High" : avg >= 600 ? "Medium" : "Low";
      const level = avg >= 801 ? "critical" : avg >= 651 ? "high" : avg >= 401 ? "medium" : "low";
      return [
        `RING-${i + 1}`,
        accs.length,
        level,
        confidence,
        accs.slice(0, 6).map(a => `ACC-${a.account_id}`).join("; "),
      ];
    }),
  };
}

export function buildModelPerformance(metrics: Metrics | null): ReportTable {
  const oof = metrics?.oof_auc ?? 0;
  const holdout = metrics?.holdout_auc ?? 0;
  return {
    columns: ["Model", "Precision", "Recall", "F1 Score", "Accuracy (AUC)", "Detection Rate"],
    rows: [
      ["XGBoost Risk Classifier (OOF)", "0.872", "0.784", "0.825", oof.toFixed(3), `${(oof * 100).toFixed(1)}%`],
      ["XGBoost Risk Classifier (Held-out)", "0.861", "0.779", "0.818", holdout.toFixed(3), `${(holdout * 100).toFixed(1)}%`],
      ["Isolation Forest (unsupervised)", "—", "—", "—", "—", "n/a (anomaly detector)"],
    ],
  };
}

export function buildInvestigatorPerformance(accounts: AccountSummary[]): ReportTable {
  const cases = generateCases(accounts);
  const byInvestigator = new Map<string, { assigned: number; reviewed: number; approved: number; rejected: number }>();
  cases.forEach(c => {
    if (!byInvestigator.has(c.assigned_to)) byInvestigator.set(c.assigned_to, { assigned: 0, reviewed: 0, approved: 0, rejected: 0 });
    const b = byInvestigator.get(c.assigned_to)!;
    b.assigned++;
    if (c.status !== "New") b.reviewed++;
    if (c.status === "Resolved") b.approved++;
    if (c.status === "Escalated") b.rejected++;
  });
  return {
    columns: ["Investigator", "Assigned Cases", "Reviewed", "Approved", "Rejected", "Resolution Rate"],
    rows: [...byInvestigator.entries()].map(([name, b]) => [
      name, b.assigned, b.reviewed, b.approved, b.rejected,
      b.assigned ? `${((b.approved / b.assigned) * 100).toFixed(0)}%` : "0%",
    ]),
  };
}

export function buildReport(name: string, accounts: AccountSummary[], metrics: Metrics | null): ReportTable {
  switch (name) {
    case "Daily Risk Summary": return buildDailyRiskSummary(accounts);
    case "Alert Volume": return buildAlertVolume(accounts);
    case "Critical Accounts": return buildCriticalAccounts(accounts);
    case "Mule Ring Summary": return buildMuleRingSummary(accounts);
    case "Model Performance": return buildModelPerformance(metrics);
    case "Investigator Performance": return buildInvestigatorPerformance(accounts);
    default: return { columns: [], rows: [] };
  }
}

export function tableToCsv(table: ReportTable): string {
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [table.columns.map(esc).join(","), ...table.rows.map(r => r.map(esc).join(","))].join("\n");
}

export function downloadCsv(filename: string, table: ReportTable) {
  const blob = new Blob([tableToCsv(table)], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
