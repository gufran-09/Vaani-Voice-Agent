/**
 * lib/agent/bedrock.ts
 * Thin wrapper around @aws-sdk/client-bedrock-runtime for Claude tool-calling.
 * Uses the default AWS credential chain (AWS_PROFILE=default in .env).
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type Tool,
  type ToolResultContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

const MODEL_ID = process.env.BEDROCK_MODEL_ID ?? 'amazon.nova-pro-v1:0';
const REGION   = process.env.BEDROCK_REGION   ?? 'us-east-1';

// Singleton client — reused across requests in the same process
let _client: BedrockRuntimeClient | null = null;
function getClient(): BedrockRuntimeClient {
  if (!_client) {
    _client = new BedrockRuntimeClient({ region: REGION });
  }
  return _client;
}

export interface BedrockToolSpec {
  name: string;
  description: string;
  input_schema: object; // JSON Schema
}

export interface BedrockConverseResult {
  role: 'assistant';
  content: Array<
    | { type: 'text'; text: string }
    | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  >;
  stopReason: string;
}

/**
 * Send a turn to Claude via the Bedrock Converse API (supports tool_use natively).
 */
export async function converseWithTools(
  messages: Message[],
  tools: BedrockToolSpec[],
  systemPrompt: string,
): Promise<BedrockConverseResult> {
  const client = getClient();

  const bedrockTools: Tool[] = tools.map((t) => ({
    toolSpec: {
      name: t.name,
      description: t.description,
      inputSchema: { json: t.input_schema },
    },
  } as Tool));

  const cmd = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: systemPrompt }],
    messages,
    toolConfig: { tools: bedrockTools },
    inferenceConfig: { maxTokens: 512, temperature: 0.3 },
  });

  const response = await client.send(cmd);
  const output = response.output?.message;
  if (!output) throw new Error('Bedrock returned no output message');

  const content: BedrockConverseResult['content'] = (output.content ?? []).map((block: any) => {
    if (block.text !== undefined) return { type: 'text' as const, text: block.text };
    if (block.toolUse) {
      return {
        type: 'tool_use' as const,
        id: block.toolUse.toolUseId ?? '',
        name: block.toolUse.name ?? '',
        input: (block.toolUse.input ?? {}) as Record<string, unknown>,
      };
    }
    return { type: 'text' as const, text: '' };
  });

  return {
    role: 'assistant',
    content,
    stopReason: response.stopReason ?? 'end_turn',
  };
}

/**
 * Build a tool_result message to append to history after executing a tool.
 */
export function makeToolResultMessage(
  toolUseId: string,
  result: unknown,
): Message {
  const content = {
    json: result,
  } as ToolResultContentBlock;
  return {
    role: 'user',
    content: [{ toolResult: { toolUseId, content: [content] } }],
  };
}
