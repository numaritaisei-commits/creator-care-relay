import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { FixtureMindPort, SYNTHETIC_FIXTURE_PRIVACY_KEY } from "../src/fixture-mind.js";
import { minimizeIncident } from "../src/minimize.js";
import { OfficialMindsPort } from "../src/official-minds.js";
import { buildCarePrompt } from "../src/prompt.js";
import { parseMindReply } from "../src/receipt.js";
import type { MindPort, RawIncident } from "../src/types.js";
import { runCareRelay } from "../src/workflow.js";

const PRIVACY_KEY = SYNTHETIC_FIXTURE_PRIVACY_KEY;

async function fixture(): Promise<RawIncident> {
  return JSON.parse(await readFile(new URL("../../fixtures/community-incident.json", import.meta.url), "utf8")) as RawIncident;
}

test("minimization forwards no raw content or identity values", async () => {
  const input = await fixture();
  const minimized = minimizeIncident(input, PRIVACY_KEY);
  const serialized = JSON.stringify(minimized);
  assert.equal(minimized.rawTextForwarded, false);
  assert.equal(minimized.signalCounts.emailLike, 1);
  assert.equal(minimized.signalCounts.handleLike, 1);
  assert.equal(minimized.signalCounts.urlLike, 1);
  assert.doesNotMatch(serialized, /example_user|demo@|https:\/\//u);
});

test("prompt contains only the minimized envelope and forbids autonomous enforcement", async () => {
  const input = await fixture();
  const prompt = buildCarePrompt(minimizeIncident(input, PRIVACY_KEY));
  assert.match(prompt, /automatedEnforcement must be false/u);
  assert.doesNotMatch(prompt, /example_user|demo@|example\.invalid\/thread/u);
});

test("fixture receipt is deterministic and never live-verified", async () => {
  const receipt = await runCareRelay(await fixture(), new FixtureMindPort(), PRIVACY_KEY);
  assert.equal(receipt.action, "HUMAN_REVIEW");
  assert.equal(receipt.source, "fixture");
  assert.equal(receipt.mindsLiveVerified, false);
  assert.equal(receipt.evidenceCode, "SYNTHETIC_FIXTURE_ONLY");
  assert.equal(receipt.automatedEnforcement, false);
});

test("fixture receipt matches the committed judge-readable sample", async () => {
  const receipt = await runCareRelay(await fixture(), new FixtureMindPort(), PRIVACY_KEY);
  const expected = JSON.parse(
    await readFile(new URL("../../samples/community-care-receipt.json", import.meta.url), "utf8"),
  ) as unknown;
  assert.deepEqual(receipt, expected);
});

test("missing consent fails closed before contacting a Mind", async () => {
  let calls = 0;
  const port: MindPort = {
    async requestCarePlan() {
      calls += 1;
      throw new Error("should_not_run");
    },
  };
  const input = { ...(await fixture()), consentToAgent: false };
  const receipt = await runCareRelay(input, port, PRIVACY_KEY);
  assert.equal(calls, 0);
  assert.equal(receipt.action, "HUMAN_REVIEW");
  assert.equal(receipt.source, "fail-closed");
  assert.equal(receipt.evidenceCode, "AGENT_CONSENT_REQUIRED");
});

test("transport errors fail closed without leaking the error detail", async () => {
  const port: MindPort = {
    async requestCarePlan() {
      throw new Error("sensitive-detail-do-not-emit");
    },
  };
  const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
  assert.equal(receipt.action, "HUMAN_REVIEW");
  assert.equal(receipt.evidenceCode, "UNVERIFIED_MIND_FAILURE");
  assert.doesNotMatch(JSON.stringify(receipt), /sensitive-detail|do-not-emit/u);
});

test("unknown alphanumeric error text is not reflected", async () => {
  const port: MindPort = {
    async requestCarePlan() {
      throw new Error("sensitivevalue123456789");
    },
  };
  const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
  assert.equal(receipt.evidenceCode, "UNVERIFIED_MIND_FAILURE");
  assert.doesNotMatch(JSON.stringify(receipt), /sensitivevalue/u);
});

test("invalid reply action fails closed", async () => {
  const port: MindPort = {
    async requestCarePlan() {
      return {
        text: JSON.stringify({
          action: "BAN",
          summaryCode: "PAUSE_AND_REVIEW",
          rationaleCode: "HIGH_SEVERITY",
          confidence: 1,
          requiresCreatorApproval: true,
          automatedEnforcement: false,
        }),
      };
    },
  };
  const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
  assert.equal(receipt.source, "fail-closed");
  assert.equal(receipt.mindsLiveVerified, false);
});

test("a structurally valid fake reply cannot claim official live provenance", async () => {
  const port: MindPort = {
    async requestCarePlan() {
      return {
        text: JSON.stringify({
          action: "DEESCALATE",
          summaryCode: "ACKNOWLEDGE_WITH_BOUNDARY",
          rationaleCode: "RECURRING_PATTERN",
          confidence: 0.61,
          requiresCreatorApproval: true,
          automatedEnforcement: false,
        }),
      };
    },
  };
  const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
  assert.equal(receipt.source, "fixture");
  assert.equal(receipt.mindsLiveVerified, false);
  assert.equal(receipt.requiresCreatorApproval, true);
});

test("parser rejects replies that request automated enforcement", () => {
  assert.throws(
    () => parseMindReply(JSON.stringify({
      action: "NO_ACTION",
      summaryCode: "NO_INTERVENTION",
      rationaleCode: "LIMITED_CONTEXT",
      confidence: 0.5,
      requiresCreatorApproval: true,
      automatedEnforcement: true,
    })),
    /automated_enforcement_forbidden/u,
  );
});

test("identity-bearing channel and policy labels are rejected before the Mind call", async () => {
  const input = { ...(await fixture()), channel: "alice_private_case_123" };
  assert.throws(() => minimizeIncident(input, PRIVACY_KEY), /channel_invalid/u);
  const policyInput = { ...(await fixture()), policyCategory: "customer_bob_42" };
  assert.throws(() => minimizeIncident(policyInput, PRIVACY_KEY), /policy_category_invalid/u);
});

test("free-text fields from a Mind are never copied into the public receipt", async () => {
  const port: MindPort = {
    async requestCarePlan() {
      return {
        text: JSON.stringify({
          action: "CLARIFY",
          summaryCode: "REQUEST_MORE_CONTEXT",
          rationaleCode: "LIMITED_CONTEXT",
          summary: "Contact private.person@example.invalid at https://secret.invalid",
          rationale: "Bearer top-secret-value",
          confidence: 0.4,
          requiresCreatorApproval: true,
          automatedEnforcement: false,
        }),
      };
    },
  };
  const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
  assert.equal(receipt.summaryCode, "REQUEST_MORE_CONTEXT");
  assert.doesNotMatch(JSON.stringify(receipt), /private\.person|secret\.invalid|top-secret/u);
});

test("a missing HMAC key fails closed before contacting a Mind", async () => {
  let calls = 0;
  const port: MindPort = {
    async requestCarePlan() {
      calls += 1;
      throw new Error("should_not_run");
    },
  };
  const receipt = await runCareRelay(await fixture(), port, "");
  assert.equal(calls, 0);
  assert.equal(receipt.evidenceCode, "PRIVACY_KEY_REQUIRED");
});

test("the official adapter returns fail-closed on a hung SDK operation", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (() => new Promise<Response>(() => undefined)) as typeof fetch;
  try {
    const port = new OfficialMindsPort({
      builderApiKey: "synthetic.test.key",
      mindId: "synthetic-mind",
      alias: "creator-care-relay-test",
      timeoutMs: 50,
    });
    const started = Date.now();
    const receipt = await runCareRelay(await fixture(), port, PRIVACY_KEY);
    assert.equal(receipt.source, "fail-closed");
    assert.equal(receipt.evidenceCode, "MINDS_OPERATION_TIMEOUT");
    assert.ok(Date.now() - started < 500);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
