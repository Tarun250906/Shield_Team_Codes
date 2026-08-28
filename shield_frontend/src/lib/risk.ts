export type RiskTier = "low" | "medium" | "high" | "critical";

export const TIER_BANDS: { tier: RiskTier; min: number; max: number; label: string }[] = [
  { tier: "low", min: 0, max: 400, label: "0–400" },
  { tier: "medium", min: 401, max: 650, label: "401–650" },
  { tier: "high", min: 651, max: 800, label: "651–800" },
  { tier: "critical", min: 801, max: 1000, label: "801–1000" },
];

export function tierOf(score: number): RiskTier {
  if (score >= 801) return "critical";
  if (score >= 651) return "high";
  if (score >= 401) return "medium";
  return "low";
}

export const TIER_LABEL: Record<RiskTier, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export const TIER_ACTION: Record<RiskTier, string> = {
  low: "Monitor",
  medium: "Enhanced monitoring + manual review",
  high: "Investigator alert + transaction hold where applicable",
  critical: "Potential account freeze + SAR draft + investigator review",
};

export const TIER_TEXT_CLASS: Record<RiskTier, string> = {
  low: "text-low",
  medium: "text-medium",
  high: "text-high",
  critical: "text-critical",
};

export const TIER_BG_CLASS: Record<RiskTier, string> = {
  low: "bg-low-dim text-low border-low/30",
  medium: "bg-medium-dim text-medium border-medium/30",
  high: "bg-high-dim text-high border-high/30",
  critical: "bg-critical-dim text-critical border-critical/30",
};

export const TIER_BAR_CLASS: Record<RiskTier, string> = {
  low: "bg-low",
  medium: "bg-medium",
  high: "bg-high",
  critical: "bg-critical",
};
