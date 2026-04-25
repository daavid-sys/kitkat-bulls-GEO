/**
 * SWARM v3 — read-only Supabase API surface for the frontend.
 *
 * Mutations (saveDraft, triggerAgentRun, subscribeToRun, etc.) are deliberately
 * out of scope for this slice — the inbox demo only needs to read seeded rows.
 */

import { supabase } from '../lib/supabase';

export type TaskKind = 'trend' | 'opportunity' | 'outdated_content' | 'mention';

export interface BrandRow {
  id: string;
  owner_id: string | null;
  name: string;
  domain: string;
  peec_brand_id: string | null;
  peec_project_id: string | null;
  voice_profile: unknown;
  seed_urls: string[];
  created_at: string;
}

export interface TopicRow {
  id: string;
  brand_id: string;
  peec_topic_id: string | null;
  name: string;
}

export interface VisibilityRunRow {
  id: string;
  brand_id: string;
  topic_id: string | null;
  visibility: number | null;
  share_of_voice: number | null;
  sentiment: number | null;
  ran_at: string;
}

export interface TaskRow {
  id: string;
  brand_id: string;
  agent_run_id: string | null;
  kind: TaskKind;
  status: string;
  title: string;
  summary: string | null;
  source_url: string;
  source_domain: string | null;
  platform: string | null;
  related_topic_id: string | null;
  estimated_lift: number | null;
  score: number | null;
  raw: Record<string, unknown> | null;
  dismissed_at: string | null;
  created_at: string;
}

export interface AgentRunRow {
  id: string;
  brand_id: string;
  agent_kind: string;
  status: string;
  trace: unknown;
  started_at: string;
  finished_at: string | null;
}

export interface DraftRow {
  id: string;
  task_id: string;
  opener: string | null;
  angle: string | null;
  supporting: string | null;
  cta: string | null;
  alternates: unknown;
  context_chunk_ids: string[];
  status: string;
  updated_at: string;
}

export interface ContextChunkRow {
  id: string;
  brand_id: string;
  source_url: string;
  source_type: string | null;
  text: string;
  topic_ids: string[];
  is_likely_outdated: boolean;
  ingested_at: string;
}

export interface InboxFilters {
  kind?: TaskKind | TaskKind[];
  topicId?: string;
  platform?: string;
  includeDismissed?: boolean;
  limit?: number;
}

export interface ApiStatus {
  ok: boolean;
  url: string | null;
  reachable: boolean;
  error?: string;
}

// --- helpers ---------------------------------------------------------------

function unwrap<T>(data: T | null, error: { message: string } | null): T {
  if (error) throw new Error(error.message);
  if (data === null || data === undefined) {
    throw new Error('No rows returned');
  }
  return data;
}

// --- reads -----------------------------------------------------------------

export async function getBrand(brandId: string): Promise<BrandRow> {
  const { data, error } = await supabase
    .from('brands')
    .select('*')
    .eq('id', brandId)
    .single();
  return unwrap(data as BrandRow | null, error);
}

/**
 * Inbox feed for a brand, sorted by ROI (estimated_lift × score) desc.
 * Postgres can't ORDER BY a computed product across nullable columns cleanly,
 * so we fetch and sort in JS — fine for hackathon volumes.
 */
export async function getInbox(
  brandId: string,
  filters: InboxFilters = {},
): Promise<TaskRow[]> {
  let q = supabase.from('tasks').select('*').eq('brand_id', brandId);

  if (filters.kind) {
    if (Array.isArray(filters.kind)) q = q.in('kind', filters.kind);
    else q = q.eq('kind', filters.kind);
  }
  if (filters.topicId) q = q.eq('related_topic_id', filters.topicId);
  if (filters.platform) q = q.eq('platform', filters.platform);
  if (!filters.includeDismissed) q = q.is('dismissed_at', null);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = (data as TaskRow[] | null) ?? [];

  rows.sort((a, b) => {
    const aRoi = (a.estimated_lift ?? 0) * (a.score ?? 0);
    const bRoi = (b.estimated_lift ?? 0) * (b.score ?? 0);
    if (bRoi !== aRoi) return bRoi - aRoi;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return filters.limit ? rows.slice(0, filters.limit) : rows;
}

export async function getTask(taskId: string): Promise<TaskRow> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
  return unwrap(data as TaskRow | null, error);
}

export async function getAgentRuns(brandId: string, limit = 5): Promise<AgentRunRow[]> {
  const { data, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('brand_id', brandId)
    .order('started_at', { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data as AgentRunRow[] | null) ?? [];
}

export async function getDraftFor(taskId: string): Promise<DraftRow | null> {
  const { data, error } = await supabase
    .from('drafts')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as DraftRow | null) ?? null;
}

/**
 * Lightweight reachability probe for the Supabase REST endpoint. Used by the
 * settings/status surface — does NOT throw; returns a structured result.
 */
export async function getApiStatus(): Promise<ApiStatus> {
  const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? null;
  if (!url) return { ok: false, url: null, reachable: false, error: 'VITE_SUPABASE_URL missing' };

  try {
    // HEAD to the REST root — succeeds (200/401) when the project is reachable,
    // fails (network error) when it's not. Either way we don't throw.
    const res = await fetch(`${url}/rest/v1/`, { method: 'HEAD' });
    return { ok: res.ok || res.status === 401, url, reachable: true };
  } catch (err) {
    return {
      ok: false,
      url,
      reachable: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
