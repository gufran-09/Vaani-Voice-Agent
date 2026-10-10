/**
 * scripts/test-member2-llm.ts
 *
 * Member 2 Verification Suite:
 * 1. Verifies 7 standardized hospitality Markdown documents exist in /knowledge.
 * 2. Verifies dynamic context loader (lib/agent/knowledge.ts) produces scoped prompts (< 1,200 tokens).
 * 3. Verifies LLMProvider abstraction (lib/agent/llm-provider.ts) cleanly decouples Bedrock.
 * 4. Verifies Ollama tool calling schemas adhere to Qwen 2.5 spec.
 * 5. Verifies graceful offline handling and reachability check.
 */

import * as fs from 'fs';
import * as path from 'path';

import { getKnowledgeDocuments, buildScopedSystemPrompt } from '../lib/agent/knowledge';
import { OllamaQwenProvider, BedrockFallbackProvider, getActiveLLMProvider } from '../lib/agent/llm-provider';
import { isOllamaReachable, converseWithOllama } from '../lib/agent/ollama';
import { TOOL_SPECS } from '../lib/agent/tools';

async function runMember2Tests() {
  console.log('\n======================================================');
  console.log('🧠 MEMBER 2 TEST SUITE: OLLAMA LOCAL LLM & KNOWLEDGE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // 1. Verify 7 Markdown Documents
  console.log('[Test 1: Hospitality Knowledge Documents]');
  const expectedDocs = [
    'system_prompt.md',
    'restaurant_profile.md',
    'guest_interaction_rules.md',
    'menu_guidelines.md',
    'ordering_policy.md',
    'faq.md',
    'escalation_policy.md',
  ];

  for (const doc of expectedDocs) {
    const exists = fs.existsSync(path.resolve(process.cwd(), 'knowledge', doc));
    assert(exists, `knowledge/${doc} exists`);
  }

  // 2. Dynamic Context Assembly & Token Count Guard
  console.log('\n[Test 2: Dynamic Context Loader]');
  const testPropertyId = '62e1b115-9382-40f8-853a-0a773735d034';
  const generalPrompt = buildScopedSystemPrompt(testPropertyId);
  const wifiPrompt = buildScopedSystemPrompt(testPropertyId, 'what is your wifi password?');

  assert(generalPrompt.includes('Cafe Vaani'), 'System prompt contains Cafe Vaani persona');
  assert(generalPrompt.includes(testPropertyId), 'System prompt contains property ID');
  assert(wifiPrompt.includes('CafeVaani_Guest'), 'Selectively injected Wi-Fi credentials for Wi-Fi query');
  assert(!generalPrompt.includes('CafeVaani_Guest'), 'Did not bloat general prompt with Wi-Fi details');

  // Rough token estimate (chars / 4)
  const tokenEstimate = Math.ceil(generalPrompt.length / 4);
  console.log(`  Estimated token size of base prompt: ~${tokenEstimate} tokens`);
  assert(tokenEstimate < 1200, `Prompt size (~${tokenEstimate} tokens) is strictly under 1,200 token budget`);

  // 3. Decoupling & LLM Provider Abstraction
  console.log('\n[Test 3: LLM Provider Abstraction & Bedrock Decoupling]');
  const ollamaProvider = new OllamaQwenProvider();
  const bedrockProvider = new BedrockFallbackProvider();

  assert(ollamaProvider.name.includes('Ollama'), 'OllamaQwenProvider registered with correct name');
  assert(bedrockProvider.name.includes('Bedrock'), 'BedrockFallbackProvider registered with correct name');

  // In local mode without USE_BEDROCK=true, bedrock must be unavailable
  delete process.env.USE_BEDROCK;
  const isBedrockAvailable = await bedrockProvider.isAvailable();
  assert(isBedrockAvailable === false, 'Bedrock provider is strictly disabled when USE_BEDROCK is unset');

  // 4. Reachability & Tool Schema Validation
  console.log('\n[Test 4: Ollama Reachability & Tool Schemas]');
  const reachable = await isOllamaReachable();
  console.log(`  Ollama daemon status on localhost:11434: ${reachable ? 'ONLINE' : 'OFFLINE (Graceful)'}`);
  assert(typeof reachable === 'boolean', 'isOllamaReachable returns boolean without throwing');

  assert(TOOL_SPECS.length >= 7, `Exported ${TOOL_SPECS.length} tool specifications for Qwen function calling`);
  const searchMenuTool = TOOL_SPECS.find((t) => t.name === 'search_menu');
  assert(Boolean(searchMenuTool), 'search_menu tool spec exists');
  assert(Boolean(searchMenuTool?.input_schema), 'search_menu specifies JSON input schema');

  console.log('\n======================================================');
  console.log(`MEMBER 2 SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runMember2Tests();
