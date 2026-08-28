import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import * as d3 from "d3";
import type { NetworkResponse } from "../lib/api";
import { EmptyState, PrototypeTag } from "./ui";
import { connectedComponents, communityColor } from "../lib/graphUtils";

const TIER_COLOR: Record<string, string> = {
  critical: "#e5484d", high: "#f0883e", medium: "#e8b93f", low: "#2fae66",
};

export interface NetworkGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  downloadPNG: (filename?: string) => void;
}

interface Props {
  data: NetworkResponse | null;
  height?: number;
  showLabels?: boolean;
  showAmounts?: boolean;
  colorBy?: "tier" | "community";
  highlightIds?: Set<number> | null;
  pathIds?: number[] | null;
  onNodeClick?: (id: number) => void;
}

const NetworkGraph = forwardRef<NetworkGraphHandle, Props>(function NetworkGraph(
  { data, height = 340, showLabels = true, showAmounts = false, colorBy = "tier", highlightIds = null, pathIds = null, onNodeClick },
  ref
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useImperativeHandle(ref, () => ({
    zoomIn() {
      if (!svgRef.current || !zoomBehaviorRef.current) return;
      d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, 1.3);
    },
    zoomOut() {
      if (!svgRef.current || !zoomBehaviorRef.current) return;
      d3.select(svgRef.current).transition().duration(200).call(zoomBehaviorRef.current.scaleBy as any, 1 / 1.3);
    },
    resetView() {
      if (!svgRef.current || !zoomBehaviorRef.current) return;
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.transform as any, d3.zoomIdentity);
    },
    downloadPNG(filename = "shield_network_graph.png") {
      const svgEl = svgRef.current;
      if (!svgEl) return;
      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute("style", "background:#0a0c0f");
      const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      rect.setAttribute("width", "100%");
      rect.setAttribute("height", "100%");
      rect.setAttribute("fill", "#0a0c0f");
      clone.insertBefore(rect, clone.firstChild);

      const svgString = new XMLSerializer().serializeToString(clone);
      const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      const w = svgEl.clientWidth || width;
      const h = svgEl.clientHeight || height;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = w * 2;
        canvas.height = h * 2;
        const ctx = canvas.getContext("2d")!;
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        canvas.toBlob(blob => {
          if (!blob) return;
          const a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = filename;
          a.click();
        }, "image/png");
      };
      img.src = url;
    },
  }), [width, height]);

  useEffect(() => {
    if (!data || !svgRef.current || !width) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g");
    gRef.current = g.node();

    const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.4, 4])
      .on("zoom", (event) => g.attr("transform", event.transform));
    svg.call(zoomBehavior as any);
    zoomBehaviorRef.current = zoomBehavior;

    const nodes = data.nodes.map(n => ({ ...n }));
    const links = data.edges.map(e => ({ ...e }));

    const componentOf = colorBy === "community" ? connectedComponents(data.nodes, data.edges) : null;
    const rootIndex = new Map<number, number>();
    if (componentOf) {
      let idx = 0;
      const seen = new Set<number>();
      componentOf.forEach(root => {
        if (!seen.has(root)) { seen.add(root); rootIndex.set(root, idx++); }
      });
    }

    const pathSet = new Set(pathIds ?? []);
    const pathEdgeKey = new Set<string>();
    if (pathIds && pathIds.length > 1) {
      for (let i = 0; i < pathIds.length - 1; i++) {
        pathEdgeKey.add(`${pathIds[i]}-${pathIds[i + 1]}`);
        pathEdgeKey.add(`${pathIds[i + 1]}-${pathIds[i]}`);
      }
    }

    const sim = d3.forceSimulation(nodes as d3.SimulationNodeDatum[])
      .force("link", d3.forceLink(links as d3.SimulationLinkDatum<d3.SimulationNodeDatum>[]).id((d: any) => d.id).distance(85).strength(0.35))
      .force("charge", d3.forceManyBody().strength(-180))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(24));

    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", (d: any) => pathEdgeKey.has(`${d.source.id ?? d.source}-${d.target.id ?? d.target}`) ? "#4c9fe8" : "#323841")
      .attr("stroke-width", (d: any) => (pathEdgeKey.has(`${d.source.id ?? d.source}-${d.target.id ?? d.target}`) ? 3 : 1) + d.weight * 1.5)
      .attr("stroke-opacity", (d: any) => pathEdgeKey.has(`${d.source.id ?? d.source}-${d.target.id ?? d.target}`) ? 0.95 : 0.55);

    const linkLabel = showAmounts ? g.append("g")
      .selectAll("text")
      .data(links)
      .enter().append("text")
      .attr("font-size", 8.5)
      .attr("fill", "#5d6570")
      .attr("font-family", "JetBrains Mono, monospace")
      .text((d: any) => `w${d.weight}`) : null;

    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .style("cursor", onNodeClick ? "pointer" : "default")
      .on("click", (_, d: any) => onNodeClick?.(d.id));

    node.append("circle")
      .attr("r", (d: any) => d.is_focus ? 13 : (pathSet.has(d.id) ? 11 : 8))
      .attr("fill", (d: any) => {
        if (colorBy === "community" && componentOf) {
          return communityColor(rootIndex.get(componentOf.get(d.id)!) ?? 0);
        }
        return TIER_COLOR[d.risk_tier] ?? "#5d6570";
      })
      .attr("fill-opacity", (d: any) => {
        if (highlightIds && highlightIds.size > 0) return highlightIds.has(d.id) ? 1 : 0.2;
        return d.is_focus ? 1 : 0.85;
      })
      .attr("stroke", (d: any) => pathSet.has(d.id) ? "#4c9fe8" : (d.is_focus ? "#e5e8eb" : "#0a0c0f"))
      .attr("stroke-width", (d: any) => pathSet.has(d.id) ? 2.5 : (d.is_focus ? 2 : 1.5));

    if (showLabels) {
      node.append("text")
        .text((d: any) => d.label)
        .attr("font-size", 9)
        .attr("font-family", "JetBrains Mono, monospace")
        .attr("fill", "#9aa1ac")
        .attr("dy", -16)
        .attr("text-anchor", "middle")
        .attr("opacity", (d: any) => (highlightIds && highlightIds.size > 0 && !highlightIds.has(d.id)) ? 0.25 : 1);
    }

    sim.on("tick", () => {
      link.attr("x1", (d: any) => d.source.x).attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x).attr("y2", (d: any) => d.target.y);
      linkLabel?.attr("x", (d: any) => (d.source.x + d.target.x) / 2)
                .attr("y", (d: any) => (d.source.y + d.target.y) / 2);
      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => { sim.stop(); };
  }, [data, width, height, showLabels, showAmounts, colorBy, highlightIds, pathIds, onNodeClick]);

  if (!data) return <EmptyState label="Loading network…" />;

  return (
    <div ref={containerRef}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] text-text-tertiary max-w-[70%]">{data.note}</span>
        <PrototypeTag />
      </div>
      <svg ref={svgRef} width={width} height={height} className="bg-surface-2/40 rounded-md" />
    </div>
  );
});

export default NetworkGraph;
