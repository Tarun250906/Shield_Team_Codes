import { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, Legend } from "recharts";
import { api, type Metrics } from "../lib/api";
import { generatePerformanceTrend, MODEL_FEATURE_DRIFT } from "../lib/mock/generators";
import { MetricCard, Panel, LoadingState, PrototypeTag, DisclaimerNote } from "../components/ui";

export default function ModelMonitor() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [model, setModel] = useState<"XGBoost Risk Classifier" | "Isolation Forest">("XGBoost Risk Classifier");
  const trend = useMemo(() => generatePerformanceTrend(), []);

  useEffect(() => { api.getMetrics().then(setMetrics); }, []);

  if (!metrics) return <LoadingState />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <select
          value={model}
          onChange={e => setModel(e.target.value as any)}
          className="bg-surface-2 border border-border rounded-md px-2.5 py-1.5 text-[11.5px] outline-none focus:border-brand/50"
        >
          <option>XGBoost Risk Classifier</option>
          <option>Isolation Forest</option>
        </select>
        <PrototypeTag />
      </div>

      <DisclaimerNote>{metrics.disclaimer}</DisclaimerNote>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="AUC-ROC (k-fold OOF)" value={metrics.oof_auc.toFixed(3)} sub="on the 80% training split" accent="info" />
        <MetricCard
          label="AUC-ROC (held-out)"
          value={metrics.holdout_auc.toFixed(3)}
          sub={`${metrics.holdout_size.toLocaleString()} rows never touched during fitting`}
          accent="brand"
        />
        <MetricCard label="Precision @ 5% FPR" value="0.872" sub="prototype metric" />
        <MetricCard label="Recall" value="0.784" sub="prototype metric" accent="high" />
      </div>

      <div className="bg-surface-2 border border-border rounded-lg p-3.5 text-[11px] text-text-secondary leading-relaxed">
        <span className="text-brand font-medium">Training target: </span>
        XGBoost is trained directly against the dataset's binary
        <span className="font-mono"> FRAUD_TGT </span>
        target, where 0 represents non-fraud and 1 represents fraud.
        The held-out metrics are calculated against the real target labels.
        Isolation Forest remains an independent unsupervised anomaly detector
        and contributes separately to the SHIELD ensemble score.
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Panel title="Performance Trend" action={<span className="text-[10.5px] text-text-tertiary">Last 14 days</span>}>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trend} margin={{ left: -20, top: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262b31" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 9.5, fill: "#5d6570" }} axisLine={{ stroke: "#262b31" }} tickLine={false} interval={2} />
              <YAxis tick={{ fontSize: 9.5, fill: "#5d6570" }} axisLine={false} tickLine={false} domain={[0.7, 1]} />
              <Tooltip contentStyle={{ background: "#1b1f24", border: "1px solid #262b31", borderRadius: 6, fontSize: 11 }} />
              <Legend wrapperStyle={{ fontSize: 10.5 }} />
              <Line type="monotone" dataKey="auc" stroke="#4c9fe8" strokeWidth={1.5} dot={false} name="AUC-ROC" />
              <Line type="monotone" dataKey="precision" stroke="#2fae66" strokeWidth={1.5} dot={false} name="Precision" />
              <Line type="monotone" dataKey="recall" stroke="#f0883e" strokeWidth={1.5} dot={false} name="Recall" />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Feature Drift (Top 5)" action={<a className="text-[10.5px] text-brand hover:underline cursor-pointer">View all features</a>}>
          <div className="space-y-2.5">
            {MODEL_FEATURE_DRIFT.map(f => (
              <div key={f.feature}>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="font-mono text-text-secondary">{f.feature}</span>
                  <span className="font-mono text-text-primary">{f.drift.toFixed(3)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div className="h-full rounded-full bg-info/70" style={{ width: `${f.drift * 500}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Model Health">
        <div className="grid grid-cols-4 gap-4 text-[11.5px]">
          <div><div className="text-text-tertiary text-[10px] uppercase mb-1">Status</div><div className="text-low font-medium flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-low" /> Healthy (prototype)</div></div>
          <div><div className="text-text-tertiary text-[10px] uppercase mb-1">Last Trained</div><div className="font-mono">2026-07-22</div></div>
          <div><div className="text-text-tertiary text-[10px] uppercase mb-1">Training Samples</div><div className="font-mono">{metrics.n_accounts.toLocaleString()}</div></div>
          <div><div className="text-text-tertiary text-[10px] uppercase mb-1">Features</div><div className="font-mono">{metrics.n_features} <span className="text-text-tertiary">of 3,924</span></div></div>
        </div>
      </Panel>
    </div>
  );
}
