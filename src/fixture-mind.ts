import type { MindPort, MindResponse } from "./types.js";

// Public and intentionally synthetic. Never use this value for live incident identifiers.
export const SYNTHETIC_FIXTURE_PRIVACY_KEY = "fixture-only-key-material-not-for-live-use-v1";

export class FixtureMindPort implements MindPort {
  async requestCarePlan(prompt: string): Promise<MindResponse> {
    const severity = prompt.includes('"severity":"high"') || prompt.includes('"severity":"urgent"');
    return {
      text: JSON.stringify({
        action: severity ? "HUMAN_REVIEW" : "CLARIFY",
        summaryCode: severity ? "PAUSE_AND_REVIEW" : "REQUEST_MORE_CONTEXT",
        rationaleCode: severity ? "HIGH_SEVERITY" : "LIMITED_CONTEXT",
        confidence: severity ? 0.72 : 0.64,
        requiresCreatorApproval: true,
        automatedEnforcement: false,
      }),
    };
  }
}
