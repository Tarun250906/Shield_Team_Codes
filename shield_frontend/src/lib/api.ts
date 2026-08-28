// Service layer for the real SHIELD FastAPI backend.
// Everything in this file talks to actual endpoints backed by the trained
// models (api.py). Pages that have no backing dataset (alerts, investigations,
// SAR, model drift, data feeds) use src/lib/mock/* instead — kept in a
// separate layer intentionally so swapping in real endpoints later is a
// one-file change.

const BASE = "/api";

export interface AccountSummary {
  account_id: number;
  account_type: string;
  occupation: string;
  segment: string;
  age: number | null;
  shield_score: number;
  iso_score: number;
  xgb_score: number;
  flagged: boolean;
  risk_tier: "low" | "medium" | "high" | "critical";
}

export interface AccountList {
  total: number;
  page: number;
  page_size: number;
  results: AccountSummary[];
}

export interface ShapFactor {
  feature: string;
  value: number | null;
  impact: number;
  direction: "increases_risk" | "decreases_risk";
}

export interface AccountDetail extends AccountSummary {
  branch_code: number;
  account_open_date: string;
  tenure_bucket: string;
  gender: string;
  business_type: string;
  fraud_target: number;
  top_factors: ShapFactor[];
  narrative: string;
}

export interface NetworkNode {
  id: number;
  label: string;
  risk_tier: string;
  shield_score: number;
  is_focus: boolean;
}
export interface NetworkEdge {
  source: number;
  target: number;
  weight: number;
}
export interface NetworkResponse {
  simulated: boolean;
  note: string;
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface Metrics {
  n_accounts: number;
  n_features: number;
  fraud_positive_rate: number;
  oof_auc: number;
  holdout_auc: number;
  holdout_size: number;
  flagged_count: number;
  score_buckets: Record<string, number>;
  disclaimer: string;
}

export interface FilterOptions {
  occupations: string[];
  account_types: string[];
  segments: string[];
}

export interface ActionRecord {
  account_id: number;
  action: string;
  note: string;
  investigator: string;
  timestamp: number;
}

export interface ValidationRow {
  account_id: number;
  iso_score: number;
  xgb_score: number;
  shield_score: number;
  risk_tier: "low" | "medium" | "high" | "critical";
  flagged: boolean;
}

export interface ValidationResponse {
  n_rows: number;
  flagged_count: number;
  mean_score: number;
  score_buckets: Record<string, number>;
  warnings: string[];
  results: ValidationRow[];
  disclaimer: string;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export interface AccountQuery {
  search?: string;
  occupation?: string;
  account_type?: string;
  segment?: string;
  min_score?: number;
  max_score?: number;
  flagged_only?: boolean;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

export const api = {
  getAccounts(q: AccountQuery = {}): Promise<AccountList> {
    const params = new URLSearchParams();
    Object.entries(q).forEach(([k, v]) => {
      if (v !== undefined && v !== "") params.set(k, String(v));
    });
    return get(`/accounts?${params.toString()}`);
  },
  getAccount(id: number): Promise<AccountDetail> {
    return get(`/accounts/${id}`);
  },
  getNetwork(id: number): Promise<NetworkResponse> {
    return get(`/accounts/${id}/network`);
  },
  getMetrics(): Promise<Metrics> {
    return get(`/metrics`);
  },
  getFilters(): Promise<FilterOptions> {
    return get(`/filters`);
  },
  async postAction(id: number, action: "freeze" | "escalate" | "dismiss", note = ""): Promise<ActionRecord> {
    const token = sessionStorage.getItem("shield_session_token");
    const res = await fetch(`${BASE}/accounts/${id}/action`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ action, note }),
    });
    if (!res.ok) throw new Error(`Action failed: ${res.status}`);
    return res.json();
  },
  getAuditTrail(accountId?: number): Promise<ActionRecord[]> {
    return get(`/audit-trail${accountId ? `?account_id=${accountId}` : ""}`);
  },
  async validateDataset(file: File): Promise<ValidationResponse> {
    const token = sessionStorage.getItem("shield_session_token");
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE}/validate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Validation failed: ${res.status}`);
    }
    return res.json();
  },
};
