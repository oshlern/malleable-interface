export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMJsonOptions {
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMProvider {
  generateJson<T>(options: LLMJsonOptions): Promise<T>;
}
