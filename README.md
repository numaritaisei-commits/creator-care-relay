# Creator Care Relay

Creator Care Relay is a consent-first prototype for **Creative Minds Jam #1 — Track 03:
Moderation & Community Assistance**. It turns a community incident into a privacy-minimized
envelope, asks a persistent Minds agent for a care plan, validates the reply, and gives the creator
an auditable receipt. It never posts, deletes, bans, blocks, or contacts anyone automatically.

## Evidence boundary

The committed fixture is wholly synthetic. Its receipt always says:

```json
{
  "mindsLiveVerified": false,
  "source": "fixture",
  "evidenceCode": "SYNTHETIC_FIXTURE_ONLY",
  "summaryCode": "PAUSE_AND_REVIEW",
  "rationaleCode": "HIGH_SEVERITY"
}
```

No live Mind, cognition grant, Builder API key, participant account, competition submission, or
score has been used or claimed. A live-shaped fake in unit tests verifies the parser contract; it
cannot create official-live provenance and is not evidence of a network call. Live errors,
end-to-end deadline expiry, missing consent, and malformed replies fail closed to `HUMAN_REVIEW`.

## Why Minds is integral

The official `@animocabrands/minds-client-lib` adapter uses the documented flow:

1. `ensureConversation(alias, mindId)` to bind a stable creator/Mind context;
2. `getLatestHistoryFingerprint(alias)` before the request;
3. `sendMessage({ alias, messageText })` with only the minimized envelope;
4. `waitForReply(...)` after the exact fingerprint;
5. local fixed-code schema validation and a human-approval receipt.

Minds supplies the persistent community context. The local boundary supplies data minimization,
consent, deterministic validation, and enforcement restraint.

## Quick start (synthetic fixture only)

Requirements: Node.js 22+ and pnpm/npm. Install scripts are unnecessary.

```bash
pnpm install --ignore-scripts --frozen-lockfile
pnpm typecheck
pnpm test
pnpm demo
```

The fixture intentionally contains fake handle/email/URL shapes so the tests prove none cross the
Mind boundary.

## Live integration gate

Do not use live mode until the entrant has an official Mind, a confirmed zero-cost cognition path,
and a Builder API key stored only in the process environment. Never paste or commit credentials.
Generate a unique 32+ character `CREATOR_CARE_PRIVACY_KEY` locally; the example file intentionally
leaves it blank, and the public fixture key is rejected by live CLI mode.

```bash
CREATOR_CARE_PRIVACY_KEY=... \
MINDS_BUILDER_API_KEY=... \
MINDS_MIND_ID=... \
node dist/src/cli.js --live fixtures/community-incident.json
```

Live mode performs one bounded request. It does not top up cognition, add a card, fund a wallet,
pay gas, enable auto-refill, or mutate a community platform. The receipt is marked live only when
the official adapter returns a non-timeout reply that passes every schema and safety check; a
structurally identical fixture or mock cannot self-declare live provenance. The local deadline
aborts SDK operations that expose a signal and prevents later workflow steps from starting. The
official `0.1.3` SDK does not expose an abort signal on conversation creation or message sending,
so a request already in flight at the deadline may still settle remotely even though the local
receipt fails closed.

## Jam mapping

- Official organizer information states a US$10,000 aggregate pool, August 28 deadline,
  free/global/100% remote participation, and permission to use other AI tools.
- Minds must be integral; this project uses the official Builder client rather than a brand-only
  mention.
- Track fit: persistent creator-approved context, moderation/community assistance, and human
  control.
- Judging fit: a distinct care-not-punishment concept, inspectable technical boundary, short
  receipt UX, and a truthful agentic-AI evidence line.

Official sources:

- <https://creativemindsjam.com/>
- <https://www.animocabrands.com/announcement/the-sandbox-and-animoca-brands-launch-creative-minds-jam-1-hong-kong-usd10000-agentic-ai-competition>
- <https://build.hellominds.ai/en/docs/get-started/client-library>
- <https://www.hellominds.ai/campaign/free-credits>

## Security

- Raw text is inspected locally only for aggregate signal counts and never included in the prompt.
- Raw-content fingerprints are omitted from the remote envelope. Incident IDs use a
  deployment-specific HMAC key; timestamps are reduced to a UTC day.
- Channel and policy labels are fixed allowlists rather than caller-supplied identifiers.
- Mind output is reduced to fixed summary/rationale codes and mapped to local safe text; arbitrary
  reply text is never copied into a receipt.
- Secrets are environment-only and never logged.
- Unexpected error text is replaced by a fixed public error code.
- Every outcome requires creator approval and forbids automated enforcement.

## Third-party license boundary

Project-owned source is licensed under Apache-2.0. The official
`@animocabrands/minds-client-lib@0.1.3` dependency is referenced but never vendored; its published
metadata says `UNLICENSED` and its README calls it private-alpha tooling. Apache-2.0 does not
relicense that package. Install or live use is subject to the organizer's official access and
terms. The synthetic fixture path does not contact or redistribute the SDK service.
