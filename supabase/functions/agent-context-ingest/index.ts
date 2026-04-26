// SWARM v3 — agent-context-ingest edge function.
//
// Pipeline: Tavily Extract → sentence-aware chunking → Gemini embed (768d)
// → upsert context_chunks. Also derives brands.voice_profile from the first
// few chunks of each URL via Gemini.
//
// Streams progress through agent_runs.trace so the frontend can subscribe.
//
// Invoke:
//   POST /functions/v1/agent-context-ingest
//   { brand_id: uuid, seed_urls: string[] }

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY') ?? '';
const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'POST, OPTIONS',
};

// --- env guard -------------------------------------------------------------

function assertEnv() {
  const missing: string[] = [];
  if (!SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!SERVICE_ROLE) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!TAVILY_API_KEY) missing.push('TAVILY_API_KEY');
  if (!GEMINI_API_KEY) missing.push('GEMINI_API_KEY');
  if (missing.length > 0) {
    throw new Error(`Missing env: ${missing.join(', ')}`);
  }
}

// --- source_type guesser ---------------------------------------------------

function guessSourceType(url: string): string {
  let path = '';
  let host = '';
  try {
    const u = new URL(url);
    path = u.pathname.toLowerCase();
    host = u.hostname.toLowerCase();
  } catch {
    return 'webpage';
  }
  if (host.includes('linkedin.com')) return 'founder_post';
  if (host.includes('reddit.com')) return 'reddit';
  if (host.includes('twitter.com') || host.includes('x.com')) return 'social';
  if (path.includes('/blog')) return 'blog';
  if (path.includes('/customer') || path.includes('/case')) return 'case_study';
  if (path.includes('/manifesto')) return 'manifesto';
  if (path.includes('/about')) return 'about';
  if (path.includes('/docs')) return 'docs';
  if (path.includes('/integrations')) return 'integrations';
  if (path.includes('/pricing')) return 'pricing';
  if (path === '' || path === '/') return 'homepage';
  return 'webpage';
}

// --- chunker ---------------------------------------------------------------
// ~4 chars/token. Targets 200-400 tokens with 40-token overlap.

const CHARS_PER_TOKEN = 4;
const TARGET_CHUNK_TOKENS = 320; // mid-range of 200–400
const OVERLAP_TOKENS = 40;
const MIN_CHUNK_TOKENS = 50; // drop tiny tail chunks

const TARGET_CHARS = TARGET_CHUNK_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;
const MIN_CHARS = MIN_CHUNK_TOKENS * CHARS_PER_TOKEN;

function splitSentences(text: string): string[] {
  // Sentence-aware splitter: keep delimiters, split paragraphs first.
  const paras = text.split(/\n\s*\n+/);
  const out: string[] = [];
  for (const p of paras) {
    const cleaned = p.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;
    // Split on ., !, ? followed by whitespace (keep punctuation).
    const parts = cleaned.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [cleaned];
    for (const s of parts) {
      const t = s.trim();
      if (t) out.push(t);
    }
  }
  return out;
}

function chunkText(text: string): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];

  const chunks: string[] = [];
  let buf: string[] = [];
  let bufLen = 0;

  const flush = () => {
    if (buf.length === 0) return;
    const chunk = buf.join(' ').trim();
    if (chunk.length >= MIN_CHARS || chunks.length === 0) {
      chunks.push(chunk);
    } else if (chunks.length > 0) {
      // Glue dangling tail to previous chunk.
      chunks[chunks.length - 1] = `${chunks[chunks.length - 1]} ${chunk}`.trim();
    }
    buf = [];
    bufLen = 0;
  };

  for (const s of sentences) {
    const sLen = s.length + 1;
    if (bufLen + sLen > TARGET_CHARS && bufLen > 0) {
      flush();
      // Build overlap tail from previous chunk (last ~OVERLAP_CHARS chars,
      // sentence-aligned).
      const prev = chunks[chunks.length - 1] ?? '';
      if (prev.length > OVERLAP_CHARS) {
        const tail = prev.slice(prev.length - OVERLAP_CHARS);
        // Snap to a sentence boundary if possible.
        const m = tail.match(/[.!?]\s+(.*)$/s);
        const overlap = m ? m[1] : tail;
        if (overlap.trim()) {
          buf.push(overlap.trim());
          bufLen = overlap.trim().length + 1;
        }
      }
    }
    buf.push(s);
    bufLen += sLen;
  }
  flush();
  return chunks.filter((c) => c.trim().length > 0);
}

