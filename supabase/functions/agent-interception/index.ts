// agent-interception — port of src/agents/interception.ts to a Supabase Deno
// edge function. End-to-end pipeline:
//
//   brand_id
//     → topics + latest visibility_runs (weak topics: visibility < 50%)
//     → Gemini generates 3-5 search queries per weak topic
//     → Tavily Search (advanced, time_range='week', reddit/linkedin/editorial)
//     → dedupe by URL, drop anything older than 14d
//     → Gemini scores each candidate (relevance, sentiment, lift)
//     → for the top N: embed the candidate, pgvector cosine top-3 chunks,
//       Gemini drafts opener/angle/supporting/cta grounded in those chunks
//     → insert tasks(kind='opportunity') + drafts(context_chunk_ids)
//     → trace the run on agent_runs
//
// Requires env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY,
// TAVILY_API_KEY.

import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

// ─────────────────────────────────────────────────────────────────────────────
// Env + clients
// ─────────────────────────────────────────────────────────────────────────────

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY') ?? '';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_GEN_MODEL = 'gemini-2.5-flash';
const GEMINI_EMBED_MODEL = 'text-embedding-004';
const TAVILY_BASE = 'https://api.tavily.com';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Platform = 'reddit' | 'linkedin' | 'editorial';
type ConnectionType = 'direct' | 'adjacent' | 'cultural';

interface BrandRow {
  id: string;
  name: string;
  domain: string;
  voice_profile: VoiceProfile | null;
}

interface VoiceProfile {
  summary?: string;
  traits?: string[];
  toneSpectrum?: { formality: number; technicality: number; boldness: number; humor: number; warmth: number };
  signaturePhrases?: string[];
  taboos?: string[];
  engagementStyle?: string;
  brandContextSummary?: string;
}

interface TopicRow {
  id: string;
  brand_id: string;
  peec_topic_id: string | null;
  name: string;
}

interface VisibilityRunRow {
  topic_id: string | null;
  visibility: number | null;
  ran_at: string;
}

interface WeakTopic {
  topicId: string;
  topicName: string;
  visibility: number;
}

interface GeneratedQuery {
  query: string;
  platform: Platform;
  connectionType: ConnectionType;
  topicId: string;
}

interface TavilyResult {
  url: string;
  title: string;
  content: string;
  score?: number;
  published_date?: string;
  raw_content?: string;
}

interface EnrichedResult extends TavilyResult {
  query: string;
  platform: Platform;
  connectionType: ConnectionType;
  topicId: string;
  topicName: string;
  topicVisibility: number;
}

interface ScoredResult {
  url: string;
  relevanceScore: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  connectionType: ConnectionType;
  estimatedVisibilityLift: number;
  peecInsight: string;
  suggestedAngle: string;
}

interface DraftScaffold {
  opener: string;
  angle: string;
  supporting: string;
  cta: string;
  alternates?: { bolder?: string; technical?: string; shorter?: string };
}

interface ContextChunk {
  id: string;
  text: string;
  source_url: string;
  source_type: string | null;
  embedding: string; // pgvector text repr "[0.1,0.2,...]"
}

interface RetrievedChunk {
  id: string;
  text: string;
  source_url: string;
  source_type: string | null;
  similarity: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Trace
// ─────────────────────────────────────────────────────────────────────────────

interface TraceStep {
  at: string;
  step: string;
  data?: unknown;
}

class Trace {
  private supabase: SupabaseClient;
  private runId: string;
  steps: TraceStep[] = [];

  constructor(supabase: SupabaseClient, runId: string) {
    this.supabase = supabase;
    this.runId = runId;
  }

  async push(step: string, data?: unknown): Promise<void> {
    const entry: TraceStep = { at: new Date().toISOString(), step, data };
    this.steps.push(entry);
    console.log('[trace]', step, data ?? '');
    await this.supabase
      .from('agent_runs')
      .update({ trace: this.steps })
      .eq('id', this.runId);
  }

