import { useEffect, useMemo, useState } from 'react';
import { InboxRow, type InboxTask, type InboxDraft, type TaskKind } from '../components/InboxRow';
import { TaskDrawer } from '../components/TaskDrawer';
import { FilterBar, type KindFilter } from '../components/FilterBar';

/**
 * Inbox — single ranked feed of tasks. Sorts by `estimated_lift × score`.
 * Sources data via `api.getInbox()` once `backend-supabase` lands `services/api.ts`.
 * Until then, the local stub below mirrors the contract from `full-plan.md`.
 */
export function Inbox() {
  const [tasks, setTasks] = useState<InboxTask[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, InboxDraft>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<KindFilter>('all');

  useEffect(() => {
    let mounted = true;
    getInboxStub().then((res) => {
      if (!mounted) return;
      setTasks(res.tasks);
      setDrafts(res.drafts);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const ranked = useMemo(() => {
    if (!tasks) return null;
    const filtered = filter === 'all' ? tasks : tasks.filter((t) => t.kind === filter);
    return [...filtered].sort(
      (a, b) => b.estimated_lift * b.score - a.estimated_lift * a.score,
    );
  }, [tasks, filter]);

  const selected = ranked?.find((t) => t.id === selectedId) ?? null;
  const draftForSelected = selected ? drafts[selected.id] ?? null : null;

  return (
    <>
      <FilterBar
        value={filter}
        onChange={setFilter}
        counts={tasks ? countByKind(tasks) : null}
      />
      <div className="swarm-inbox-page">
        <div className="swarm-inbox-header">
          <div className="swarm-inbox-title">
            <h1>Inbox</h1>
            <span className="swarm-inbox-count">
              {ranked ? `${ranked.length} ranked` : 'Loading…'}
            </span>
          </div>
          <div className="swarm-inbox-subtitle">
            Sorted by estimated visibility lift × confidence. Click any row to draft.
          </div>
        </div>

        {ranked === null ? (
          <div className="swarm-inbox-empty">Loading inbox…</div>
        ) : ranked.length === 0 ? (
          <div className="swarm-inbox-empty">
            No tasks match this filter yet. Trigger an agent run from Settings.
          </div>
        ) : (
          <div className="swarm-inbox-list" role="list">
            {ranked.map((t) => (
              <InboxRow
                key={t.id}
                task={t}
                selected={t.id === selectedId}
                onSelect={() => setSelectedId(t.id)}
              />
            ))}
          </div>
        )}
      </div>

      <TaskDrawer task={selected} draft={draftForSelected} onClose={() => setSelectedId(null)} />
    </>
  );
}

function countByKind(tasks: InboxTask[]): Record<TaskKind | 'all', number> {
  const out: Record<TaskKind | 'all', number> = {
    all: tasks.length,
    trend: 0,
    opportunity: 0,
    outdated_content: 0,
    mention: 0,
  };
  for (const t of tasks) out[t.kind] += 1;
  return out;
}

// ---------------------------------------------------------------------------
// Local stub. Replace with `import { getInbox } from '../services/api'` once
// `backend-supabase` lands the real client.
// ---------------------------------------------------------------------------

interface InboxResponse {
  tasks: InboxTask[];
  drafts: Record<string, InboxDraft>;
}

async function getInboxStub(): Promise<InboxResponse> {
  await new Promise((r) => setTimeout(r, 80));
  const tasks: InboxTask[] = [
    {
      id: 'task_1',
      kind: 'opportunity',
      status: 'open',
      title: 'Founder asking how to migrate from HubSpot to Attio without breaking integrations',
      summary:
        'Series A founder on r/SaaS posted a thread weighing HubSpot vs. Attio for a 12-person revops team. Cited integration breakage as the main blocker.',
      source_url: 'https://www.reddit.com/r/SaaS/comments/xyz/migrating_off_hubspot/',
      source_domain: 'reddit.com',
      platform: 'Reddit',
      related_topic_id: 'crm-migration',
      estimated_lift: 0.42,
      score: 0.88,
      created_at: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
      raw: {
        author: 'u/late_stage_founder',
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        body: `We've been on HubSpot for 3 years and the contract renews in 6 weeks. Sales-led ICP, 12 people on revops + sales ops. Attio looks beautiful but I'm worried about:

1. Slack <> CRM sync — currently driven by HubSpot workflows
2. Outreach + Gong — both have native HubSpot integrations
3. Custom objects for partner tracking

Has anyone actually pulled this migration off in under a quarter? What broke first?`,
      },
    },
    {
      id: 'task_2',
      kind: 'trend',
      status: 'open',
      title: 'AI search agents starting to recommend "AI-native CRM" as a category',
      summary:
        'Tavily sweep on "AI CRM" shows three editorial pieces published this week explicitly framing AI-native CRM as a distinct category. Attio mentioned in 2 of 3.',
      source_url: 'https://www.theinformation.com/articles/ai-native-crm-2026',
      source_domain: 'theinformation.com',
      platform: 'Editorial',
      related_topic_id: 'ai-native-crm',
      estimated_lift: 0.35,
      score: 0.74,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
      raw: {
        author: 'Cory Weinberg',
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        body: `A new category is taking shape on the AI side of go-to-market: AI-native CRM. Unlike retrofits like HubSpot AI or Salesforce Einstein, these tools were rebuilt assuming an LLM at the core. Attio, Folk, and Default are leading the conversation, with $200M+ in combined ARR…`,
      },
    },
    {
      id: 'task_3',
      kind: 'outdated_content',
      status: 'open',
      title: 'Your 2024 "CRM benchmarks" post is being cited but the data is 18 months stale',
      summary:
        'Tavily found 14 citations of attio.com/blog/crm-benchmarks in the last 90 days. Post was last updated 2024-10. Refresh would lift Earned visibility 4-6pp.',
      source_url: 'https://attio.com/blog/crm-benchmarks-2024',
      source_domain: 'attio.com',
      platform: 'Owned',
      related_topic_id: 'benchmarks',
      estimated_lift: 0.28,
      score: 0.69,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 9).toISOString(),
      raw: {
        author: 'Attio Editorial',
        published_at: '2024-10-08T00:00:00Z',
        body: `Our annual CRM benchmark survey of 2,400 RevOps leaders. (This post was last updated October 2024 — citations are stacking up but data is stale.)`,
      },
    },
    {
      id: 'task_4',
      kind: 'mention',
      status: 'open',
      title: 'LinkedIn post comparing Attio favorably to Salesforce — 240 reactions, no engagement from Attio',
      summary:
        'Series B revops leader posted a 6-bullet comparison of Attio vs. Salesforce. Net positive sentiment. Attio has not responded.',
      source_url: 'https://www.linkedin.com/posts/jane-doe-revops_attio-salesforce-activity',
      source_domain: 'linkedin.com',
      platform: 'LinkedIn',
      related_topic_id: 'salesforce-comparison',
      estimated_lift: 0.18,
      score: 0.81,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
      raw: {
        author: 'Jane Doe — Head of RevOps @ Series B SaaS',
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 16).toISOString(),
        body: `Attio vs. Salesforce, after 90 days running both:

• Setup time: Attio 2 days vs. SFDC 6 weeks
• Time-to-first-report: Attio same day vs. SFDC ~2 weeks
• Custom objects: Attio shipped this in an hour, SFDC took our admin 4 days
• AI features: Attio's are actually shippable, SFDC's are mostly demoware
• Pricing: SFDC is 4x more expensive for our shape
• Migration: HubSpot → Attio in ~3 weeks, partial export pain

Net: would not go back.`,
      },
    },
    {
      id: 'task_5',
      kind: 'opportunity',
      status: 'open',
      title: 'Reddit thread: "Best CRM for a 2-person founding team in 2026?"',
      summary:
        'Active thread (38 comments in 6 hours) on r/startups asking for recommendations. Attio mentioned once, HubSpot mentioned 12 times.',
      source_url: 'https://www.reddit.com/r/startups/comments/abc/best_crm_2_person_team',
      source_domain: 'reddit.com',
      platform: 'Reddit',
      related_topic_id: 'small-team-crm',
      estimated_lift: 0.31,
      score: 0.62,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
      raw: {
        author: 'u/two_person_band',
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
        body: `Cofounder and I just closed pre-seed. Need a CRM that doesn't make us hate ourselves. We've tried HubSpot at past jobs and the free tier is fine but we know the upgrade cliff is brutal. What's the right move for a 2-person team in 2026? AI-native preferred but we don't want vaporware.`,
      },
    },
    {
      id: 'task_6',
      kind: 'trend',
      status: 'open',
      title: 'Spike in "PLG CRM" queries — Attio share-of-voice 11%, HubSpot 47%',
      summary:
        'Peec data shows topic "PLG CRM" tripled in volume over 30 days. Attio appears in 1 of 9 AI answers. Big gap to close with a single Attio-led editorial play.',
      source_url: 'https://app.peec.ai/topics/plg-crm',
      source_domain: 'peec.ai',
      platform: 'Peec',
      related_topic_id: 'plg-crm',
      estimated_lift: 0.45,
      score: 0.58,
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
      raw: {
        author: 'Peec Trends agent',
        published_at: new Date(Date.now() - 1000 * 60 * 60 * 18).toISOString(),
        body: `30-day volume on "PLG CRM" up 312%. Attio appears in 11% of AI answers vs HubSpot at 47% and Salesforce at 19%. The gap is concentrated in editorial citations — only 2 op-eds frame Attio as the PLG-native option. A single founder-bylined post on attio.com/blog with a benchmark angle would lift 4-7pp.`,
      },
    },
  ];

  const drafts: Record<string, InboxDraft> = {
    task_1: {
      id: 'draft_1',
      task_id: 'task_1',
      opener:
        'We migrated 40+ teams off HubSpot to Attio in the last six months. The integrations question is real but it has a known shape.',
      angle:
        'Lead with the integration matrix. Slack, Outreach, Gong all have first-class Attio support shipped in Q1 2026. Custom objects ship in hours, not days.',
      supporting:
        'Cite the published benchmarks: median migration time 19 days for revops teams under 20 people. Linkedin post by Jane Doe (Series B revops) covers Outreach + Gong specifically.',
      cta: 'Offer a 30-min migration map call. Soft, not salesy. "Happy to share the doc we use internally."',
      context_chunks: [
        {
          id: 'ctx_1',
          source_url: 'https://attio.com/blog/migrate-from-hubspot',
          source_type: 'blog',
          text: 'Our migration playbook for revops teams under 20 people: median 19 days to parity, 95% of HubSpot workflows reproduced via Attio automations.',
        },
        {
          id: 'ctx_2',
          source_url: 'https://attio.com/integrations',
          source_type: 'docs',
          text: 'Native integrations for Slack, Outreach, Gong, Apollo, Linear, Notion. Bidirectional sync, no Zapier middleware required.',
        },
        {
          id: 'ctx_3',
          source_url: 'https://attio.com/customers/series-b-revops',
          source_type: 'case_study',
          text: 'Series B SaaS company migrated from HubSpot to Attio in 21 days. Reproduced 100% of partner-tracking custom objects on day one.',
        },
      ],
    },
    task_2: {
      id: 'draft_2',
      task_id: 'task_2',
      opener:
        'AI-native CRM is becoming a category in its own right. Attio was built around an LLM core, not bolted on.',
      angle:
        'Position Attio as the only AI-native CRM with multi-tenant data primitives. Contrast retrofitted incumbents.',
      supporting:
        'Reference the Information piece. Add proprietary data: 71% of Attio customers use AI workflows weekly vs <8% on HubSpot AI.',
      cta: 'Founder bylined response on Attio blog. Cross-post on Twitter and LinkedIn within 24h of the original article.',
      context_chunks: [
        {
          id: 'ctx_4',
          source_url: 'https://attio.com/manifesto',
          source_type: 'homepage',
          text: 'Attio is the AI-native CRM. Built around an LLM core from day one — not retrofitted onto a 1999 schema.',
        },
        {
          id: 'ctx_5',
          source_url: 'https://attio.com/blog/ai-workflows',
          source_type: 'blog',
          text: '71% of Attio customers run AI workflows weekly. Median time-to-first-AI-action: 8 minutes from signup.',
        },
      ],
    },
  };

  return { tasks, drafts };
}
