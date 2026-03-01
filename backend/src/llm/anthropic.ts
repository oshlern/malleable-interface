import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMJsonOptions } from "./provider.js";

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-sonnet-4-20250514") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateJson<T>(options: LLMJsonOptions): Promise<T> {
    const systemMsg = options.messages.find((m) => m.role === "system");
    const nonSystemMsgs = options.messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await this.client.messages.create({
      model: this.model,
      system: systemMsg?.content ?? "",
      messages: nonSystemMsgs,
      max_tokens: options.maxTokens ?? 4096,
      temperature: options.temperature ?? 0.7,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("Anthropic returned no text block");
    }

    const raw = textBlock.text;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not extract JSON from Anthropic response");
    }
    return JSON.parse(jsonMatch[0]) as T;
  }
}