  async finish(status: 'done' | 'error', extra?: Record<string, unknown>): Promise<void> {
    if (extra) this.steps.push({ at: new Date().toISOString(), step: status, data: extra });
    await this.supabase
      .from('agent_runs')
      .update({
        status,
        trace: this.steps,
        finished_at: new Date().toISOString(),
      })
      .eq('id', this.runId);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini helpers
// ─────────────────────────────────────────────────────────────────────────────

async function geminiJson<T>(prompt: string, fallback: T, system?: string): Promise<T> {
  if (!GEMINI_API_KEY) return fallback;
  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
    generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
  };
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `${GEMINI_BASE}/models/${GEMINI_GEN_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      );
      if (res.status === 429) {
        await sleep(800 * 2 ** attempt);
        continue;
      }
      if (!res.ok) {
        console.warn('gemini', res.status, await res.text());
        return fallback;
      }
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.[0]?.text as string | undefined;
      if (!text) return fallback;
      const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      console.warn('gemini error', err);
      if (attempt === 2) return fallback;
      await sleep(500 * 2 ** attempt);
    }
  }
  return fallback;
}

async function geminiEmbed(text: string): Promise<number[] | null> {
  if (!GEMINI_API_KEY) return null;
  try {
    const res = await fetch(
      `${GEMINI_BASE}/models/${GEMINI_EMBED_MODEL}:embedContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: `models/${GEMINI_EMBED_MODEL}`,
          content: { parts: [{ text: text.slice(0, 8000) }] },
        }),
      },
    );
    if (!res.ok) {
      console.warn('embed', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const values = json?.embedding?.values;
    return Array.isArray(values) && values.length === 768 ? values : null;
  } catch (err) {
    console.warn('embed err', err);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────────────────────
// Tavily
// ─────────────────────────────────────────────────────────────────────────────

const PLATFORM_DOMAINS: Record<Platform, string[] | undefined> = {
  reddit: ['reddit.com'],
  linkedin: ['linkedin.com'],
  editorial: undefined, // open web — TechCrunch, Verge, blogs, etc.
};

async function tavilySearch(
  query: string,
  platform: Platform,
): Promise<TavilyResult[]> {
  if (!TAVILY_API_KEY) return [];
  try {
    const body: Record<string, unknown> = {
      api_key: TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 8,
      time_range: 'week',
      include_raw_content: false,
    };
    const includeDomains = PLATFORM_DOMAINS[platform];
    if (includeDomains) body.include_domains = includeDomains;
    const res = await fetch(`${TAVILY_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.warn('tavily', res.status, await res.text());
      return [];
    }
    const data = await res.json();
    return (data.results ?? []) as TavilyResult[];
  } catch (err) {
    console.warn('tavily err', err);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Vector helpers
// ─────────────────────────────────────────────────────────────────────────────

function parsePgVector(s: string | number[]): number[] {
  if (Array.isArray(s)) return s;
  if (typeof s !== 'string') return [];
  const trimmed = s.trim();
  const inner = trimmed.startsWith('[') ? trimmed.slice(1, -1) : trimmed;
  if (!inner) return [];
  return inner.split(',').map((x) => Number(x));
}

function cosine(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  return denom === 0 ? 0 : dot / denom;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pipeline pieces
// ─────────────────────────────────────────────────────────────────────────────

async function fetchBrand(supabase: SupabaseClient, brandId: string): Promise<BrandRow> {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, domain, voice_profile')
    .eq('id', brandId)
    .single();
  if (error || !data) throw new Error(`Brand not found: ${brandId} (${error?.message})`);
  return data as BrandRow;
}

async function fetchWeakTopics(
  supabase: SupabaseClient,
  brandId: string,
): Promise<WeakTopic[]> {
  const { data: topics, error: tErr } = await supabase
    .from('topics')
    .select('id, name')
    .eq('brand_id', brandId);
  if (tErr) throw new Error(`topics: ${tErr.message}`);
  if (!topics?.length) return [];

  const { data: runs, error: rErr } = await supabase
    .from('visibility_runs')
    .select('topic_id, visibility, ran_at')
    .eq('brand_id', brandId)
    .order('ran_at', { ascending: false })
    .limit(200);
  if (rErr) throw new Error(`visibility_runs: ${rErr.message}`);

  // Latest run per topic.
  const latest = new Map<string, VisibilityRunRow>();
  for (const r of (runs ?? []) as VisibilityRunRow[]) {
    if (!r.topic_id) continue;
    if (!latest.has(r.topic_id)) latest.set(r.topic_id, r);
  }

  const weak: WeakTopic[] = [];
  for (const t of topics as TopicRow[]) {
    const run = latest.get(t.id);
    const v = run?.visibility != null ? Number(run.visibility) : null;
    // Treat "no run yet" as a weak topic too — we should agitate for it.
    if (v == null || v < 50) {
      weak.push({ topicId: t.id, topicName: t.name, visibility: v ?? 0 });
    }
  }
  weak.sort((a, b) => a.visibility - b.visibility);
  return weak.slice(0, 4);
}

async function generateQueries(
  brand: BrandRow,
  weak: WeakTopic[],
): Promise<GeneratedQuery[]> {
  if (!weak.length) return [];
  const prompt = `Brand: ${brand.name} (${brand.domain})
Weak Peec topics (where the brand is invisible to AI search):
${weak.map((w) => `- ${w.topicName} [topicId=${w.topicId}] @ ${w.visibility}%`).join('\n')}

Generate 3-5 search queries PER weak topic to find recent (last 7 days) live conversations on Reddit, LinkedIn, or editorial blogs/news where ${brand.name} could authentically engage. Total queries: 12-20.

Each query should be a real search string (not the topic name verbatim). Distribute across:
- DIRECT: explicit mentions of the topic, competitors, or category
- ADJACENT: related pain points, workflows, or frustrations
- CULTURAL: broader founder/scaling/anti-incumbent themes that map to the topic

For each query pick ONE platform: "reddit" | "linkedin" | "editorial".

Return strict JSON:
{"queries":[{"query":"...","platform":"reddit","connectionType":"direct","topicId":"<topicId from above>"}]}`;

  const out = await geminiJson<{ queries: GeneratedQuery[] }>(prompt, { queries: [] });
  // Filter to only queries whose topicId we recognize.
  const known = new Set(weak.map((w) => w.topicId));
  return (out.queries ?? []).filter(
    (q) => q.query && known.has(q.topicId) && ['reddit', 'linkedin', 'editorial'].includes(q.platform),
  );
}

async function discover(
  queries: GeneratedQuery[],
  weakById: Map<string, WeakTopic>,
  trace: Trace,
): Promise<{ enriched: EnrichedResult[]; flagged: boolean }> {
  const seen = new Set<string>();
  const enriched: EnrichedResult[] = [];
  let consecutiveEmpty = 0;
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;

  for (const q of queries) {
    const results = await tavilySearch(q.query, q.platform);
    if (results.length === 0) {
      consecutiveEmpty += 1;
      await trace.push('tavily.empty', { query: q.query, platform: q.platform, consecutiveEmpty });
      if (consecutiveEmpty > 3) {
        return { enriched, flagged: true };
      }
      continue;
    }
    consecutiveEmpty = 0;
    const weak = weakById.get(q.topicId);
    for (const r of results) {
      if (!r.url || seen.has(r.url)) continue;
      if (r.published_date) {
        const t = Date.parse(r.published_date);
        if (Number.isFinite(t) && t < cutoff) continue;
      }
      seen.add(r.url);
      enriched.push({
        ...r,
        query: q.query,
        platform: q.platform,
        connectionType: q.connectionType,
        topicId: q.topicId,
        topicName: weak?.topicName ?? 'Unknown',
        topicVisibility: weak?.visibility ?? 0,
      });
    }
  }
  return { enriched, flagged: false };
}

async function scoreCandidates(
  brand: BrandRow,
  candidates: EnrichedResult[],
): Promise<Map<string, ScoredResult>> {
  if (!candidates.length) return new Map();
  // Cap input size — Gemini context budget + JSON-output stability.
  const subset = candidates.slice(0, 30);
  const prompt = `You are scoring posts for ${brand.name} (${brand.domain}).

For each post return:
- url (echo back)
- relevanceScore (0-100): how worth engaging. 70+ means clearly on-topic AND sounds like an active conversation.
- sentiment: "positive" | "neutral" | "negative" — tone toward the topic/category
- connectionType: "direct" | "adjacent" | "cultural"
- estimatedVisibilityLift (number, percentage points): use lift = clamp((100 - topicVisibility) * relevanceScore / 100 * 0.04, 0.4, 6) and round to 1 decimal.
- peecInsight: one sentence connecting the post to the brand's topic gap (cite topic name + visibility%).
- suggestedAngle: 1-line pitch on how to engage (NOT the actual reply).

Posts:
${subset
  .map(
    (r, i) =>
      `${i + 1}. [${r.platform}] (${r.topicName} @ ${r.topicVisibility}%) ${r.title}
   url: ${r.url}
   ${r.content.slice(0, 280)}`,
  )
  .join('\n')}

Return strict JSON: {"scored":[{"url":"...","relevanceScore":85,"sentiment":"neutral","connectionType":"direct","estimatedVisibilityLift":2.4,"peecInsight":"...","suggestedAngle":"..."}]}`;

  const out = await geminiJson<{ scored: ScoredResult[] }>(prompt, { scored: [] });
  const m = new Map<string, ScoredResult>();
  for (const s of out.scored ?? []) {
    if (s?.url) m.set(s.url, s);
  }
  return m;
}

async function retrieveContext(
  supabase: SupabaseClient,
  brandId: string,
  queryEmbedding: number[],
  topK = 3,
): Promise<RetrievedChunk[]> {
  const { data, error } = await supabase
    .from('context_chunks')
    .select('id, text, source_url, source_type, embedding')
    .eq('brand_id', brandId)
    .not('embedding', 'is', null)
    .limit(200);
  if (error) {
    console.warn('chunks fetch', error.message);
    return [];
  }
  const ranked: RetrievedChunk[] = [];
  for (const c of (data ?? []) as ContextChunk[]) {
    const v = parsePgVector(c.embedding);
    if (v.length !== queryEmbedding.length) continue;
    const sim = cosine(queryEmbedding, v);
    ranked.push({
      id: c.id,
      text: c.text,
      source_url: c.source_url,
      source_type: c.source_type,
      similarity: sim,
    });
  }
  ranked.sort((a, b) => b.similarity - a.similarity);
  return ranked.slice(0, topK);
}

function buildSystemPrompt(brand: BrandRow): string {
  const v = brand.voice_profile ?? {};
  const tone = v.toneSpectrum ?? { formality: 50, technicality: 50, boldness: 50, humor: 30, warmth: 50 };
  return `You are writing as ${brand.name} (${brand.domain}).
Voice summary: ${v.summary ?? 'distinctive, modern, substance-first'}
Traits: ${(v.traits ?? []).join(', ')}
Tone — formality ${tone.formality}, technicality ${tone.technicality}, boldness ${tone.boldness}, humor ${tone.humor}, warmth ${tone.warmth} (0-100 each).
Signature phrases (use sparingly): ${(v.signaturePhrases ?? []).join(' | ')}
Taboos: ${(v.taboos ?? []).join(' | ')}
Engagement style: ${v.engagementStyle ?? 'helpful, specific, never sales-y'}
Brand context (positioning, products, proof): ${v.brandContextSummary ?? ''}

You produce DRAFT SCAFFOLDS, not press-send messages. The human will edit before posting.
Lead with substance. Avoid AI-tells: no "I think", no "great point!", no rhetorical questions.`;
}

const PLATFORM_RULES: Record<Platform, string> = {
  linkedin: 'Professional but human, 2-4 sentences, value-first, never hashtag-spammy. First-person.',
  reddit: 'Match subreddit tone. Helpful first. Mention the brand naturally alongside alternatives. Be transparent if affiliated.',
  editorial: 'Comment-section style or quote-worthy take. 2-3 sentences. Specific, citable, not promotional.',
};

async function draftReply(
  brand: BrandRow,
  candidate: EnrichedResult,
  scored: ScoredResult,
  chunks: RetrievedChunk[],
): Promise<DraftScaffold> {
  const fallback: DraftScaffold = {
    opener: '',
    angle: scored.suggestedAngle ?? '',
    supporting: '',
    cta: '',
  };
  const prompt = `A ${candidate.platform} post:
"""
${candidate.title}
${candidate.content.slice(0, 600)}
"""

Topic gap: ${candidate.topicName} @ ${candidate.topicVisibility}% Peec visibility.
Connection: ${candidate.connectionType}
Peec insight: ${scored.peecInsight}
Angle to take: ${scored.suggestedAngle}

Brand context chunks (ground every claim in these — do not invent specifics):
${chunks.map((c, i) => `[${i + 1}] (${c.source_type ?? 'web'}) ${c.text}`).join('\n')}

Platform rules: ${PLATFORM_RULES[candidate.platform]}

Draft a SCAFFOLD (not a finished message). Each field grounds in the chunks above.
Return strict JSON:
{
  "opener": "first 1-2 sentences",
  "angle": "the substantive middle (1-3 sentences)",
  "supporting": "specific proof/example drawn from a chunk (1 sentence)",
  "cta": "soft close — never salesy",
  "alternates": {"bolder":"...","technical":"...","shorter":"..."}
}`;
  return await geminiJson<DraftScaffold>(prompt, fallback, buildSystemPrompt(brand));
}

function platformDomain(url: string, platform: Platform): string {
  try {
    return new URL(url).hostname;
  } catch {
    return platform;
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main pipeline
// ─────────────────────────────────────────────────────────────────────────────

async function runInterception(
  supabase: SupabaseClient,
  brandId: string,
): Promise<{ ok: true; runId: string; tasksInserted: number; flagged?: boolean } | { ok: false; runId: string; error: string }> {
  // 1. Open agent_runs row.
  const { data: runRow, error: runErr } = await supabase
    .from('agent_runs')
    .insert({ brand_id: brandId, agent_kind: 'interception', status: 'running', trace: [] })
    .select('id')
    .single();
  if (runErr || !runRow) throw new Error(`agent_runs insert: ${runErr?.message}`);
  const runId = runRow.id as string;
  const trace = new Trace(supabase, runId);

  try {
    await trace.push('start', { brand_id: brandId });

    // 2. Brand + weak topics.
    const brand = await fetchBrand(supabase, brandId);
    const weak = await fetchWeakTopics(supabase, brandId);
    await trace.push('weak_topics', weak);
    if (weak.length === 0) {
      await trace.finish('done', { tasksInserted: 0, note: 'no weak topics' });
      return { ok: true, runId, tasksInserted: 0 };
    }
    const weakById = new Map(weak.map((w) => [w.topicId, w]));

    // 3. Query gen.
    const queries = await generateQueries(brand, weak);
    await trace.push('queries', { count: queries.length, sample: queries.slice(0, 4) });
    if (queries.length === 0) {
      await trace.finish('done', { tasksInserted: 0, note: 'no queries generated' });
      return { ok: true, runId, tasksInserted: 0 };
    }

    // 4. Tavily multi.
    const { enriched, flagged } = await discover(queries, weakById, trace);
    await trace.push('discovery', { candidates: enriched.length, flagged });
    if (flagged) {
      await trace.finish('error', { note: 'tavily empty for >3 consecutive queries' });
      return { ok: false, runId, error: 'tavily_empty_streak' };
    }
    if (enriched.length === 0) {
      await trace.finish('done', { tasksInserted: 0, note: 'no candidates' });
      return { ok: true, runId, tasksInserted: 0 };
    }

    // 5. Score.
    const scored = await scoreCandidates(brand, enriched);
    await trace.push('scored', { scored: scored.size });

    // 6. Compose top N candidates (relevance >= 60), best-first.
    const composed = enriched
      .map((r) => {
        const s = scored.get(r.url);
        const relevance = s?.relevanceScore ?? Math.round((r.score ?? 0.7) * 100);
        const lift = s?.estimatedVisibilityLift
          ?? Number(clamp((100 - r.topicVisibility) * (relevance / 100) * 0.04, 0.4, 6).toFixed(1));
        return { r, s, relevance, lift };
      })
      .filter((c) => c.relevance >= 60)
      .sort((a, b) => b.relevance * b.lift - a.relevance * a.lift)
      .slice(0, 12);
    await trace.push('top_candidates', { count: composed.length });

    // 7. For each top candidate: embed → retrieve → draft → insert.
    let inserted = 0;
    for (const { r, s, relevance, lift } of composed) {
      const embedText = `${r.title}\n${r.content}`;
      const qEmbed = await geminiEmbed(embedText);
      const chunks = qEmbed ? await retrieveContext(supabase, brandId, qEmbed, 3) : [];
      const peecInsight =
        s?.peecInsight
        ?? `Invisible for "${r.topicName}" (${r.topicVisibility}%). This ${r.platform} post directly relates.`;
      const draft = await draftReply(brand, r, s ?? {
        url: r.url,
        relevanceScore: relevance,
        sentiment: 'neutral',
        connectionType: r.connectionType,
        estimatedVisibilityLift: lift,
        peecInsight,
        suggestedAngle: '',
      }, chunks);

      const summary = peecInsight;
      const { data: taskRow, error: taskErr } = await supabase
        .from('tasks')
        .insert({
          brand_id: brandId,
          agent_run_id: runId,
          kind: 'opportunity',
          status: 'open',
          title: r.title,
          summary,
          source_url: r.url,
          source_domain: platformDomain(r.url, r.platform),
          platform: r.platform,
          related_topic_id: r.topicId,
          estimated_lift: lift,
          score: relevance,
          raw: {
            query: r.query,
            published_date: r.published_date ?? null,
            connection_type: r.connectionType,
            sentiment: s?.sentiment ?? 'neutral',
            content: r.content,
            suggested_angle: s?.suggestedAngle ?? null,
          },
        })
        .select('id')
        .single();
      if (taskErr || !taskRow) {
        console.warn('task insert failed', taskErr?.message);
        continue;
      }

      const { error: draftErr } = await supabase.from('drafts').insert({
        task_id: taskRow.id,
        opener: draft.opener ?? '',
        angle: draft.angle ?? '',
        supporting: draft.supporting ?? '',
        cta: draft.cta ?? '',
        alternates: draft.alternates ?? {},
        context_chunk_ids: chunks.map((c) => c.id),
        status: 'draft',
      });
      if (draftErr) {
        console.warn('draft insert failed', draftErr.message);
      }
      inserted += 1;
    }
    await trace.push('inserted', { tasks: inserted });
    await trace.finish('done', { tasksInserted: inserted });
    return { ok: true, runId, tasksInserted: inserted };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('interception error', err);
    await trace.finish('error', { error: msg });
    return { ok: false, runId, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP handler
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: 'missing_supabase_env' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { brand_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const brandId = body.brand_id;
  if (!brandId) {
    return new Response(JSON.stringify({ error: 'brand_id_required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const result = await runInterception(supabase, brandId);
  return new Response(JSON.stringify(result), {
    status: 'ok' in result && result.ok ? 200 : 500,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
