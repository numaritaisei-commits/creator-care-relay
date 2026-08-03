import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { FixtureMindPort, SYNTHETIC_FIXTURE_PRIVACY_KEY } from "./fixture-mind.js";
import { OfficialMindsPort, officialMindsConfigFromEnv } from "./official-minds.js";
import type { RawIncident } from "./types.js";
import { runCareRelay } from "./workflow.js";

function usage(): never {
  throw new Error("usage: --fixture <incident.json> | --live <incident.json>");
}

async function main(): Promise<void> {
  const mode = process.argv[2];
  const path = process.argv[3];
  if ((mode !== "--fixture" && mode !== "--live") || !path || process.argv.length !== 4) usage();
  const input = JSON.parse(await readFile(resolve(path), "utf8")) as RawIncident;
  const port = mode === "--live"
    ? new OfficialMindsPort(officialMindsConfigFromEnv(process.env))
    : new FixtureMindPort();
  const privacyKey = mode === "--live"
    ? (process.env.CREATOR_CARE_PRIVACY_KEY ?? "")
    : SYNTHETIC_FIXTURE_PRIVACY_KEY;
  if (mode === "--live" && privacyKey === SYNTHETIC_FIXTURE_PRIVACY_KEY) {
    throw new Error("privacy_key_required");
  }
  const receipt = await runCareRelay(input, port, privacyKey);
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
  if (receipt.source === "fail-closed") process.exitCode = 2;
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "cli_failure";
  process.stderr.write(`${message}\n`);
  process.exitCode = 2;
});
