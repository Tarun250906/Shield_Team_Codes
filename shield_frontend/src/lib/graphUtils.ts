import type { NetworkNode, NetworkEdge } from "./api";

/** Union-Find based connected components over the current node/edge set.
 *  Used both to color "Community" mode and to compute Ring Detection
 *  Summary — so the two always agree with each other and react the same
 *  way to the risk-score slider (removing a node can split or shrink a
 *  component, which is exactly what should happen when you raise the
 *  risk threshold). */
export function connectedComponents(nodes: NetworkNode[], edges: NetworkEdge[]): Map<number, number> {
  const parent = new Map<number, number>();
  nodes.forEach(n => parent.set(n.id, n.id));

  function find(x: number): number {
    while (parent.get(x) !== x) {
      const p = parent.get(x)!;
      parent.set(x, parent.get(p)!);
      x = p;
    }
    return x;
  }
  function union(a: number, b: number) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  edges.forEach(e => {
    const s = typeof e.source === "object" ? (e.source as any).id : e.source;
    const t = typeof e.target === "object" ? (e.target as any).id : e.target;
    if (parent.has(s) && parent.has(t)) union(s, t);
  });

  const componentOf = new Map<number, number>();
  nodes.forEach(n => componentOf.set(n.id, find(n.id)));
  return componentOf;
}

export interface Community {
  rootId: number;
  memberIds: number[];
}

export function groupByComponent(nodes: NetworkNode[], edges: NetworkEdge[]): Community[] {
  const componentOf = connectedComponents(nodes, edges);
  const groups = new Map<number, number[]>();
  nodes.forEach(n => {
    const root = componentOf.get(n.id)!;
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(n.id);
  });
  return [...groups.entries()].map(([rootId, memberIds]) => ({ rootId, memberIds }));
}

/** Plain BFS shortest path over an undirected adjacency built from edges. */
export function shortestPath(nodes: NetworkNode[], edges: NetworkEdge[], sourceId: number, targetId: number): number[] | null {
  if (sourceId === targetId) return [sourceId];
  const adj = new Map<number, number[]>();
  nodes.forEach(n => adj.set(n.id, []));
  edges.forEach(e => {
    const s = typeof e.source === "object" ? (e.source as any).id : e.source;
    const t = typeof e.target === "object" ? (e.target as any).id : e.target;
    adj.get(s)?.push(t);
    adj.get(t)?.push(s);
  });

  const visited = new Set<number>([sourceId]);
  const prev = new Map<number, number>();
  const queue = [sourceId];

  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === targetId) {
      const path = [targetId];
      let node = targetId;
      while (prev.has(node)) {
        node = prev.get(node)!;
        path.unshift(node);
      }
      return path;
    }
    for (const next of adj.get(cur) ?? []) {
      if (!visited.has(next)) {
        visited.add(next);
        prev.set(next, cur);
        queue.push(next);
      }
    }
  }
  return null; // no path in the current filtered graph
}

const COMMUNITY_PALETTE = ["#4c9fe8", "#a78bfa", "#2fae66", "#f0883e", "#e8b93f", "#e5484d", "#22d3ee", "#f472b6"];
export function communityColor(index: number): string {
  return COMMUNITY_PALETTE[index % COMMUNITY_PALETTE.length];
}
