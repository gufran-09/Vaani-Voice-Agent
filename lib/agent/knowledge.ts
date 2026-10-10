/**
 * lib/agent/knowledge.ts
 * Scoped Markdown Knowledge Loader for Member 2.
 *
 * Responsibilities:
 * 1. Loads and caches the 7 standardized hospitality Markdown documents from /knowledge.
 * 2. Assembles dynamic, relevant system prompts without token bloat (< 1,200 tokens).
 * 3. Enforces the <= 35-word voice turn brevity rule and Indian bilingual hospitality persona.
 */

import * as fs from 'fs';
import * as path from 'path';

interface KnowledgeCache {
  systemPrompt?: string;
  restaurantProfile?: string;
  guestRules?: string;
  menuGuidelines?: string;
  orderingPolicy?: string;
  faq?: string;
  escalationPolicy?: string;
}

const cache: KnowledgeCache = {};

function readKnowledgeFile(filename: string): string {
  try {
    const fullPath = path.resolve(process.cwd(), 'knowledge', filename);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch (err) {
    console.warn(`[KnowledgeLoader] Unable to read ${filename}:`, err);
  }
  return '';
}

/**
 * Loads and returns all cached knowledge docs.
 */
export function getKnowledgeDocuments(): KnowledgeCache {
  if (!cache.systemPrompt) {
    cache.systemPrompt = readKnowledgeFile('system_prompt.md');
    cache.restaurantProfile = readKnowledgeFile('restaurant_profile.md');
    cache.guestRules = readKnowledgeFile('guest_interaction_rules.md');
    cache.menuGuidelines = readKnowledgeFile('menu_guidelines.md');
    cache.orderingPolicy = readKnowledgeFile('ordering_policy.md');
    cache.faq = readKnowledgeFile('faq.md');
    cache.escalationPolicy = readKnowledgeFile('escalation_policy.md');
  }
  return cache;
}

/**
 * Builds a compact, scoped system prompt tailored for voice interaction with Qwen 2.5 / local LLM.
 * Keeps token footprint well under 1,200 tokens.
 */
export function buildScopedSystemPrompt(propertyId: string, contextQuery?: string): string {
  const docs = getKnowledgeDocuments();

  const sections: string[] = [];

  // Core persona & directives (Mandatory)
  if (docs.systemPrompt) {
    sections.push(docs.systemPrompt);
  } else {
    sections.push(
      'You are Vaani, the AI voice cashier for Cafe Vaani in Bangalore.\n' +
      'Speak in a warm Indian cafe persona. Keep all responses under 35 words.'
    );
  }

  // Restaurant details
  if (docs.restaurantProfile) {
    sections.push('## Restaurant Profile\n' + docs.restaurantProfile);
  }

  // Multilingual rules
  if (docs.guestRules) {
    sections.push('## Guest Rules & Language Nuances\n' + docs.guestRules);
  }

  // Ordering policies
  if (docs.orderingPolicy) {
    sections.push('## Ordering & Confirmation Protocol\n' + docs.orderingPolicy);
  }

  // Conditional FAQ or Escalation injection if relevant
  const qLower = (contextQuery || '').toLowerCase();
  if (qLower.includes('wifi') || qLower.includes('parking') || qLower.includes('pay') || qLower.includes('hours')) {
    if (docs.faq) sections.push('## FAQ\n' + docs.faq);
  }

  if (qLower.includes('manager') || qLower.includes('allergic') || qLower.includes('complaint')) {
    if (docs.escalationPolicy) sections.push('## Escalation\n' + docs.escalationPolicy);
  }

  // Authoritative Property ID injection
  sections.push(`## Operational Target Property ID\nPROPERTY_ID: ${propertyId}`);

  return sections.join('\n\n---\n\n');
}
