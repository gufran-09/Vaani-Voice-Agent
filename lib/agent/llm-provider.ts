/**
 * lib/agent/llm-provider.ts
 * Unified LLM Provider Interface for Member 2.
 *
 * Responsibilities:
 * 1. Defines the standard LLMProvider contract for local and fallback models.
 * 2. Decouples Amazon Bedrock completely in local mode.
 * 3. Enforces bounded execution timeouts and structured tool-calling schemas.
 */

import { OllamaToolSpec, converseWithOllama, isOllamaReachable } from './ollama';
import { converseWithTools } from './bedrock';

export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: any;
}

export interface LLMToolCall {
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface LLMResponse {
  role: 'assistant';
  content: Array<{
    type: 'text' | 'tool_use';
    text?: string;
    id?: string;
    name?: string;
    input?: Record<string, any>;
  }>;
  stopReason: 'tool_use' | 'end_turn';
}

export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  converse(
    messages: LLMMessage[],
    tools: OllamaToolSpec[],
    systemPrompt: string
  ): Promise<LLMResponse>;
}

export class OllamaQwenProvider implements LLMProvider {
  name = 'Ollama (Qwen 2.5)';

  async isAvailable(): Promise<boolean> {
    return isOllamaReachable();
  }

  async converse(
    messages: LLMMessage[],
    tools: OllamaToolSpec[],
    systemPrompt: string
  ): Promise<LLMResponse> {
    return converseWithOllama(messages, tools, systemPrompt);
  }
}

export class BedrockFallbackProvider implements LLMProvider {
  name = 'AWS Bedrock (Claude)';

  async isAvailable(): Promise<boolean> {
    return process.env.USE_BEDROCK === 'true' && Boolean(process.env.AWS_REGION);
  }

  async converse(
    messages: LLMMessage[],
    tools: any[],
    systemPrompt: string
  ): Promise<LLMResponse> {
    return converseWithTools(messages as any, tools, systemPrompt) as any;
  }
}

let activeProvider: LLMProvider | null = null;

export async function getActiveLLMProvider(): Promise<LLMProvider> {
  const ollama = new OllamaQwenProvider();
  if (await ollama.isAvailable()) {
    activeProvider = ollama;
    return ollama;
  }

  if (process.env.USE_BEDROCK === 'true') {
    const bedrock = new BedrockFallbackProvider();
    if (await bedrock.isAvailable()) {
      activeProvider = bedrock;
      return bedrock;
    }
  }

  // Return Ollama provider even if offline so callers can attempt or catch cleanly
  activeProvider = ollama;
  return ollama;
}
