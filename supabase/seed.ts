/**
 * SWARM v3 — idempotent demo seed.
 *
 * Seeds the Attio demo brand from src/data/snapshot.json + src/data/attio-curated.json:
 *   • brand row (deterministic UUID so reruns overwrite cleanly)
 *   • 5 topics                  (from snapshot.peec.topics)
 *   • 5 visibility_runs         (Attio's own brandByTopic snapshot)
 *   • 12 tasks (kind=opportunity) from attio-curated.opportunities
 *   • 8 ATTIO context_chunks    (curated; embedded via Gemini text-embedding-004)
 *
 * Run:   tsx supabase/seed.ts
 * Needs: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY (or VITE_GEMINI_API_KEY).
 *
 * Idempotency: clears the demo brand by id (cascade), then re-inserts.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const dataPath = (rel: string) => resolve(ROOT, 'src/data', rel);

// --- env -------------------------------------------------------------------

const SUPABASE_URL = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '';
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY ?? '';

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY (or VITE_GEMINI_API_KEY)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- deterministic IDs -----------------------------------------------------

const BRAND_ID = '11111111-1111-4111-8111-000000000001';

// Stable UUID derived from a peec topic id, so reruns reuse rows.
function topicUuid(peecTopicId: string): string {
  // FNV-1a over the input, expanded across 16 bytes deterministically.
  const bytes = new Uint8Array(16);
  let h = 0x811c9dc5;
  for (const ch of peecTopicId) {
    h ^= ch.charCodeAt(0);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  for (let i = 0; i < 16; i++) {
    h ^= h << 13; h >>>= 0;
    h ^= h >> 17; h >>>= 0;
    h ^= h << 5;  h >>>= 0;
    bytes[i] = h & 0xff;
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// --- fixtures --------------------------------------------------------------

type Snapshot = {
  peec: {
    projectId: string;
    ownBrandId: string;
    brands: { id: string; name: string; domains: string[]; is_own: boolean }[];
    topics: { id: string; name: string }[];
    brandByTopic: Record<string, { topicId: string; visibility: number; shareOfVoice: number; sentiment: number }[]>;
  };
  gemini: { voice: unknown };
};

type Curated = {
  _meta: { brand: string; brandId: string };
  opportunities: {
    id: string;
    platform: 'linkedin' | 'reddit' | 'x';
    url: string;
    title: string;
    content: string;
    author: string;
    publishedAt: string;
    relevanceScore: number;
    connectionType: 'direct' | 'adjacent' | 'cultural';
    relatedTopicId: string;
    peecInsight: string;
    estimatedVisibilityLift: number;
    draftScaffold: {
      opener: string;
      angle: string;
      supporting: string;
      cta: string;
      alternates: { bolder: string; technical: string; shorter: string };
    };
  }[];
};

const snapshot: Snapshot = JSON.parse(readFileSync(dataPath('snapshot.json'), 'utf8'));
const curated: Curated = JSON.parse(readFileSync(dataPath('attio-curated.json'), 'utf8'));

// 8 hand-curated Attio context chunks.
// Drawn from the public site, founder posts, and the snapshot voice profile.
const ATTIO_CHUNKS: Array<{ source_url: string; source_type: string; text: string; topicHints: string[] }> = [
  {
    source_url: 'https://attio.com',
    source_type: 'homepage',
    text:
      "Attio is the AI-native CRM teams actually love using. Powerful, flexible, and modern — built for the next generation of GTM teams. " +
      "Connect Gmail and Calendar in one click, define your own data model, and ship workflows in minutes instead of months.",
    topicHints: ['CRM Automation', 'AI in Sales'],
  },
  {
    source_url: 'https://attio.com/customers/modal',
    source_type: 'case_study',
    text:
      "Modal runs its entire GTM motion on Attio. The team replaced a Notion + spreadsheet stack with typed objects, custom views, and " +
      "automated enrichment. Result: a single source of truth shared by sales, success, and engineering — set up in under two weeks.",
    topicHints: ['Revenue Operations', 'Data Integration'],
  },
  {
    source_url: 'https://attio.com/customers/replicate',
    source_type: 'case_study',
    text:
      "Replicate's GTM team uses Attio as the substrate for product-led growth. Self-serve usage signals from the product flow into Attio, " +
      "and reps see a live PLG view of which accounts are hot. No data engineering ticket required.",
    topicHints: ['Product-Led Growth', 'Data Integration'],
  },
  {
    source_url: 'https://attio.com/blog/the-modern-crm',
    source_type: 'blog',
    text:
      "Legacy CRMs were designed for sales ops admins. Modern teams configure their CRM in an afternoon, not in a six-month implementation. " +
      "Attio's bet: make the data model first-class, ship the UI on top, and trust founders to set it up themselves.",
    topicHints: ['CRM Automation'],
  },
  {
    source_url: 'https://attio.com/blog/series-a-revops-stack',
    source_type: 'blog',
    text:
      "The Series A RevOps stack is breaking. Founders are duct-taping HubSpot, Pipedrive, Notion, and four spreadsheets. The fix is a " +
      "shared data layer that Marketing, Sales, and CS can all write into — typed objects, real relationships, write access for the whole org.",
    topicHints: ['Revenue Operations'],
  },
  {
    source_url: 'https://attio.com/pricing',
    source_type: 'homepage',
    text:
      "Transparent pricing. A 12-rep team on Attio lands closer to $9–12k/yr — fraction of HubSpot Sales Hub Pro at the same scale. No " +
      "Solutions Architect, no three-year contract, no procurement loop. Free tier is real.",
    topicHints: ['CRM Automation'],
  },
  {
    source_url: 'https://attio.com/ai',
    source_type: 'homepage',
    text:
      "AI in Attio is built on a typed substrate. Agents reason over real relationships, not a half-curated text dump. Clay, Lindy, and " +
      "custom agents plug in via the API and write back clean data — because the schema is clean to begin with.",
    topicHints: ['AI in Sales', 'CRM Automation'],
  },
  {
    source_url: 'https://www.linkedin.com/in/nicolasdessaigne',
    source_type: 'founder_post',
    text:
      "Founder note: the CRM you pick on day 1 of Series A is the most expensive sentimental decision you'll make before Series B. Pick the " +
      "data model first, the CRM second. The rep you'll hire to run it can ship inside whatever you choose.",
    topicHints: ['Revenue Operations'],
  },
];

// --- gemini embed ----------------------------------------------------------

async function embed(text: string): Promise<number[]> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embed failed: ${res.status} ${body}`);
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Gemini embed returned unexpected shape (len=${values?.length ?? 'undefined'})`);
  }
  return values;
}

// --- helpers ---------------------------------------------------------------

function pgVector(values: number[]): string {
  return `[${values.join(',')}]`;
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

// --- main ------------------------------------------------------------------

async function main() {
  console.log('SWARM seed → Attio demo brand');

  // Step 1: clear by brand id (cascade clears children).
  console.log('  clearing existing demo brand…');
  const { error: delErr } = await supabase.from('brands').delete().eq('id', BRAND_ID);
  if (delErr) throw delErr;

  // Step 2: insert brand.
  const ownPeec = snapshot.peec.brands.find((b) => b.is_own);
  if (!ownPeec) throw new Error('snapshot.peec.brands has no is_own brand');
  console.log('  inserting brand…');
  {
    const { error } = await supabase.from('brands').insert({
      id: BRAND_ID,
      owner_id: null,
      name: ownPeec.name,
      domain: ownPeec.domains[0],
      peec_brand_id: ownPeec.id,
      peec_project_id: snapshot.peec.projectId,
      voice_profile: snapshot.gemini.voice,
      seed_urls: ['https://attio.com', 'https://attio.com/blog', 'https://attio.com/customers'],
    });
    if (error) throw error;
  }

  // Step 3: insert topics.
  console.log(`  inserting ${snapshot.peec.topics.length} topics…`);
  const topicRows = snapshot.peec.topics.map((t) => ({
    id: topicUuid(t.id),
    brand_id: BRAND_ID,
    peec_topic_id: t.id,
    name: t.name,
  }));
  {
    const { error } = await supabase.from('topics').insert(topicRows);
    if (error) throw error;
  }

  // Step 4: visibility_runs (Attio's own brandByTopic).
  const ownByTopic = snapshot.peec.brandByTopic[ownPeec.id] ?? [];
  console.log(`  inserting ${ownByTopic.length} visibility_runs…`);
  if (ownByTopic.length > 0) {
    const rows = ownByTopic.map((t) => ({
      brand_id: BRAND_ID,
      topic_id: topicUuid(t.topicId),
      visibility: t.visibility,
      share_of_voice: t.shareOfVoice,
      sentiment: t.sentiment,
    }));
    const { error } = await supabase.from('visibility_runs').insert(rows);
    if (error) throw error;
  }

  // Step 5: 12 tasks (kind=opportunity).
  console.log(`  inserting ${curated.opportunities.length} tasks…`);
  const taskRows = curated.opportunities.map((op) => ({
    brand_id: BRAND_ID,
    agent_run_id: null,
    kind: 'opportunity' as const,
    status: 'open',
    title: op.title,
    summary: op.peecInsight,
    source_url: op.url,
    source_domain: domainFromUrl(op.url),
    platform: op.platform,
    related_topic_id: topicUuid(op.relatedTopicId),
    estimated_lift: op.estimatedVisibilityLift,
    score: op.relevanceScore,
    raw: {
      curated_id: op.id,
      author: op.author,
      published_at: op.publishedAt,
      content: op.content,
      connection_type: op.connectionType,
      draft_scaffold: op.draftScaffold,
    },
  }));
  const { data: insertedTasks, error: taskErr } = await supabase
    .from('tasks')
    .insert(taskRows)
    .select('id, raw');
  if (taskErr) throw taskErr;

  // Step 6: drafts pre-populated from the curated draftScaffold (so the demo never
  // depends on a live Gemini call). context_chunk_ids attached after embedding below.
  console.log(`  inserting ${insertedTasks?.length ?? 0} drafts…`);
  const draftRows = (insertedTasks ?? []).map((t) => {
    const scaffold = (t.raw as { draft_scaffold: Curated['opportunities'][number]['draftScaffold'] }).draft_scaffold;
    return {
      task_id: t.id,
      opener: scaffold.opener,
      angle: scaffold.angle,
      supporting: scaffold.supporting,
      cta: scaffold.cta,
      alternates: scaffold.alternates,
      context_chunk_ids: [] as string[],
      status: 'draft',
    };
  });
  if (draftRows.length > 0) {
    const { error } = await supabase.from('drafts').insert(draftRows);
    if (error) throw error;
  }

  // Step 7: 8 ATTIO context_chunks with Gemini embeddings.
  console.log('  embedding 8 ATTIO context chunks via Gemini…');
  const embedded: Array<{ id?: string; row: Record<string, unknown> }> = [];
  for (const chunk of ATTIO_CHUNKS) {
    const vec = await embed(chunk.text);
    const topicIds = snapshot.peec.topics
      .filter((t) => chunk.topicHints.includes(t.name))
      .map((t) => topicUuid(t.id));
    embedded.push({
      row: {
        brand_id: BRAND_ID,
        source_url: chunk.source_url,
        source_type: chunk.source_type,
        text: chunk.text,
        topic_ids: topicIds,
        embedding: pgVector(vec),
        is_likely_outdated: false,
      },
    });
  }
  const { error: chunkErr } = await supabase
    .from('context_chunks')
    .insert(embedded.map((e) => e.row));
  if (chunkErr) throw chunkErr;

  console.log('SWARM seed → done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
