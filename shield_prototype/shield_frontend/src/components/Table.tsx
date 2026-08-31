import type { ReactNode } from "react";

export function Table({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[12px]">{children}</table>
    </div>
  );
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="sticky top-0 bg-surface z-10">
      <tr className="border-b border-border">{children}</tr>
    </thead>
  );
}

export function TH({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th
      className={`px-3 py-2.5 text-[10.5px] font-medium uppercase tracking-wide text-text-tertiary whitespace-nowrap text-${align}`}
    >
      {children}
    </th>
  );
}

export function TR({ children, onClick, className = "" }: { children: ReactNode; onClick?: () => void; className?: string }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-border last:border-0 ${onClick ? "cursor-pointer hover:bg-surface-hover" : ""} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TD({ children, align = "left", className = "" }: { children: ReactNode; align?: "left" | "right" | "center"; className?: string }) {
  return (
    <td className={`px-3 py-2.5 text-text-primary whitespace-nowrap text-${align} ${className}`}>{children}</td>
  );
}

export function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;
  const pages = [1, 2, page - 1, page, page + 1, totalPages - 1, totalPages].filter(p => p >= 1 && p <= totalPages);
  const uniq = [...new Set(pages)].sort((a, b) => a - b);
  let last = 0;
  return (
    <div className="flex items-center justify-center gap-1 py-3">
      {uniq.map(p => {
        const gap = p - last > 1;
        last = p;
        return (
          <span key={p} className="flex items-center gap-1">
            {gap && <span className="text-text-tertiary px-1">…</span>}
            <button
              onClick={() => onPage(p)}
              className={`font-mono text-[11px] px-2 py-1 rounded border ${
                p === page ? "border-brand text-brand" : "border-border text-text-secondary hover:border-border-strong"
              }`}
            >
              {p}
            </button>
          </span>
        );
      })}
    </div>
  );
}
