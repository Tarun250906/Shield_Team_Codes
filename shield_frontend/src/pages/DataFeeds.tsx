import { RefreshCw } from "lucide-react";
import { DATA_FEEDS } from "../lib/mock/generators";
import { StatusBadge, PrototypeTag } from "../components/ui";
import { Table, THead, TH, TR, TD } from "../components/Table";

export default function DataFeeds() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-text-secondary">External and internal fraud-intelligence sources feeding the risk engine.</p>
        <div className="flex items-center gap-2">
          <PrototypeTag />
          <button className="flex items-center gap-1.5 text-[11px] text-text-secondary border border-border rounded-md px-2.5 py-1.5 hover:bg-surface-hover">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-lg">
        <Table>
          <THead>
            <TH>Feed</TH><TH>Type</TH><TH>Last Update</TH><TH align="right">Records</TH><TH>Status</TH>
          </THead>
          <tbody>
            {DATA_FEEDS.map(f => (
              <TR key={f.name}>
                <TD className="font-medium">{f.name}</TD>
                <TD className="text-text-tertiary">{f.type}</TD>
                <TD className="font-mono text-text-tertiary">{f.lastSync}</TD>
                <TD align="right" className="font-mono tabular-nums">{f.records.toLocaleString()}</TD>
                <TD><StatusBadge status={f.status} /></TD>
              </TR>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="bg-surface-2 border border-border rounded-lg p-3 text-[10.5px] text-text-tertiary leading-relaxed">
        These are simulated demo feeds. No live integration exists with I4C, CERT-In, NCRP, RBI CIBIL, or internal
        FMS/TMS systems in this prototype — the architecture is designed so each feed becomes a real
        ingestion source without changing the scoring API surface.
      </div>
    </div>
  );
}
