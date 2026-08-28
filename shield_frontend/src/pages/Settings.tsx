import { useState } from "react";
import { Panel } from "../components/ui";
import { TIER_BANDS } from "../lib/risk";

export default function Settings() {
  const [thresholds, setThresholds] = useState(
    Object.fromEntries(TIER_BANDS.map(b => [b.tier, { min: b.min, max: b.max }]))
  );

  return (
    <div className="space-y-4 max-w-3xl">
      <Panel title="Risk Thresholds">
        <div className="grid grid-cols-4 gap-3">
          {TIER_BANDS.map(b => (
            <div key={b.tier} className="border border-border rounded-md p-3">
              <div className={`text-[11px] font-medium capitalize mb-2 text-${b.tier}`}>{b.tier}</div>
              <div className="flex items-center gap-1.5 text-[11px]">
                <input
                  type="number"
                  value={thresholds[b.tier].min}
                  onChange={e => setThresholds(t => ({ ...t, [b.tier]: { ...t[b.tier], min: Number(e.target.value) } }))}
                  className="w-14 bg-surface-2 border border-border rounded px-1.5 py-1 font-mono outline-none focus:border-brand/50"
                />
                <span className="text-text-tertiary">–</span>
                <input
                  type="number"
                  value={thresholds[b.tier].max}
                  onChange={e => setThresholds(t => ({ ...t, [b.tier]: { ...t[b.tier], max: Number(e.target.value) } }))}
                  className="w-14 bg-surface-2 border border-border rounded px-1.5 py-1 font-mono outline-none focus:border-brand/50"
                />
              </div>
            </div>
          ))}
        </div>
        <button className="mt-3 bg-brand text-black text-[11.5px] font-medium rounded-md px-3 py-1.5 hover:brightness-110">Save Thresholds</button>
      </Panel>

      <Panel title="Notification Settings">
        <div className="space-y-2.5">
          {["Email alerts for Critical tier", "Slack notification on new SAR", "Daily summary digest"].map(n => (
            <label key={n} className="flex items-center justify-between text-[11.5px]">
              {n}
              <input type="checkbox" defaultChecked className="accent-brand" />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Feed Configuration">
        <p className="text-[11.5px] text-text-secondary">Configure ingestion source credentials and sync intervals for I4C, CERT-In, NCRP, RBI CIBIL, FMS, and TMS. Not connected in this prototype.</p>
      </Panel>

      <Panel title="User Roles">
        <div className="flex gap-2">
          {["Analyst", "Senior Investigator", "Compliance Officer", "Admin"].map(r => (
            <span key={r} className="text-[11px] border border-border rounded-full px-2.5 py-1 text-text-secondary">{r}</span>
          ))}
        </div>
      </Panel>

      <Panel title="Audit Settings">
        <p className="text-[11.5px] text-text-secondary">All investigator actions (freeze / escalate / dismiss / case decisions) are logged with timestamp and analyst ID to the audit trail — visible per-account in the Account Detail view.</p>
      </Panel>
    </div>
  );
}
