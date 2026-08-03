import {
  CARE_ACTIONS,
  RATIONALE_CODES,
  SUMMARY_CODES,
  type CareReceipt,
  type MindReply,
  type RationaleCode,
  type SummaryCode,
} from "./types.js";

const SUMMARY_TEXT: Record<SummaryCode, string> = {
  PAUSE_AND_REVIEW: "Pause any intervention and ask a trained creator or moderator to review the minimized pattern.",
  REQUEST_MORE_CONTEXT: "Ask for additional context without exposing or repeating the original content.",
  ACKNOWLEDGE_WITH_BOUNDARY: "Acknowledge the concern and offer a calm, creator-approved boundary.",
  NO_INTERVENTION: "Take no community action and preserve the incident for creator review.",
};

const RATIONALE_TEXT: Record<RationaleCode, string> = {
  LIMITED_CONTEXT: "The minimized envelope does not contain enough context for a stronger response.",
  RECURRING_PATTERN: "The aggregate recurrence signal supports careful human review without autonomous enforcement.",
  HIGH_SEVERITY: "The declared severity requires a human decision before any community action.",
  LOW_CONFIDENCE: "The advisory confidence is too low for any action without creator review.",
};

const PUBLIC_FAILURE_CODES = new Set([
  "agent_consent_required",
  "incident_id_required",
  "severity_invalid",
  "recurrence_count_invalid",
  "raw_text_length_invalid",
  "observed_at_invalid",
  "channel_invalid",
  "policy_category_invalid",
  "reply_not_json",
  "reply_not_object",
  "reply_action_invalid",
  "reply_confidence_invalid",
  "creator_approval_required",
  "automated_enforcement_forbidden",
  "builder_api_key_required",
  "mind_id_required",
  "alias_invalid",
  "timeout_invalid",
  "minds_reply_timeout",
  "minds_reply_empty",
  "minds_operation_timeout",
  "privacy_key_required",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseMindReply(text: string): MindReply {
  let candidate: unknown;
  try {
    candidate = JSON.parse(text);
  } catch {
    throw new Error("reply_not_json");
  }
  if (!isRecord(candidate)) throw new Error("reply_not_object");
  if (typeof candidate.action !== "string" || !CARE_ACTIONS.includes(candidate.action as never)) {
    throw new Error("reply_action_invalid");
  }
  if (
    typeof candidate.confidence !== "number" ||
    !Number.isFinite(candidate.confidence) ||
    candidate.confidence < 0 ||
    candidate.confidence > 1
  ) {
    throw new Error("reply_confidence_invalid");
  }
  if (candidate.requiresCreatorApproval !== true) throw new Error("creator_approval_required");
  if (candidate.automatedEnforcement !== false) throw new Error("automated_enforcement_forbidden");
  if (
    typeof candidate.summaryCode !== "string" ||
    !SUMMARY_CODES.includes(candidate.summaryCode as never)
  ) {
    throw new Error("reply_summary_code_invalid");
  }
  if (
    typeof candidate.rationaleCode !== "string" ||
    !RATIONALE_CODES.includes(candidate.rationaleCode as never)
  ) {
    throw new Error("reply_rationale_code_invalid");
  }

  return {
    action: candidate.action as MindReply["action"],
    summaryCode: candidate.summaryCode as SummaryCode,
    rationaleCode: candidate.rationaleCode as RationaleCode,
    confidence: candidate.confidence,
    requiresCreatorApproval: true,
    automatedEnforcement: false,
  };
}

export function verifiedReceipt(
  incidentIdHash: string,
  reply: MindReply,
  source: "fixture" | "live",
): CareReceipt {
  return {
    schemaVersion: "1.0",
    incidentIdHash,
    action: reply.action,
    summaryCode: reply.summaryCode,
    rationaleCode: reply.rationaleCode,
    summary: SUMMARY_TEXT[reply.summaryCode],
    rationale: RATIONALE_TEXT[reply.rationaleCode],
    confidence: reply.confidence,
    requiresCreatorApproval: true,
    automatedEnforcement: false,
    mindsLiveVerified: source === "live",
    source,
    evidenceCode: source === "live" ? "LIVE_MINDS_REPLY_VALIDATED" : "SYNTHETIC_FIXTURE_ONLY",
  };
}

export function failClosedReceipt(incidentIdHash: string, reason: unknown): CareReceipt {
  const safeCode = reason instanceof Error && PUBLIC_FAILURE_CODES.has(reason.message)
    ? reason.message.toUpperCase()
    : "UNVERIFIED_MIND_FAILURE";
  return {
    schemaVersion: "1.0",
    incidentIdHash,
    action: "HUMAN_REVIEW",
    summaryCode: "PAUSE_AND_REVIEW",
    rationaleCode: "LIMITED_CONTEXT",
    summary: "The agent response was not safely verifiable; a creator must review this incident.",
    rationale: "No automated community action is permitted when evidence is missing, malformed, or timed out.",
    confidence: 0,
    requiresCreatorApproval: true,
    automatedEnforcement: false,
    mindsLiveVerified: false,
    source: "fail-closed",
    evidenceCode: safeCode,
  };
}
