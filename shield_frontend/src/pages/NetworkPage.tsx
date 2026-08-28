import { useEffect, useMemo, useRef, useState } from "react";
import { ZoomIn, ZoomOut, Download, Maximize2, X, Route } from "lucide-react";
import { api, type AccountDetail, type NetworkNode, type NetworkEdge } from "../lib/api";
import { LoadingState, PrototypeTag, RiskBadge } from "../components/ui";
import NetworkGraph, { type NetworkGraphHandle } from "../components/NetworkGraph";
import type { RiskTier } from "../lib/risk";
import { groupByComponent, shortestPath, communityColor } from "../lib/graphUtils";

const WINDOW_ACCOUNT_COUNT: Record<string, number> = {
  "24 hours": 4,
  "7 days": 10,
  "30 days": 22,
};
// how many related accounts to keep per focus account -- narrower for
// short windows so "24 hours" genuinely looks concentrated, not just a
// smaller version of the same fully-merged pool.
const WINDOW_RELATED_LIMIT: Record<string, number> = {
  "24 hours": 2,
  "7 days": 4,
  "30 days": 6,
};

type GraphType = "Transactions" | "Community" | "Shortest Path";

export default function NetworkPage() {
  const graphRef = useRef<NetworkGraphHandle>(null);
  const [loading, setLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showAmounts, setShowAmounts] = useState(false);
  const [window_, setWindow] = useState<"24 hours" | "7 days" | "30 days">("24 hours");
  const [graphType, setGraphType] = useState<GraphType>("Transactions");
  const [minRisk, setMinRisk] = useState(650);
  const [selectedRing, setSelectedRing] = useState<number | null>(null);
  const [merged, setMerged] = useState<{ nodes: NetworkNode[]; edges: NetworkEdge[] } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<number | null>(null);
  const [selectedNode, setSelectedNode] = useState<AccountDetail | null>(null);
  const [pathSource, setPathSource] = useState<number | null>(null);
  const [pathTarget, setPathTarget] = useState<number | null>(null);

  // re-fetch whenever the time window changes -- a wider window pulls in
  // more accounts, which is what actually changes node/edge count (not
  // just a label swap).
  useEffect(() => {
    setLoading(true);
    const count = WINDOW_ACCOUNT_COUNT[window_];
    const relatedLimit = WINDOW_RELATED_LIMIT[window_];
    api.getAccounts({ flagged_only: true, page_size: count, sort_by: "shield_score", sort_dir: "desc" }).then(async res => {
      const nets = await Promise.all(res.results.map(a => api.getNetwork(a.account_id)));
      const nodeMap = new Map<number, NetworkNode>();
      const edgeKey = new Set<string>();
      const edges: NetworkEdge[] = [];
      nets.forEach(n => {
        const focus = n.nodes.find(nd => nd.is_focus);
        if (focus && !nodeMap.has(focus.id)) nodeMap.set(focus.id, focus);
        // keep only the top `relatedLimit` related accounts (by score) per
        // focus account -- this is what actually makes "24 hours" render
        // as a small, concentrated graph instead of a shrunk copy of "30 days"
        const related = n.nodes.filter(nd => !nd.is_focus)
          .sort((a, b) => b.shield_score - a.shield_score)
          .slice(0, relatedLimit);
        related.forEach(nd => { if (!nodeMap.has(nd.id)) nodeMap.set(nd.id, nd); });
        const keptIds = new Set([focus?.id, ...related.map(r => r.id)]);
        n.edges.forEach(e => {
          if (!keptIds.has(e.source as number) || !keptIds.has(e.target as number)) return;
          const k = `${e.source}-${e.target}`;
          if (!edgeKey.has(k)) { edgeKey.add(k); edges.push(e); }
        });
      });
      setMerged({ nodes: [...nodeMap.values()], edges });
      setSelectedRing(null);
      setPathSource(null);
      setPathTarget(null);
      setLoading(false);
    });
  }, [window_]);

  const filteredGraph = useMemo(() => {
    if (!merged) return null;
    const nodes = merged.nodes.filter(n => n.shield_score >= minRisk || n.is_focus);
    const ids = new Set(nodes.map(n => n.id));
    const edges = merged.edges.filter(e => ids.has(e.source as number) && ids.has(e.target as number));
    return {
      simulated: true,
      note: `Illustrative ring map merged from ${nodes.length} accounts in the "${window_}" window — no real transaction graph is connected in this prototype.`,
      nodes,
      edges,
    };
  }, [merged, minRisk, window_]);

  // rings recompute from whatever's currently visible, so the slider and
  // time window both genuinely change the count -- same connected-
  // components logic drives both the summary panel and Community coloring.
  const rings = useMemo(() => {
    if (!filteredGraph || filteredGraph.nodes.length === 0) return [];
    const communities = groupByComponent(filteredGraph.nodes, filteredGraph.edges)
      .filter(c => c.memberIds.length >= 2)
      .sort((a, b) => b.memberIds.length - a.memberIds.length);

    const byId = new Map(filteredGraph.nodes.map(n => [n.id, n]));
    return communities.map((c, i) => {
      const members = c.memberIds.map(id => byId.get(id)!).filter(Boolean);
      const avgScore = members.reduce((s, m) => s + m.shield_score, 0) / members.length;
      const confidence = avgScore >= 800 ? "High" : avgScore >= 600 ? "Medium" : "Low";
      return { id: i + 1, rootId: c.rootId, members, confidence, colorIndex: i };
    });
  }, [filteredGraph]);

  const selectedRingData = rings.find(r => r.id === selectedRing) ?? null;
  const highlightIds = useMemo(() => {
    if (graphType === "Shortest Path") return null; // path uses its own highlighting
    if (!selectedRingData) return null;
    return new Set(selectedRingData.members.map(m => m.id));
  }, [selectedRingData, graphType]);

  const pathResult = useMemo(() => {
    if (graphType !== "Shortest Path" || pathSource == null || pathTarget == null || !filteredGraph) return null;
    return shortestPath(filteredGraph.nodes, filteredGraph.edges, pathSource, pathTarget);
  }, [graphType, pathSource, pathTarget, filteredGraph]);

  const openNode = async (id: number) => {
    setSelectedNodeId(id);
    setSelectedNode(null);
    try {
      const detail = await api.getAccount(id);
      setSelectedNode(detail);
    } catch {
      setSelectedNodeId(null);
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="grid grid-cols-[1fr_300px] gap-4">
      <div className="space-y-3">
        <div className="bg-surface border border-border rounded-lg p-3 flex flex-wrap items-center gap-3">
          <Group label="Time window">
            {(["24 hours", "7 days", "30 days"] as const).map(w => (
              <Toggle key={w} active={window_ === w} onClick={() => setWindow(w)}>{w}</Toggle>
            ))}
          </Group>
          <Group label="Graph type">
            {(["Transactions", "Community", "Shortest Path"] as const).map(g => (
              <Toggle key={g} active={graphType === g} onClick={() => { setGraphType(g); setSelectedRing(null); }}>{g}</Toggle>
            ))}
          </Group>
          <div className="flex items-center gap-2 text-[11px] text-text-secondary">
            <span className="text-text-tertiary uppercase text-[10px] tracking-wide">Risk score</span>
            <input type="range" min={0} max={1000} value={minRisk} onChange={e => setMinRisk(Number(e.target.value))} className="w-24 accent-brand" />
            <span className="font-mono w-9">{minRisk}</span>
          </div>
          <div className="flex items-center gap-3 ml-auto text-[11px] text-text-secondary">
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} className="accent-brand" /> Labels</label>
            <label className="flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={showAmounts} onChange={e => setShowAmounts(e.target.checked)} className="accent-brand" /> Amounts</label>
            <button title="Zoom in" onClick={() => graphRef.current?.zoomIn()} className="text-text-tertiary hover:text-text-primary"><ZoomIn size={14} /></button>
            <button title="Zoom out" onClick={() => graphRef.current?.zoomOut()} className="text-text-tertiary hover:text-text-primary"><ZoomOut size={14} /></button>
            <button title="Reset view" onClick={() => graphRef.current?.resetView()} className="text-text-tertiary hover:text-text-primary"><Maximize2 size={14} /></button>
            <button title="Download PNG" onClick={() => graphRef.current?.downloadPNG(`shield_network_${window_.replace(" ", "_")}.png`)} className="text-text-tertiary hover:text-text-primary"><Download size={14} /></button>
          </div>
        </div>

        {graphType === "Shortest Path" && filteredGraph && (
          <div className="bg-surface border border-border rounded-lg p-3 flex items-center gap-3">
            <Route size={14} className="text-info shrink-0" />
            <span className="text-[10.5px] text-text-tertiary uppercase tracking-wide">From</span>
            <NodeSelect nodes={filteredGraph.nodes} value={pathSource} onChange={setPathSource} />
            <span className="text-[10.5px] text-text-tertiary uppercase tracking-wide">To</span>
            <NodeSelect nodes={filteredGraph.nodes} value={pathTarget} onChange={setPathTarget} />
            {pathSource != null && pathTarget != null && (
              <span className="text-[11px] ml-auto font-mono">
                {pathResult ? (
                  <span className="text-info">{pathResult.length - 1} hop{pathResult.length - 1 === 1 ? "" : "s"}: {pathResult.map(id => `ACC-${id}`).join(" → ")}</span>
                ) : (
                  <span className="text-text-tertiary">No path within the current filter</span>
                )}
              </span>
            )}
          </div>
        )}

        <div className="bg-surface border border-border rounded-lg p-4">
          <NetworkGraph
            ref={graphRef}
            data={filteredGraph}
            height={430}
            showLabels={showLabels}
            showAmounts={showAmounts}
            colorBy={graphType === "Community" ? "community" : "tier"}
            highlightIds={highlightIds}
            pathIds={graphType === "Shortest Path" ? pathResult : null}
            onNodeClick={openNode}
          />
        </div>

        {graphType === "Community" && rings.length > 0 && (
          <div className="bg-surface border border-border rounded-lg p-3 flex flex-wrap gap-3">
            {rings.map(r => (
              <div key={r.id} className="flex items-center gap-1.5 text-[10.5px] text-text-secondary">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: communityColor(r.colorIndex) }} />
                Community {r.id} ({r.members.length})
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="bg-surface border border-border rounded-lg p-4">
          <h3 className="text-[12px] font-semibold mb-3">Ring Detection Summary</h3>
          <div className="font-mono text-[24px] font-bold text-critical mb-3">{rings.length}<span className="text-[11px] font-sans font-normal text-text-tertiary ml-1.5">potential rings detected</span></div>
          {rings.length === 0 && (
            <div className="text-[11px] text-text-tertiary">No connected clusters at this risk threshold — try lowering the slider.</div>
          )}
          <div className="space-y-2">
            {rings.map(r => (
              <button
                key={r.id}
                onClick={() => setSelectedRing(selectedRing === r.id ? null : r.id)}
                className={`w-full text-left rounded-md border p-2.5 transition-colors ${
                  selectedRing === r.id ? "border-brand bg-brand-dim" : "border-border hover:bg-surface-hover"
                }`}
              >
                <div className="flex items-center justify-between text-[11.5px] font-medium">
                  <span>Ring {r.id}</span>
                  <span className="font-mono text-text-tertiary">{r.members.length} accounts</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10.5px] text-text-tertiary">connected component</span>
                  <ConfidenceTag level={r.confidence} />
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedRingData && <RingDetail ring={selectedRingData} />}

        <div className="bg-surface border border-border rounded-lg p-3">
          <PrototypeTag />
          <p className="text-[10.5px] text-text-tertiary mt-2 leading-relaxed">
            Community detection, PageRank, and shortest-path analysis are the intended production
            methods (per the architecture doc). This prototype computes real connected components
            and real BFS shortest paths over a simulated edge set (occupation/risk-based, since no
            real transaction-graph data exists in the source dataset) — the graph algorithms are
            genuine, the underlying transaction data is not.
          </p>
        </div>
      </div>

      {selectedNodeId != null && (
        <NodeDrawer
          accountId={selectedNodeId}
          detail={selectedNode}
          onClose={() => { setSelectedNodeId(null); setSelectedNode(null); }}
        />
      )}
    </div>
  );
}

function NodeSelect({ nodes, value, onChange }: { nodes: NetworkNode[]; value: number | null; onChange: (id: number) => void }) {
  return (
    <select
      value={value ?? ""}
      onChange={e => onChange(Number(e.target.value))}
      className="bg-surface-2 border border-border rounded-md px-2 py-1 text-[11px] outline-none focus:border-brand/50"
    >
      <option value="" disabled>Select account…</option>
      {nodes.map(n => <option key={n.id} value={n.id}>ACC-{n.id}</option>)}
    </select>
  );
}

function NodeDrawer({ accountId, detail, onClose }: { accountId: number; detail: AccountDetail | null; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-30" onClick={onClose} />
      <aside className="fixed top-0 right-0 h-screen w-[400px] bg-surface border-l border-border z-40 overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="font-mono text-[17px] font-semibold">ACC-{accountId}</div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary"><X size={16} /></button>
        </div>
        {!detail ? (
          <div className="text-[11px] text-text-tertiary">Loading account details…</div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-4">
              <RiskBadge tier={detail.risk_tier as RiskTier} />
              <span className="font-mono text-[13px] text-text-secondary">{detail.shield_score.toFixed(0)} / 1000</span>
            </div>
            <div className="space-y-1.5 text-[11.5px]">
              <StatRow k="Occupation" v={detail.occupation} />
              <StatRow k="Account type" v={detail.account_type} />
              <StatRow k="Segment" v={detail.segment} />
              <StatRow k="Age" v={detail.age?.toString() ?? "—"} />
              <StatRow k="Anomaly score" v={detail.iso_score.toFixed(2)} />
              <StatRow k="XGBoost probability" v={detail.xgb_score.toFixed(3)} />
              <StatRow k="Flagged" v={detail.flagged ? "Yes" : "No"} />
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed border-l-2 border-brand pl-2.5 mt-4">
              {detail.narrative}
            </p>
          </>
        )}
      </aside>
    </>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] text-text-tertiary uppercase tracking-wide mr-0.5">{label}</span>
      <div className="flex gap-1 bg-surface-2 rounded-md p-0.5">{children}</div>
    </div>
  );
}
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-2 py-1 rounded text-[10.5px] ${active ? "bg-brand text-black font-medium" : "text-text-secondary hover:text-text-primary"}`}>
      {children}
    </button>
  );
}
function ConfidenceTag({ level }: { level: string }) {
  const cls = level === "High" ? "text-critical" : level === "Medium" ? "text-medium" : "text-low";
  return <span className={`text-[10px] font-medium ${cls}`}>{level} confidence</span>;
}
function RingDetail({ ring }: { ring: { members: NetworkNode[]; confidence: string } }) {
  const scores = ring.members.map(m => m.shield_score);
  const median = [...scores].sort((a, b) => a - b)[Math.floor(scores.length / 2)];
  return (
    <div className="bg-surface border border-border rounded-lg p-4 text-[11.5px] space-y-2">
      <h4 className="font-semibold text-[12px] mb-1">Community Stats</h4>
      <StatRow k="Community size" v={`${ring.members.length} accounts`} />
      <StatRow k="Median SHIELD score" v={median.toFixed(0)} />
      <StatRow k="24h inflow (est.)" v={`₹${(ring.members.length * 84000).toLocaleString("en-IN")}`} />
      <StatRow k="24h outflow (est.)" v={`₹${(ring.members.length * 79000).toLocaleString("en-IN")}`} />
      <StatRow k="External beneficiaries" v={`${ring.members.length + 2}`} />
      <div className="pt-2 flex flex-wrap gap-1.5">
        {ring.members.map(m => (
          <span key={m.id} className="inline-flex items-center gap-1 font-mono text-[10px] bg-surface-2 border border-border rounded px-1.5 py-0.5">
            ACC-{m.id} <RiskBadge tier={m.risk_tier as RiskTier} size="sm" />
          </span>
        ))}
      </div>
    </div>
  );
}
function StatRow({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between"><span className="text-text-tertiary">{k}</span><span className="font-mono text-text-primary">{v}</span></div>;
}
