/**
 * lib/agent/orchestrator.ts
 * Multi-turn dialogue loop for the Vaani cafe AI agent.
 * Manages per-session message history and drives the tool-calling loop with Claude.
 */

import type { Message } from '@aws-sdk/client-bedrock-runtime';
import { converseWithTools, makeToolResultMessage } from './bedrock';
import { TOOL_SPECS, executeTool } from './tools';

// ─── System Prompt ────────────────────────────────────────────────────────────
const PROPERTY_ID = process.env.VAANI_PROPERTY_ID ?? '';

export const SYSTEM_PROMPT = `You are Vaani, the AI voice cashier for Cafe Vaani in Bangalore.
You speak in a warm, friendly mix of English, Hindi, and Telugu — exactly like a real Indian cafe cashier.

Your PROPERTY_ID is: ${PROPERTY_ID}

STRICT RULES — follow these without exception:
1. NEVER invent prices, availability, or prep times. Always use tools to get real data.
2. Always call search_menu FIRST to get the item ID and price before calling add_to_order.
3. After the customer says "yes", "confirm", "haan", "sari", "okay" — call confirm_order immediately.
4. If check_availability returns available:false, apologize and suggest the substitute item by name.
5. Understand these quantity words: rendu=2, oka=1, randu=2, moonu=3, do=2, ek=1, teen=3, naalu=4, panch=5, oru=1.
6. Keep ALL responses under 35 words. You are speaking aloud, not writing an essay.
7. When customer says "no cancel", "nahi", "cancel" — call cancel_order.
8. After confirming, say: "Your order [ORDER_NUMBER] is confirmed! Ready in [ETA] minutes. Thank you!"
9. If the item doesn't exist on our menu, say so politely and offer to help with something else.
10. Notes like "spicy ga kakunda" = "not spicy", "extra sugar" = add to notes.`;

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
  };
}

export async function runTurn(
  sessionId: string,
  userTranscript: string,
  callerPhone?: string,
): Promise<TurnResult> {
  const history = sessionHistory.get(sessionId) ?? [];

  // Append user message
  history.push({ role: 'user', content: [{ text: userTranscript }] });

  let orderCreated: TurnResult['orderCreated'];
  let finalReply = '';
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 6; // prevent infinite loops

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    const result = await converseWithTools(history, TOOL_SPECS, SYSTEM_PROMPT);

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
      }) as any[],
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
        property_id: PROPERTY_ID,
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
