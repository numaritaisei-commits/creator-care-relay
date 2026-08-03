import { createHmac } from "node:crypto";

import type { MinimizedIncident, RawIncident, Severity } from "./types.js";

const SEVERITIES = new Set<Severity>(["low", "medium", "high", "urgent"]);
const CHANNEL_CLASSES = new Set([
  "creator-community",
  "community-forum",
  "live-chat",
  "social-feed",
  "other-community",
]);
const POLICY_CATEGORIES = new Set([
  "targeted-harassment",
  "spam",
  "impersonation",
  "unsafe-content",
  "community-conflict",
  "other-policy",
]);
const EMAIL_LIKE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/giu;
const URL_LIKE = /https?:\/\/[^\s]+/giu;
const HANDLE_LIKE = /(^|\s)@[a-z0-9_]{2,32}\b/giu;

function hmac256(key: string, value: string): string {
  return createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function count(pattern: RegExp, value: string): number {
  return Array.from(value.matchAll(pattern)).length;
}

function allowlistedLabel(value: string, field: string, allowed: ReadonlySet<string>): string {
  const normalized = value.trim().toLowerCase();
  if (!allowed.has(normalized)) {
    throw new Error(`${field}_invalid`);
  }
  return normalized;
}

export function minimizeIncident(input: RawIncident, privacyKey: string): MinimizedIncident {
  if (typeof privacyKey !== "string" || Buffer.byteLength(privacyKey, "utf8") < 32) {
    throw new Error("privacy_key_required");
  }
  if (!input.consentToAgent) throw new Error("agent_consent_required");
  if (!input.incidentId.trim()) throw new Error("incident_id_required");
  if (!SEVERITIES.has(input.severity)) throw new Error("severity_invalid");
  if (!Number.isInteger(input.recurrenceCount) || input.recurrenceCount < 0) {
    throw new Error("recurrence_count_invalid");
  }
  if (input.rawText.length === 0 || input.rawText.length > 10_000) {
    throw new Error("raw_text_length_invalid");
  }

  const observed = new Date(input.observedAt);
  if (Number.isNaN(observed.getTime())) throw new Error("observed_at_invalid");

  return {
    schemaVersion: "1.0",
    incidentIdHash: hmac256(privacyKey, `incident:${input.incidentId.trim()}`),
    observedDay: observed.toISOString().slice(0, 10),
    channelClass: allowlistedLabel(input.channel, "channel", CHANNEL_CLASSES),
    policyCategory: allowlistedLabel(input.policyCategory, "policy_category", POLICY_CATEGORIES),
    severity: input.severity,
    recurrenceCount: input.recurrenceCount,
    signalCounts: {
      emailLike: count(EMAIL_LIKE, input.rawText),
      handleLike: count(HANDLE_LIKE, input.rawText),
      urlLike: count(URL_LIKE, input.rawText),
    },
    rawTextForwarded: false,
  };
}
