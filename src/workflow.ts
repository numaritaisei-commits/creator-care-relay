import { minimizeIncident } from "./minimize.js";
import { isVerifiedOfficialMindsResponse } from "./official-minds.js";
import { buildCarePrompt } from "./prompt.js";
import { failClosedReceipt, parseMindReply, verifiedReceipt } from "./receipt.js";
import type { CareReceipt, MindPort, RawIncident } from "./types.js";

export async function runCareRelay(
  input: RawIncident,
  port: MindPort,
  privacyKey: string,
): Promise<CareReceipt> {
  let incidentIdHash = "unavailable";
  try {
    const minimized = minimizeIncident(input, privacyKey);
    incidentIdHash = minimized.incidentIdHash;
    const response = await port.requestCarePlan(buildCarePrompt(minimized));
    const source = isVerifiedOfficialMindsResponse(response) ? "live" : "fixture";
    return verifiedReceipt(incidentIdHash, parseMindReply(response.text), source);
  } catch (error) {
    return failClosedReceipt(incidentIdHash, error);
  }
}
