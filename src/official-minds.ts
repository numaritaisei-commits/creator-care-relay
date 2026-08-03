import { createMindsClient } from "@animocabrands/minds-client-lib";

import type { MindPort, MindResponse } from "./types.js";

const OFFICIAL_RESPONSES = new WeakSet<object>();

export function isVerifiedOfficialMindsResponse(response: MindResponse): boolean {
  return OFFICIAL_RESPONSES.has(response);
}

export interface OfficialMindsConfig {
  builderApiKey: string;
  mindId: string;
  alias: string;
  timeoutMs: number;
}

export class OfficialMindsPort implements MindPort {
  readonly #config: OfficialMindsConfig;

  constructor(config: OfficialMindsConfig) {
    if (!config.builderApiKey) throw new Error("builder_api_key_required");
    if (!config.mindId) throw new Error("mind_id_required");
    if (!/^[a-z0-9][a-z0-9_-]{1,63}$/iu.test(config.alias)) throw new Error("alias_invalid");
    if (!Number.isInteger(config.timeoutMs) || config.timeoutMs < 50 || config.timeoutMs > 180_000) {
      throw new Error("timeout_invalid");
    }
    this.#config = config;
  }

  async requestCarePlan(prompt: string): Promise<MindResponse> {
    const abortController = new AbortController();
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const operation = async (): Promise<MindResponse> => {
      const client = createMindsClient({ builderApiKey: this.#config.builderApiKey });
      await client.ensureConversation(this.#config.alias, this.#config.mindId);
      abortController.signal.throwIfAborted();
      const before = await client.getLatestHistoryFingerprint(
        this.#config.alias,
        abortController.signal,
      );
      abortController.signal.throwIfAborted();
      await client.sendMessage({ alias: this.#config.alias, messageText: prompt });
      abortController.signal.throwIfAborted();
      const outcome = await client.waitForReply({
        alias: this.#config.alias,
        timeoutMs: this.#config.timeoutMs,
        signal: abortController.signal,
        ...(before === undefined ? {} : { afterFingerprint: before }),
        sentMessageText: prompt,
      });
      abortController.signal.throwIfAborted();
      if (outcome.timedOut) throw new Error("minds_reply_timeout");
      const text = outcome.reply.messageText;
      if (typeof text !== "string" || !text.trim()) throw new Error("minds_reply_empty");
      const response = { text };
      OFFICIAL_RESPONSES.add(response);
      return response;
    };

    const timeout = new Promise<never>((_resolve, reject) => {
      deadline = setTimeout(() => {
        reject(new Error("minds_operation_timeout"));
        abortController.abort();
      }, this.#config.timeoutMs);
    });

    try {
      return await Promise.race([operation(), timeout]);
    } finally {
      if (deadline !== undefined) clearTimeout(deadline);
      abortController.abort();
    }
  }
}

export function officialMindsConfigFromEnv(env: NodeJS.ProcessEnv): OfficialMindsConfig {
  return {
    builderApiKey: env.MINDS_BUILDER_API_KEY ?? "",
    mindId: env.MINDS_MIND_ID ?? "",
    alias: env.MINDS_CONVERSATION_ALIAS ?? "creator-care-relay",
    timeoutMs: 120_000,
  };
}