// --- tavily extract --------------------------------------------------------

async function tavilyExtract(url: string): Promise<string> {
  const body = {
    urls: [url],
    extract_depth: 'advanced',
    format: 'markdown',
  };
  const res = await fetch('https://api.tavily.com/extract', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${TAVILY_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Tavily ${res.status}: ${text.slice(0, 500)}`);
  }
  const json = (await res.json()) as {
    results?: { url: string; raw_content?: string; content?: string }[];
    failed_results?: { url: string; error?: string }[];
  };
  const failed = json.failed_results?.find((f) => f.url === url);
  if (failed) throw new Error(`Tavily failed: ${failed.error ?? 'unknown'}`);
  const hit = json.results?.find((r) => r.url === url) ?? json.results?.[0];
  const content = hit?.raw_content ?? hit?.content ?? '';
  if (!content || content.trim().length < 100) {
    throw new Error(`Tavily returned empty content for ${url}`);
  }
  return content;
}

async function tavilyExtractRetry(url: string): Promise<string> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      return await tavilyExtract(url);
    } catch (err) {
      lastErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

// --- gemini ----------------------------------------------------------------

async function geminiEmbed(text: string): Promise<number[]> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'models/text-embedding-004',
      content: { parts: [{ text }] },
      taskType: 'RETRIEVAL_DOCUMENT',
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini embed ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { embedding?: { values?: number[] } };
  const values = json.embedding?.values;
  if (!Array.isArray(values) || values.length !== 768) {
    throw new Error(`Gemini embed bad shape (len=${values?.length ?? 'undef'})`);
  }
  return values;
}

async function geminiVoiceProfile(brandName: string, sample: string): Promise<unknown> {
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;
  const prompt =
    `You are analyzing the public voice of the brand "${brandName}".\n` +
    `Below is a sample of their own writing (homepage, blog, case studies). ` +
    `Summarize the brand's voice and positioning in 5 concise bullets. ` +
    `Each bullet ≤ 18 words. Return STRICT JSON: ` +
    `{"bullets":[string,string,string,string,string],"tone":string,"positioning":string}.\n\n` +
    `--- sample ---\n${sample.slice(0, 12000)}\n--- end ---`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.4 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini voice ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// --- pgvector helpers ------------------------------------------------------

function pgVector(values: number[]): string {
  return `[${values.join(',')}]`;
}

// --- handler ---------------------------------------------------------------

type Body = { brand_id: string; seed_urls: string[] };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS });
  }

  try {
    assertEnv();
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid json' }), {
      status: 400,
      headers: { ...CORS, 'content-type': 'application/json' },
    });
  }
  const { brand_id, seed_urls } = body;
  if (!brand_id || !Array.isArray(seed_urls) || seed_urls.length === 0) {
    return new Response(
      JSON.stringify({ error: 'brand_id and seed_urls[] required' }),
      { status: 400, headers: { ...CORS, 'content-type': 'application/json' } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // --- open agent_runs row -----------------------------------------------
  const trace: { at: string; step: string; data?: unknown }[] = [];
  const pushTrace = async (step: string, data?: unknown) => {
    trace.push({ at: new Date().toISOString(), step, data });
  };

  const { data: brandRow, error: brandErr } = await supabase
    .from('brands')
    .select('id, name')
    .eq('id', brand_id)
    .maybeSingle();
  if (brandErr || !brandRow) {
    return new Response(
      JSON.stringify({ error: `brand not found: ${brand_id}` }),
      { status: 404, headers: { ...CORS, 'content-type': 'application/json' } },
    );
  }

  const { data: runRow, error: runErr } = await supabase
    .from('agent_runs')
    .insert({
      brand_id,
      agent_kind: 'context_ingest',
      status: 'running',
      trace: [],
    })
    .select('id')
    .single();
  if (runErr || !runRow) {
    return new Response(
      JSON.stringify({ error: `failed to open agent_run: ${runErr?.message}` }),
      { status: 500, headers: { ...CORS, 'content-type': 'application/json' } },
    );
  }
  const runId = runRow.id;
  const flushTrace = async () => {
    await supabase.from('agent_runs').update({ trace }).eq('id', runId);
  };

  await pushTrace('start', { seed_urls });
  await flushTrace();

  // --- ingest each URL ---------------------------------------------------
  const summary = {
    urls_ok: 0,
    urls_failed: 0,
    chunks_inserted: 0,
    voice_updated: false,
    failed: [] as { url: string; error: string }[],
  };

  const voiceSamples: string[] = [];

  // Wipe any prior chunks for these URLs so re-runs are clean.
  await supabase
    .from('context_chunks')
    .delete()
    .eq('brand_id', brand_id)
    .in('source_url', seed_urls);

  for (const url of seed_urls) {
    try {
      await pushTrace('extract.start', { url });
      await flushTrace();
      const markdown = await tavilyExtractRetry(url);
      await pushTrace('extract.ok', { url, chars: markdown.length });

      const chunks = chunkText(markdown);
      await pushTrace('chunked', { url, count: chunks.length });
      if (chunks.length === 0) {
        summary.urls_failed += 1;
        summary.failed.push({ url, error: 'no chunks produced' });
        continue;
      }

      // First 3 chunks contribute to voice profile sample.
      voiceSamples.push(chunks.slice(0, 3).join('\n\n'));

      // Embed sequentially to keep memory + rate-limit predictable.
      const sourceType = guessSourceType(url);
      const rows: Record<string, unknown>[] = [];
      for (let i = 0; i < chunks.length; i++) {
        const text = chunks[i];
        const vec = await geminiEmbed(text);
        rows.push({
          brand_id,
          source_url: url,
          source_type: sourceType,
          text,
          topic_ids: [],
          embedding: pgVector(vec),
          is_likely_outdated: false,
        });
      }

      const { error: insErr } = await supabase.from('context_chunks').insert(rows);
      if (insErr) throw new Error(`insert chunks failed: ${insErr.message}`);
      summary.urls_ok += 1;
      summary.chunks_inserted += rows.length;
      await pushTrace('upserted', { url, chunks: rows.length });
      await flushTrace();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.urls_failed += 1;
      summary.failed.push({ url, error: msg });
      await pushTrace('error', { url, error: msg });
      await flushTrace();
    }
  }

  // --- voice profile -----------------------------------------------------
  if (voiceSamples.length > 0) {
    try {
      const sample = voiceSamples.join('\n\n---\n\n');
      const voice = await geminiVoiceProfile(brandRow.name ?? 'the brand', sample);
      const { error: voiceErr } = await supabase
        .from('brands')
        .update({ voice_profile: voice })
        .eq('id', brand_id);
      if (voiceErr) throw new Error(voiceErr.message);
      summary.voice_updated = true;
      await pushTrace('voice.updated', voice);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await pushTrace('voice.error', { error: msg });
    }
  }

  // --- finalize ----------------------------------------------------------
  const status = summary.urls_ok > 0 ? 'done' : 'failed';
  await pushTrace('finish', summary);
  await supabase
    .from('agent_runs')
    .update({ status, trace, finished_at: new Date().toISOString() })
    .eq('id', runId);

  return new Response(
    JSON.stringify({ run_id: runId, status, ...summary }),
    {
      status: 200,
      headers: { ...CORS, 'content-type': 'application/json' },
    },
  );
});
