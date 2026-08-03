export const CARE_ACTIONS = [
  "ACKNOWLEDGE",
  "CLARIFY",
  "DEESCALATE",
  "NO_ACTION",
  "HUMAN_REVIEW",
] as const;

export const SUMMARY_CODES = [
  "PAUSE_AND_REVIEW",
  "REQUEST_MORE_CONTEXT",
  "ACKNOWLEDGE_WITH_BOUNDARY",
  "NO_INTERVENTION",
] as const;

export const RATIONALE_CODES = [
  "LIMITED_CONTEXT",
  "RECURRING_PATTERN",
  "HIGH_SEVERITY",
  "LOW_CONFIDENCE",
] as const;

export type CareAction = (typeof CARE_ACTIONS)[number];
export type SummaryCode = (typeof SUMMARY_CODES)[number];
export type RationaleCode = (typeof RATIONALE_CODES)[number];
export type Severity = "low" | "medium" | "high" | "urgent";

export interface RawIncident {
  incidentId: string;
  observedAt: string;
  channel: string;
  policyCategory: string;
  severity: Severity;
  recurrenceCount: number;
  consentToAgent: boolean;
  rawText: string;
}

export interface MinimizedIncident {
  schemaVersion: "1.0";
  incidentIdHash: string;
  observedDay: string;
  channelClass: string;
  policyCategory: string;
  severity: Severity;
  recurrenceCount: number;
  signalCounts: {
    emailLike: number;
    handleLike: number;
    urlLike: number;
  };
  rawTextForwarded: false;
}

export interface MindReply {
  action: CareAction;
  summaryCode: SummaryCode;
  rationaleCode: RationaleCode;
  confidence: number;
  requiresCreatorApproval: true;
  automatedEnforcement: false;
}

export interface CareReceipt {
  schemaVersion: "1.0";
  incidentIdHash: string;
  action: CareAction;
  summaryCode: SummaryCode;
  rationaleCode: RationaleCode;
  summary: string;
  rationale: string;
  confidence: number;
  requiresCreatorApproval: true;
  automatedEnforcement: false;
  mindsLiveVerified: boolean;
  source: "fixture" | "live" | "fail-closed";
  evidenceCode: string;
}

export interface MindResponse {
  text: string;
}

export interface MindPort {
  requestCarePlan(prompt: string): Promise<MindResponse>;
}
