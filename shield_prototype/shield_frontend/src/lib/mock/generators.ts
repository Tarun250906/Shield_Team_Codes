// All data in this module is SIMULATED for demo purposes — there is no
// underlying alert, transaction, investigation, or SAR system behind this
// prototype. It is deterministically derived from real account IDs/scores
// (via lib/api.ts) so it stays consistent across page navigations, but it
// is not real activity. Every page that uses this module says so in the UI.

import type { AccountSummary } from "../api";

// simple deterministic PRNG so mock data is stable per account id
function seedRandom(seed: number) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const ALERT_TYPES = [
  "High Velocity", "Rapid Fund Movement", "Multiple Small Credits",
  "Velocity Rule Triggered", "KYC Mismatch", "I4C Match", "NCRP Match",
  "Night Transaction", "Unusual Counterparty Pattern",
];
const STATUSES = ["New", "In Review", "Assigned", "Resolved", "Dismissed"] as const;
const CHANNELS = ["UPI", "IMPS", "NEFT", "RTGS", "Card", "Internet Banking"];

export interface MockAlert {
  alert_id: string;
  account_id: number;
  alert_type: string;
  risk_score: number;
  tier: string;
  amount: number;
  time: string;
  status: typeof STATUSES[number];
}

export function generateAlerts(accounts: AccountSummary[]): MockAlert[] {
  return accounts.map((a, i) => {
    const rnd = seedRandom(a.account_id * 7 + 1);
    const hoursAgo = Math.floor(rnd() * 48) + 1;
    return {
      alert_id: `ALT-2025-10${String(1000 + i).slice(1)}`,
      account_id: a.account_id,
      alert_type: ALERT_TYPES[Math.floor(rnd() * ALERT_TYPES.length)],
      risk_score: a.shield_score,
      tier: a.risk_tier,
      amount: Math.round(rnd() * 480000 + 5000),
      time: `${hoursAgo}h ago`,
      status: STATUSES[Math.floor(rnd() * STATUSES.length)],
    };
  });
}

export interface MockTransaction {
  timestamp: string;
  direction: "Incoming" | "Outgoing";
  counterparty: string;
  channel: string;
  amount: number;
  device: string;
  flagged: boolean;
}

export function generateTransactions(accountId: number, count = 18): MockTransaction[] {
  const rnd = seedRandom(accountId * 13 + 3);
  const out: MockTransaction[] = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = i * (rnd() * 1.4 + 0.2);
    const d = new Date(Date.now() - daysAgo * 86400000);
    out.push({
      timestamp: d.toISOString().slice(0, 16).replace("T", " "),
      direction: rnd() > 0.45 ? "Incoming" : "Outgoing",
      counterparty: `CPTY-${Math.floor(rnd() * 90000 + 10000)}`,
      channel: CHANNELS[Math.floor(rnd() * CHANNELS.length)],
      amount: Math.round(rnd() * rnd() * 300000 + 500),
      device: rnd() > 0.7 ? "New Device" : "Known Device",
      flagged: rnd() > 0.82,
    });
  }
  return out;
}

export interface MockCase {
  case_id: string;
  alert_id: string;
  account_id: number;
  risk_score: number;
  tier: string;
  assigned_to: string;
  status: string;
  sla: string;
  updated: string;
}

const ANALYSTS = ["You", "Priya", "Rahul", "Amit", "Sana"];
const CASE_STATUSES = ["New", "In Progress", "Pending", "Escalated", "Resolved"];

export function generateCases(accounts: AccountSummary[]): MockCase[] {
  return accounts.slice(0, 40).map((a, i) => {
    const rnd = seedRandom(a.account_id * 31 + 11);
    return {
      case_id: `INV-2025-${String(1000 + i).slice(1)}`,
      alert_id: `ALT-2025-10${String(1000 + i).slice(1)}`,
      account_id: a.account_id,
      risk_score: a.shield_score,
      tier: a.risk_tier,
      assigned_to: ANALYSTS[Math.floor(rnd() * ANALYSTS.length)],
      status: CASE_STATUSES[Math.floor(rnd() * CASE_STATUSES.length)],
      sla: `${Math.floor(rnd() * 47) + 1}h`,
      updated: `${Math.floor(rnd() * 20) + 1}m ago`,
    };
  });
}

export interface MockSar {
  sar_id: string;
  account_id: number;
  risk_score: number;
  tier: string;
  amount: number;
  created: string;
  status: string;
  due: string;
}

const SAR_STATUSES = ["Draft", "Pending Approval", "Approved", "Rejected", "Filed"];

export function generateSars(accounts: AccountSummary[]): MockSar[] {
  return accounts.filter(a => a.risk_tier === "critical").slice(0, 25).map((a, i) => {
    const rnd = seedRandom(a.account_id * 53 + 17);
    return {
      sar_id: `SAR-2025-${String(1000 + i).slice(1)}`,
      account_id: a.account_id,
      risk_score: a.shield_score,
      tier: a.risk_tier,
      amount: Math.round(rnd() * 900000 + 50000),
      created: `${Math.floor(rnd() * 10) + 1}d ago`,
      status: SAR_STATUSES[Math.floor(rnd() * SAR_STATUSES.length)],
      due: `${Math.floor(rnd() * 5) + 1}d`,
    };
  });
}

export const DATA_FEEDS = [
  { name: "I4C Feed", type: "External (Govt)", status: "Live", records: 12842, lastSync: "2 min ago" },
  { name: "CERT-In Feed", type: "External (Govt)", status: "Live", records: 8421, lastSync: "5 min ago" },
  { name: "NCRP Feed", type: "External (Govt)", status: "Delayed", records: 5231, lastSync: "38 min ago" },
  { name: "RBI CIBIL Feed", type: "External (Govt)", status: "Live", records: 124532, lastSync: "12 min ago" },
  { name: "FMS Alerts Feed", type: "Internal", status: "Live", records: 2134, lastSync: "1 min ago" },
  { name: "TMS STR Feed", type: "Internal", status: "Offline", records: 1023, lastSync: "3h ago" },
];

export const MODEL_FEATURE_DRIFT = [
  { feature: "F13 · velocity (24h)", drift: 0.156 },
  { feature: "F103 · unique payers (24h)", drift: 0.121 },
  { feature: "F3799 · network degree", drift: 0.088 },
  { feature: "F3841 · behavioural score", drift: 0.087 },
  { feature: "F949 · avg. txn amount", drift: 0.072 },
];

export function generatePerformanceTrend(days = 14) {
  const rnd = seedRandom(99);
  const out = [];
  let auc = 0.94;
  for (let i = days; i >= 0; i--) {
    auc += (rnd() - 0.5) * 0.01;
    auc = Math.max(0.9, Math.min(0.998, auc));
    const d = new Date(Date.now() - i * 86400000);
    out.push({
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      auc: Number(auc.toFixed(3)),
      precision: Number((auc - 0.05 - rnd() * 0.03).toFixed(3)),
      recall: Number((auc - 0.15 - rnd() * 0.05).toFixed(3)),
    });
  }
  return out;
}

export function generateRiskTrend(hours = 24) {
  const rnd = seedRandom(42);
  const out = [];
  let score = 620;
  for (let i = 0; i <= hours; i++) {
    score += (rnd() - 0.48) * 40;
    score = Math.max(300, Math.min(950, score));
    out.push({ time: `${String(i).padStart(2, "0")}:00`, score: Math.round(score), flagged: Math.round(rnd() * 20 + 3) });
  }
  return out;
}
