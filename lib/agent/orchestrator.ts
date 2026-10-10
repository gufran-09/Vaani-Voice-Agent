/**
 * lib/agent/orchestrator.ts
 * Multi-turn dialogue loop for the Vaani cafe AI agent.
 * Manages per-session message history and drives the tool-calling loop with Claude.
 */

import type { Message, ContentBlock } from '@aws-sdk/client-bedrock-runtime';
import { converseWithTools, makeToolResultMessage } from './bedrock';
import { converseWithOllama, isOllamaReachable } from './ollama';
import { TOOL_SPECS, executeTool } from './tools';
import { buildScopedSystemPrompt } from './knowledge';

// ─── System Prompt ────────────────────────────────────────────────────────────
const PROPERTY_ID = process.env.VAANI_PROPERTY_ID ?? '';

export const SYSTEM_PROMPT = buildScopedSystemPrompt(PROPERTY_ID);

// ─── Per-session message history ──────────────────────────────────────────────
const sessionHistory = new Map<string, Message[]>();

export function getSessionHistory(sessionId: string): Message[] {
  return sessionHistory.get(sessionId) ?? [];
}

export function clearSession(sessionId: string): void {
  sessionHistory.delete(sessionId);
}

// ─── Main turn function ───────────────────────────────────────────────────────
export interface TurnResult {
  reply: string;
  orderCreated?: {
    orderId: string;
    orderNumber: string;
    totalAmount: number;
    etaMinutes: number;
    items: Array<{ name: string; quantity: number }>;
    mockSms?: unknown;
  };
}

export async function runTurn(
  sessionId: string,
  userTranscript: string,
  callerPhone?: string,
  propertyId?: string,
): Promise<TurnResult> {
  const activePropertyId = propertyId || PROPERTY_ID || process.env.VAANI_PROPERTY_ID || '';
  const history = sessionHistory.get(sessionId) ?? [];

  // Append user message
  history.push({ role: 'user', content: [{ text: userTranscript }] });

  let orderCreated: TurnResult['orderCreated'];
  let finalReply = '';
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 6; // prevent infinite loops

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    let result;
    const useLocalOllama = await isOllamaReachable();
    if (useLocalOllama) {
      const ollamaMessages = history.map((m) => ({
        role: m.role || 'user',
        content: m.content || '',
      }));
      result = await converseWithOllama(ollamaMessages, TOOL_SPECS, SYSTEM_PROMPT);
    } else if (process.env.USE_BEDROCK === 'true') {
      result = await converseWithTools(history, TOOL_SPECS, SYSTEM_PROMPT);
    } else {
      throw new Error('Ollama local runtime is offline and Bedrock is disabled in local mode.');
    }

    // Append assistant response to history
    const assistantMsg: Message = {
      role: 'assistant',
      content: result.content.map((block) => {
        if (block.type === 'text') return { text: block.text };
        return {
          toolUse: {
            toolUseId: block.id,
            name: block.name,
            input: block.input,
          },
        };
      }) as ContentBlock[],
    };
    history.push(assistantMsg);

    // If no tool calls — we have the final reply
    if (result.stopReason === 'end_turn' || !result.content.some((b) => b.type === 'tool_use')) {
      const textBlock = result.content.find((b) => b.type === 'text');
      finalReply = textBlock?.type === 'text' ? textBlock.text : '';
      break;
    }

    // Execute all tool calls and collect results
    const toolResultMessages: Message[] = [];
    for (const block of result.content) {
      if (block.type !== 'tool_use') continue;

      const toolArgs = {
        ...block.input,
        session_id: sessionId,
        property_id: activePropertyId,
        ...(callerPhone ? { customer_phone: callerPhone } : {}),
      };

      let toolResult: unknown;
      try {
        toolResult = await executeTool(block.name, toolArgs);
      } catch (err) {
        toolResult = { error: String(err) };
      }

      // Capture confirm_order result for the API response
      if (block.name === 'confirm_order' && toolResult && typeof toolResult === 'object') {
        const r = toolResult as Record<string, unknown>;
        if (r.success) {
          orderCreated = {
            orderId:     r.order_id as string,
            orderNumber: r.order_number as string,
            totalAmount: r.total_amount as number,
            etaMinutes:  r.prep_eta_minutes as number,
            items:       r.items as Array<{ name: string; quantity: number }>,
            mockSms:     r.mock_sms,
          };
        }
      }

      toolResultMessages.push(makeToolResultMessage(block.id, toolResult));
    }

    // Merge all tool results into a single user message (Bedrock requires this)
    if (toolResultMessages.length > 0) {
      const merged: Message = {
        role: 'user',
        content: toolResultMessages.flatMap((m) => m.content ?? []),
      };
      history.push(merged);
    }
  }

  // Persist updated history
  // Trim to last 20 messages to avoid token overflow
  const trimmed = history.slice(-20);
  sessionHistory.set(sessionId, trimmed);

  return { reply: finalReply, orderCreated };
}
