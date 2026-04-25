import type {
  ConnectionType,
  ConversationOpportunity,
  DraftScaffold,
  Platform,
  Trend,
  VisibilityGap,
  VoiceProfile,
} from '../types';
import type { TavilyResult } from './tavily';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const MODEL = 'gemini-2.5-flash-lite';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface GeminiPart { text: string }
interface GeminiContent { role?: 'user' | 'model'; parts: GeminiPart[] }
interface GeminiResponse { candidates?: Array<{ content: GeminiContent }> }

async function generate(prompt: string, system?: string): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const body = {
      contents: [{ role: 'user' as const, parts: [{ text: prompt }] }],
      ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
      generationConfig: { responseMimeType: 'application/json', temperature: 0.5 },
    };
    const res = await fetch(`${GEMINI_BASE}/models/${MODEL}:generateContent?key=${API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn(`gemini ${res.status} — falling back`);
      return null;
    }
    const data = (await res.json()) as GeminiResponse;
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch (err) {
    console.warn('gemini threw — falling back', err);
    return null;
  }
}

function parseJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    return JSON.parse(cleaned) as T;
  } catch (err) {
    console.warn('gemini json parse failed', err);
    return fallback;
  }
}

// ────────────────────────────────────────────────────────────
// Query generation — Peec gaps → 3-tier search queries
// ────────────────────────────────────────────────────────────

export interface GeneratedQuery {
  query: string;
  platform: Platform;
  connectionType: ConnectionType;
  topicId: string;
}

export async function generateQueries(
  brand: { name: string; domain: string; competitors: string[] },
  gaps: VisibilityGap[],
): Promise<GeneratedQuery[]> {
  if (!API_KEY) return mockQueries(brand, gaps);
  const prompt = `Brand: ${brand.name} (${brand.domain})
Competitors: ${brand.competitors.join(', ')}
Visibility gaps (Peec topics where this brand is losing): ${gaps.map((g) => `${g.topicName} (${g.visibility}%)`).join(', ')}

Generate 12 search queries to find live conversations on Reddit, LinkedIn, and X where ${brand.name} could authentically engage. Distribute across:
- DIRECT: explicit mentions of the topic, competitors, or category
- ADJACENT: related pain points, workflows, or frustrations
- CULTURAL: broader scaling/founder/anti-incumbent themes that map to the topic

For each query, pick ONE platform (reddit, linkedin, or x). Return strict JSON:
{"queries":[{"query":"...","platform":"reddit","connectionType":"direct","topicId":"<topic id>"}]}`;
  const text = await generate(prompt);
  const parsed = parseJson<{ queries: GeneratedQuery[] }>(text, { queries: [] });
  return parsed.queries.length ? parsed.queries : mockQueries(brand, gaps);
}

// ────────────────────────────────────────────────────────────
// Relevance scoring + Peec impact estimation
// ────────────────────────────────────────────────────────────

export interface ScoredResult {
  url: string;
  relevanceScore: number;
  connectionType: ConnectionType;
  peecInsight: string;
  estimatedVisibilityLift: number;
  suggestedAngle: string;
}

export async function scoreResults(
  brand: { name: string; domain: string },
  results: Array<TavilyResult & { platform: Platform; query: string; topicId: string; topicName: string; topicVisibility: number }>,
): Promise<ScoredResult[]> {
  if (!API_KEY) return mockScored(results);
  const prompt = `You are scoring conversations for a brand called ${brand.name} (${brand.domain}).
For each post, return:
- relevanceScore (0-100): how worth engaging
- connectionType: "direct" | "adjacent" | "cultural"
- peecInsight: one sentence connecting the post to the brand's Peec topic gap, e.g. "You are invisible for 'CRM Automation' (18%). This thread directly discusses competitor frustration."
- estimatedVisibilityLift (number, percentage points): rough lift on the related topic if engaged at scale. Use the formula: lift = clamp((100 - topicVisibility) * relevanceScore / 100 * 0.04, 0.5, 6).
- suggestedAngle: one-line description of how the brand should engage (NOT the actual reply)

Posts:
${results.map((r, i) => `${i + 1}. [${r.platform}] (${r.topicName} ${r.topicVisibility}%) ${r.title} — ${r.content.slice(0, 200)}`).join('\n')}

Return strict JSON: {"scored":[{"url":"...","relevanceScore":85,"connectionType":"direct","peecInsight":"...","estimatedVisibilityLift":2.4,"suggestedAngle":"..."}]}`;
  const text = await generate(prompt);
  const parsed = parseJson<{ scored: ScoredResult[] }>(text, { scored: [] });
  return parsed.scored.length ? parsed.scored : mockScored(results);
}

// ────────────────────────────────────────────────────────────
// Voice extraction (system-prompt anchor)
// ────────────────────────────────────────────────────────────

export async function extractVoice(
  brand: { name: string; domain: string },
  corpus: Array<{ source: string; text: string }>,
): Promise<VoiceProfile> {
  if (!API_KEY) return mockVoice(brand.name);
  const prompt = `Analyze the brand voice of ${brand.name} based on the corpus below.
Return strict JSON matching:
{
  "summary": "one-line voice description",
  "traits": ["trait", ...],
  "toneSpectrum": {"formality":0-100,"technicality":0-100,"boldness":0-100,"humor":0-100,"warmth":0-100},
  "signaturePhrases": ["...", ...],
  "taboos": ["never say X", ...],
  "engagementStyle": "how they engage on social",
  "brandContextSummary": "summary of the brand's positioning, products, and proof points"
}

Corpus:
${corpus.map((c, i) => `--- ${i + 1}. ${c.source} ---\n${c.text.slice(0, 1500)}`).join('\n\n')}`;
  const text = await generate(prompt);
  return parseJson<VoiceProfile>(text, mockVoice(brand.name));
}

/**
 * Build the system prompt that anchors EVERY downstream generation call.
 * The voice profile + brand context is the wedge — drafts feel like the brand
 * because this prompt is in front of them.
 */
export function buildBrandSystemPrompt(brand: { name: string; domain: string }, voice: VoiceProfile): string {
  return `You are writing as ${brand.name} (${brand.domain}).
Voice summary: ${voice.summary}
Traits: ${voice.traits.join(', ')}
Tone — formality ${voice.toneSpectrum.formality}, technicality ${voice.toneSpectrum.technicality}, boldness ${voice.toneSpectrum.boldness}, humor ${voice.toneSpectrum.humor}, warmth ${voice.toneSpectrum.warmth} (0-100 each).
Signature phrases (use sparingly, never all at once): ${voice.signaturePhrases.join(' | ')}
Taboos: ${voice.taboos.join(' | ')}
Engagement style: ${voice.engagementStyle}
Brand context (positioning, products, proof): ${voice.brandContextSummary}

You produce DRAFT SCAFFOLDS, not press-send messages. The human will edit before posting.
Be specific, never generic. Lead with substance. Avoid AI-tells: no "I think", no "great point!", no rhetorical questions.`;
}

// ────────────────────────────────────────────────────────────
// Draft scaffold generation (the actual reply assistance)
// ────────────────────────────────────────────────────────────

export async function generateDraftScaffold(
  brand: { name: string; domain: string },
  voice: VoiceProfile,
  opportunity: Pick<ConversationOpportunity, 'platform' | 'title' | 'content' | 'connectionType' | 'peecInsight'>,
  angle: string,
): Promise<DraftScaffold> {
  if (!API_KEY) return mockDraft(opportunity, angle);
  const platformRules = PLATFORM_RULES[opportunity.platform];
  const prompt = `A ${opportunity.platform} post:
"""
${opportunity.title}
${opportunity.content}
"""

Connection: ${opportunity.connectionType}
Peec context: ${opportunity.peecInsight}
Angle to take: ${angle}

Platform rules: ${platformRules}

Draft a SCAFFOLD (not a finished message) the human will polish. Return strict JSON:
{
  "opener": "first 1-2 sentences",
  "angle": "the substantive middle (1-3 sentences)",
  "supporting": "specific proof/example (1 sentence)",
  "cta": "soft close — never salesy",
  "alternates": {"bolder":"...", "technical":"...", "shorter":"..."}
}`;
  const text = await generate(prompt, buildBrandSystemPrompt(brand, voice));
  return parseJson<DraftScaffold>(text, mockDraft(opportunity, angle));
}

const PLATFORM_RULES: Record<Platform, string> = {
  linkedin: 'Professional but human, 2-4 sentences, value-first, never hashtag-spammy. First-person.',
  reddit: 'Match subreddit tone. Helpful first. Mention the brand naturally alongside alternatives. Be transparent if affiliated.',
  x: 'Under 280 chars. Punchy. Personality-forward. No corporate-speak.',
};

// ────────────────────────────────────────────────────────────
// Trends (weekly)
// ────────────────────────────────────────────────────────────

export async function summarizeTrends(
  brand: { name: string },
  gaps: VisibilityGap[],
  trendCorpus: TavilyResult[],
): Promise<Trend[]> {
  if (!API_KEY) return mockTrends(gaps);
  const prompt = `For brand ${brand.name}, surface 5 trending themes from the corpus that map to its weak Peec topics.
Weak topics (with topic_id): ${gaps.map((g) => `${g.topicName} [${g.topicId}] @ ${g.visibility}%`).join(', ')}

Corpus snippets:
${trendCorpus.slice(0, 20).map((r, i) => `${i + 1}. ${r.title} — ${r.content.slice(0, 200)}`).join('\n')}

For each trend, estimate expectedLiftPp = clamp((100 - topicVisibility) * 0.05, 0.5, 5).
Return strict JSON: {"trends":[{"id":"t1","title":"...","description":"...","surface":"world|niche","relatedTopicId":"<topic_id>","expectedLiftPp":2.0,"evidence":["url1","url2"]}]}`;
  const text = await generate(prompt);
  const parsed = parseJson<{ trends: Trend[] }>(text, { trends: [] });
  return parsed.trends.length ? parsed.trends : mockTrends(gaps);
}

// ────────────────────────────────────────────────────────────
// MOCKS — used when no API key
// ────────────────────────────────────────────────────────────

function mockQueries(
  brand: { name: string; competitors: string[] },
  gaps: VisibilityGap[],
): GeneratedQuery[] {
  const platforms: Platform[] = ['reddit', 'linkedin', 'x'];
  const types: ConnectionType[] = ['direct', 'adjacent', 'cultural'];
  const seeds = [
    'best CRM 2026',
    `${brand.competitors[0] ?? 'HubSpot'} alternatives`,
    'sales pipeline frustration',
    'startup scaling chaos',
    'spreadsheet CRM horror story',
    'enterprise software is ugly',
  ];
  return seeds.flatMap((s, i) => [
    {
      query: s,
      platform: platforms[i % 3],
      connectionType: types[i % 3],
      topicId: gaps[i % gaps.length]?.topicId ?? '',
    },
  ]);
}

function mockScored(
  results: Array<TavilyResult & { platform: Platform; topicId: string; topicName: string; topicVisibility: number }>,
): ScoredResult[] {
  return results.map((r) => {
    const score = Math.round(60 + Math.random() * 35);
    const lift = Number(((100 - r.topicVisibility) * (score / 100) * 0.04).toFixed(1));
    const types: ConnectionType[] = ['direct', 'adjacent', 'cultural'];
    const connectionType = types[Math.floor(Math.random() * 3)];
    return {
      url: r.url,
      relevanceScore: score,
      connectionType,
      peecInsight: `You are invisible for "${r.topicName}" (${r.topicVisibility}%). This ${r.platform} post directly relates.`,
      estimatedVisibilityLift: lift,
      suggestedAngle: `Lead with a specific, non-promotional point about ${r.topicName.toLowerCase()}.`,
    };
  });
}

function mockVoice(brandName: string): VoiceProfile {
  return {
    summary: `${brandName} is witty, anti-enterprise, and builder-first. Plain language, never corporate.`,
    traits: ['witty', 'direct', 'opinionated', 'modern', 'design-led'],
    toneSpectrum: { formality: 28, technicality: 55, boldness: 75, humor: 60, warmth: 50 },
    signaturePhrases: [
      'CRM that feels like the rest of your stack',
      'designed in this decade',
      'no admin required',
      'built for the next generation of teams',
    ],
    taboos: [
      'never say "synergy", "leverage", or "robust"',
      'never use enterprise jargon ("solution", "stakeholder")',
      'never sound like Salesforce',
    ],
    engagementStyle:
      'Helpful first, opinionated second. Drops a specific, builder-flavored take. Mentions the brand only when it directly answers the question.',
    brandContextSummary:
      'Modern, design-led CRM positioned against Salesforce/HubSpot. Used by Modal, Replicate, Vercel, Granola. Strength: speed of setup, customizable data model, modern UI. Pricing transparent and developer-friendly.',
  };
}

function mockDraft(
  opp: Pick<ConversationOpportunity, 'platform' | 'title' | 'content' | 'connectionType' | 'peecInsight'>,
  angle: string,
): DraftScaffold {
  const opener =
    opp.platform === 'reddit'
      ? "Honest take from someone who's switched twice — "
      : opp.platform === 'linkedin'
        ? "I've watched a hundred founders walk this path."
        : 'Hot take:';
  return {
    opener,
    angle,
    supporting:
      'Most teams don\'t actually need a "CRM" — they need a flexible data layer their workflow already lives on top of.',
    cta:
      opp.platform === 'reddit'
        ? 'Happy to share what we ended up doing if useful.'
        : opp.platform === 'linkedin'
          ? "Curious how others have handled this — what did you pick?"
          : 'No DMs. The market will sort it.',
    alternates: {
      bolder: 'The duopoly is over. Anyone still buying Salesforce in 2026 is buying contractual lock-in, not software.',
      technical:
        'Worth asking: does your stack need a CRM, or a typed data model with views? The latter is where Attio sits.',
      shorter: 'Skip the demo cycle. Spin up Attio in 20 minutes. Decide on your own data.',
    },
  };
}

function mockTrends(gaps: VisibilityGap[]): Trend[] {
  return gaps.slice(0, 4).map((g, i) => ({
    id: `t${i}`,
    title: [
      'Founders rage-quitting Salesforce after Series A',
      '"Vibe-coding" your CRM in Lovable / Cursor',
      'The post-Apollo "data layer" thesis',
      'Anti-enterprise design as a buying signal',
    ][i],
    description: [
      'Surge of founders posting about migrating off Salesforce in the 6 months post-funding. Hits CRM Automation gap.',
      'Builders publicly building tiny CRMs in Lovable. Attention-rich, signals appetite for modern tools.',
      'New thesis on RevOps stack: replace 5 SaaS with one composable data layer.',
      'Design-led tools winning share against Oracle/Salesforce. AI engines are starting to recommend on aesthetic.',
    ][i],
    surface: i % 2 === 0 ? 'niche' : 'world',
    relatedTopicId: g.topicId,
    expectedLiftPp: Number(((100 - g.visibility) * 0.05).toFixed(1)),
    evidence: ['https://www.reddit.com/r/startups/comments/xyz', 'https://x.com/founder/status/1234'],
  }));
}
