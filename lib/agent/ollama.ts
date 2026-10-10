/**
 * lib/agent/ollama.ts
 * Local Ollama / Qwen adapter for VAANI agent.
 *
 * Implements:
 * 1. Health check to determine if local Ollama daemon is reachable.
 * 2. Multi-turn dialogue with native function / tool calling for Qwen 2.5.
 * 3. 6,000ms bounded timeout with graceful fallback.
 * 4. Zero external cloud dependencies (completely replaces Bedrock for local execution).
 */

export interface OllamaToolSpec {
  name: string;
  description: string;
  input_schema: object;
}

export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface OllamaConverseResult {
  role: 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  >;
  stopReason: 'tool_use' | 'end_turn';
}

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5:7b';
const OLLAMA_TIMEOUT_MS = 6000;

/**
 * Checks if Ollama daemon is currently running on the host machine.
 */
export async function isOllamaReachable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Sends a turn to local Ollama with Qwen 2.5 function-calling schemas.
 */
export async function converseWithOllama(
  messages: Array<{ role: string; content: any }>,
  tools: OllamaToolSpec[],
  systemPrompt: string,
): Promise<OllamaConverseResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_TIMEOUT_MS);

  // Map messages to Ollama format
  const formattedMessages: OllamaMessage[] = [
    { role: 'system', content: systemPrompt },
  ];

  for (const m of messages) {
    if (typeof m.content === 'string') {
      formattedMessages.push({ role: m.role as any, content: m.content });
    } else if (Array.isArray(m.content)) {
      const textBlock = m.content.find((b: any) => b.text || b.type === 'text');
      const text = textBlock?.text || JSON.stringify(m.content);
      formattedMessages.push({ role: m.role as any, content: text });
    }
  }

  // Map tools to Ollama function calling format
  const ollamaTools = tools.map((t) => ({
    type: 'function',
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: formattedMessages,
        tools: ollamaTools,
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`Ollama returned status ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const assistantMessage = data.message;
    const contentBlocks: OllamaConverseResult['content'] = [];

    // Parse tool calls if Qwen requested them
    if (assistantMessage.tool_calls && Array.isArray(assistantMessage.tool_calls)) {
      for (const tc of assistantMessage.tool_calls) {
        contentBlocks.push({
          type: 'tool_use',
          id: `ollama_tool_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: tc.function.name,
          input: typeof tc.function.arguments === 'string'
            ? JSON.parse(tc.function.arguments)
            : tc.function.arguments || {},
        });
      }
    }

    if (assistantMessage.content) {
      contentBlocks.push({
        type: 'text',
        text: assistantMessage.content,
      });
    }

    return {
      role: 'assistant',
      content: contentBlocks,
      stopReason: contentBlocks.some((b) => b.type === 'tool_use') ? 'tool_use' : 'end_turn',
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Ollama local request failed: ${msg}`);
  }
}
