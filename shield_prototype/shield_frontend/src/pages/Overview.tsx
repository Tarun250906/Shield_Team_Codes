import { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { api, type AccountSummary, type Metrics } from "../lib/api";
import { generateAlerts, generateRiskTrend, DATA_FEEDS } from "../lib/mock/generators";
import { MetricCard, Panel, RiskBadge, DisclaimerNote, PrototypeTag, LoadingState, StatusBadge } from "../components/ui";
import type { RiskTier } from "../lib/risk";
import { Link } from "react-router-dom";

const TIER_COLORS: Record<string, string> = { critical: "#e5484d", high: "#f0883e", medium: "#e8b93f", low: "#2fae66" };

export default function Overview() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMetrics(), api.getAccounts({ page_size: 9082 })]).then(([m, a]) => {
      setMetrics(m);
      setAccounts(a.results);
      setLoading(false);
    });
  }, []);

  const donutData = useMemo(() => {
    if (!metrics) return [];
    return [
      { name: "Critical", value: metrics.score_buckets["critical (801-1000)"] ?? 0, tier: "critical" },
      { name: "High", value: metrics.score_buckets["high (651-800)"] ?? 0, tier: "high" },
      { name: "Medium", value: metrics.score_buckets["medium (401-650)"] ?? 0, tier: "medium" },
      { name: "Low", value: metrics.score_buckets["low (0-400)"] ?? 0, tier: "low" },
    ];
  }, [metrics]);

  const topSegments = useMemo(() => aggregate(accounts, a => segmentLabel(a.segment)), [accounts]);
  const topOccupations = useMemo(() => aggregate(accounts, a => a.occupation), [accounts]);

  const recentAlerts = useMemo(() => {
    const flagged = accounts.filter(a => a.risk_tier === "critical" || a.risk_tier === "high").slice(0, 5);
    return generateAlerts(flagged);
  }, [accounts]);

  const trend = useMemo(() => generateRiskTrend(), []);

  if (loading || !metrics) return <LoadingState />;

  const criticalPct = ((metrics.score_buckets["critical (801-1000)"] ?? 0) / metrics.n_accounts * 100).toFixed(1);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Total Accounts" value={metrics.n_accounts.toLocaleString()} sub="scanned in current batch" />
        <MetricCard label="Flagged for Review" value={metrics.flagged_count.toLocaleString()} accent="high" sub="top ~3% by risk score" />
        <MetricCard label="Critical Tier" value={(metrics.score_buckets["critical (801-1000)"] ?? 0).toLocaleString()} accent="critical" sub={`${criticalPct}% of flagged`} />
        <MetricCard
          label="Model AUC (Held-Out, FRAUD_TGT)"
          value={`${(metrics.holdout_auc * 100).toFixed(1)}%`}
          accent="info"
          sub="evaluated against real target labels"
        />
      </div>

      <DisclaimerNote>{metrics.disclaimer}</DisclaimerNote>

      {/* Section 1 + 2 */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Risk Score Distribution">
          <div className="flex items-center gap-6">
            <div className="w-[150px] h-[150px] shrink-0 relative">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={donutData} dataKey="value" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {donutData.map(d => <Cell key={d.tier} fill={TIER_COLORS[d.tier]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="font-mono text-[18px] font-bold text-critical">{criticalPct}%</div>
                <div className="text-[9px] text-text-tertiary">Critical</div>
              </div>
            </div>
            <div className="flex-1 space-y-2">
              {donutData.map(d => (
                <div key={d.tier} className="flex items-center justify-between text-[11.5px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ background: TIER_COLORS[d.tier] }} />
                    <span className="text-text-secondary">{d.name}</span>
                  </div>
                  <span className="font-mono tabular-nums text-text-primary">{d.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Risk Score Trend" action={<span className="text-[10.5px] text-text-tertiary">Last 24 hours</span>}>
          <ResponsiveContainer width="100%" height={150}>
            <LineChart data={trend} margin={{ left: -20, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262b31" vertical={false} />
              <XAxis dataKey="time" tick={{ fontSize: 9.5, fill: "#5d6570" }} interval={5} axisLine={{ stroke: "#262b31" }} tickLine={false} />
              <YAxis tick={{ fontSize: 9.5, fill: "#5d6570" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: "#1b1f24", border: "1px solid #262b31", borderRadius: 6, fontSize: 11 }}
                labelStyle={{ color: "#9aa1ac" }}
              />
              <Line type="monotone" dataKey="score" stroke="#e5484d" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Section 3 + 4 */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Top Risk Segments">
          <BarList items={topSegments} />
        </Panel>
        <Panel title="Top Risk Occupations">
          <BarList items={topOccupations} />
        </Panel>
      </div>

      {/* Section 5 + 6 */}
      <div className="grid grid-cols-2 gap-4">
        <Panel title="Recent Alerts" action={<Link to="/alerts" className="text-[10.5px] text-brand hover:underline">View all</Link>}>
          <div className="space-y-0">
            {recentAlerts.map(al => (
              <Link
                to={`/accounts/${al.account_id}`}
                key={al.alert_id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-surface-hover -mx-4 px-4 text-[11.5px]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <RiskBadge tier={al.tier as RiskTier} size="sm" />
                  <div className="min-w-0">
                    <div className="text-text-primary font-mono">ACC-{al.account_id}</div>
                    <div className="text-text-tertiary truncate">{al.alert_type}</div>
                  </div>
                </div>
                <span className="text-text-tertiary shrink-0">{al.time}</span>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="Data Feed Status">
          <div className="space-y-2">
            {DATA_FEEDS.map(f => (
              <div key={f.name} className="flex items-center justify-between text-[11.5px] py-1">
                <span className="text-text-secondary">{f.name}</span>
                <StatusBadge status={f.status} />
              </div>
            ))}
            <div className="pt-1"><PrototypeTag /></div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function segmentLabel(s: string) {
  const map: Record<string, string> = { R: "Rural Banking", U: "Urban Self Employed", SU: "Semi-Urban", M: "Metro" };
  return map[s] ?? s;
}

function aggregate(accounts: AccountSummary[], keyFn: (a: AccountSummary) => string) {
  const map = new Map<string, number>();
  accounts.forEach(a => {
    if (a.risk_tier === "low") return;
    const k = keyFn(a);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
}

function BarList({ items }: { items: [string, number][] }) {
  const max = Math.max(...items.map(i => i[1]), 1);
  return (
    <div className="space-y-2.5">
      {items.map(([label, count]) => (
        <div key={label}>
          <div className="flex justify-between text-[11.5px] mb-1">
            <span className="text-text-secondary">{label}</span>
            <span className="font-mono text-text-primary">{count.toLocaleString()}</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div className="h-full rounded-full bg-critical/70" style={{ width: `${(count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
