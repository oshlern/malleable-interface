import { OpenAIProvider } from "./openai.js";
import { AnthropicProvider } from "./anthropic.js";
import type { LLMProvider } from "./provider.js";

export type { LLMProvider, LLMMessage, LLMJsonOptions } from "./provider.js";

let openaiProvider: LLMProvider | null = null;
let anthropicProvider: LLMProvider | null = null;

export function getOpenAI(): LLMProvider {
  if (!openaiProvider) {
    const key = process.env.OPENAI_API_KEY;
    if (!key) throw new Error("OPENAI_API_KEY not set");
    openaiProvider = new OpenAIProvider(key);
  }
  return openaiProvider;
}

export function getAnthropic(): LLMProvider {
  if (!anthropicProvider) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY not set");
    anthropicProvider = new AnthropicProvider(key);
  }
  return anthropicProvider;
}
