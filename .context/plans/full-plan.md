# Plan: SWARM — Conquer Every Conversation

## Context
Hackathon project for Big Berlin Hack 2026, Peec AI track (2,500 EUR). The challenge: help an early-stage brand win distribution against bigger competitors. 

**Previous concept** (citation inbox) was too close to what Peec already does. The new direction is offensive — not monitoring, but conquering.

**Thesis**: "Go where the attention is." Content and search are increasingly filtered by LLMs and algorithms. A 3-person marketing team can't compete with HubSpot's army — but an AI tool can make those 3 people omnipresent, like Duolingo's social team but powered by AI.

---

## Product: SWARM

**One-liner**: Find every conversation on the internet where your brand should show up — obvious and non-obvious — and help your team engage in your brand's authentic voice.

**The Duolingo insight**: Duolingo doesn't just comment on language-learning posts. They comment on breakup posts, gym posts, memes. The brand IS the presence. SWARM gives any early-stage brand that same omnipresence.

### Core Loop
1. **Peec AI** shows which topics you're invisible on in AI search → strategic intelligence
2. **Tavily** searches LinkedIn, Reddit, X for live conversations about those topics (and adjacent/cultural ones)
3. **Gemini** scores relevance (including non-obvious connections) and learns your brand voice
4. Team sees an **opportunity feed** → picks conversations → gets voice-aware draft replies → engages

### The Flywheel
```
Peec detects invisibility → SWARM finds conversations → Team engages → 
More brand mentions online → AI engines pick them up → Peec shows improved visibility → repeat
```

---

## UX Flow

### Screen 1: Brand Setup (one-time)
- Brand name, domain, 2-3 competitors
- Links for voice learning: website URL, founder LinkedIn, 2-5 sample social posts
- On submit: Peec AI pulls visibility data + Gemini builds Brand Voice Profile

### Screen 2: The Radar (daily driver)

**Top bar — Visibility Gaps (from Peec AI)**
```
[CRM Automation: 18% visible] [AI in Sales: 22%] [Revenue Ops: 15%]
```
These are topics where Peec shows you're losing. They act as filters.

**Main feed — Conversation Cards**
Each card:
- Platform icon (LinkedIn / Reddit / X)
- Post title/first line + author
- Relevance score (0-100) with color
- Connection type badge: `DIRECT` / `ADJACENT` / `CULTURAL`
- Peec insight: "You're invisible for 'CRM Automation' — this post has 847 views discussing exactly that"
- "Draft Reply" button

**Right sidebar — Brand Voice Profile**
- Voice summary: "Witty, anti-enterprise, builder-first"
- Tone sliders (formal↔casual, technical↔accessible, bold↔measured)
- Signature phrases extracted from brand content

### Screen 3: Draft & Deploy (expand a card)
- Full original post on left
- Editable AI draft on right (in brand voice)
- "Why this opportunity?" explanation linking Peec data to this post
- Regenerate with tone options: "Bolder" / "More technical" / "Shorter"
- "Copy to clipboard" + "Open original post" → human-in-the-loop

---

## Discovery Engine

### How it finds conversations

**Step 1**: Peec AI → extract topics where brand is weak, plus the actual prompts people ask AI engines

**Step 2**: Gemini generates search queries in 3 tiers:
- **DIRECT**: "best CRM automation tool 2026", "HubSpot alternatives"
- **ADJACENT**: "sales pipeline frustration", "startup scaling chaos"
- **CULTURAL**: "spreadsheet CRM horror story", "enterprise software is ugly"

**Step 3**: Tavily searches across platforms:
```
tavily.search(query, include_domains=["linkedin.com"], time_range="week", search_depth="advanced")
tavily.search(query, include_domains=["reddit.com"], time_range="week")
tavily.search(query, include_domains=["x.com"], time_range="week")
```

**Step 4**: Gemini scores each result (0-100) on relevance, reach potential, engagement fit

### 5 Non-Obvious Examples for Attio

| Post | Platform | Type | Why |
|------|----------|------|-----|
| "My startup just hit 50 employees and everything is chaos" | LinkedIn | CULTURAL | Scaling pain = CRM pain. Invisible for "Product-Led Growth" topic |
| "Unpopular opinion: Salesforce is the new legacy ERP" | X | ADJACENT | Anti-enterprise sentiment = Attio's positioning |
| "What's your tech stack for a 10-person B2B SaaS?" | Reddit | DIRECT | Tech stack threads get cited by AI engines (reddit.com = 82 citations) |
| "We just raised our Series A. 10 things I wish I'd known" | LinkedIn | CULTURAL | Post-raise = need real CRM. Invisible for "Revenue Ops" |
| "POV: manually copy-pasting contacts between 4 apps" | X | CULTURAL | Meme about data integration pain = Attio's value prop |

---

## Brand Voice Engine

### Learning the voice
Feed Gemini: website copy (via Tavily extract) + founder LinkedIn + sample posts → outputs a Brand Voice Profile:
- Personality traits, tone spectrum (formality, technicality, boldness, humor, warmth)
- Signature phrases, vocabulary preferences, engagement style, taboos

### Generating drafts
Each draft prompt includes the full voice profile + platform rules:
- **LinkedIn**: Professional but human, 2-5 sentences, value-first
- **Reddit**: Match subreddit tone, be helpful first, mention brand naturally alongside alternatives
- **X**: Under 280 chars, punchy, personality-forward

---

## Platform Strategy

| Platform | What SWARM surfaces | Engagement style |
|----------|-------------------|-----------------|
| **LinkedIn** | Thought leader posts, hot takes about enterprise SW, founder journey posts, polls, funding announcements | Substantive comments, first-person perspective, data-driven takes |
| **Reddit** | r/startups, r/SaaS, r/sales recommendation threads, competitor complaint threads, "what's your stack" threads | Casual, helpful, mention brand alongside alternatives, transparent about affiliation |
| **X** | Hot takes, memes about workflow pain, conference commentary, competitor announcements | Under 280 chars, witty, personality-forward, meme-aware |

---

## Technical Architecture

### No backend — all client-side for hackathon speed
```
React Frontend
  ├── Peec AI REST API (X-API-Key auth)
  ├── Tavily Search API
  └── Google Gemini API
```

API keys in Vite env vars. Fine for demo.

### File structure
```
src/
  services/
    peec.ts          — Peec AI client (visibility gaps, topics, prompts, domains)
    tavily.ts        — Tavily client (platform search)
    gemini.ts        — Gemini client (query gen, scoring, voice analysis, drafts)
    discovery.ts     — Orchestrator: Peec → queries → Tavily → scoring → feed
  components/
    BrandSetup.tsx   — One-time onboarding
    Radar.tsx        — Main feed dashboard
    VisibilityBar.tsx — Peec AI topic gap pills
    ConversationCard.tsx — Opportunity card
    DraftPanel.tsx   — Expanded draft view
    VoiceProfile.tsx — Brand voice sidebar
  types/index.ts
  App.tsx
```

### API call flow per refresh
1. Peec AI: `/reports/brands`, `/topics`, `/prompts`, `/reports/domains` → 4-5 calls
2. Gemini: generate search queries from Peec data → 1 call
3. Tavily: 10-15 parallel searches (3 platforms × 5 topics) → 15 calls
4. Gemini: batch-score all results → 1 call
5. Gemini: generate draft on demand (user clicks) → 1 call per draft

Total: ~20 calls, most parallel. 5-10 seconds.

### Key data types
```typescript
interface ConversationOpportunity {
  id: string;
  platform: 'linkedin' | 'reddit' | 'x';
  url: string;
  title: string;
  content: string;
  author: string;
  relevanceScore: number;
  connectionType: 'direct' | 'adjacent' | 'cultural';
  peecInsight: string;
  suggestedAngle: string;
  relatedTopic: VisibilityGap;
}

interface VoiceProfile {
  summary: string;
  traits: string[];
  toneSpectrum: { formality: number; technicality: number; boldness: number; humor: number; warmth: number; };
  signaturePhrases: string[];
  engagementStyle: string;
}
```

---

## Partner Tech (3 required)

1. **Google DeepMind (Gemini)** — AI backbone: query generation, relevance scoring, voice learning, draft generation
2. **Tavily** — Discovery engine: search LinkedIn, Reddit, X for live conversations
3. **Entire** — Agent traceability: install CLI, capture all AI agent sessions during build. Show in demo: "You can trace every decision back through Entire."

**Side challenge**: Connect repo to Aikido for "Most Secure Build" (free 1,000 EUR)

---

## Demo Flow (2 minutes)

**[0:00-0:15] Hook**
"HubSpot has 78% AI search visibility. Attio has 33%. HubSpot has 200 marketers. Attio has 5. How do 5 people compete? They don't. They SWARM."

**[0:15-0:35] Problem**
"AI engines learn what to recommend from the internet — LinkedIn posts, Reddit threads, blog comments. If your brand isn't in those conversations, you're invisible to AI. And invisible to the next generation of buyers."
*Show Peec AI data: Attio's low visibility, top cited domains (reddit.com, linkedin.com)*

**[0:35-0:55] Product**
"SWARM connects Peec AI's visibility intelligence to live conversations across the internet. It finds every post where your brand should be — and drafts replies in your brand's actual voice."
*Show the Radar feed. Scroll through cards.*

**[0:55-1:15] The Non-Obvious Magic**
"But here's what makes SWARM different. It doesn't just find CRM posts. It finds THIS —"
*Show LinkedIn post about startup hitting 50 employees. Badge: CULTURAL. Peec insight: "You're invisible for 'Product-Led Growth.' This founder's scaling pain is your market."*
"— and generates THIS."
*Show draft in Attio's voice. Highlight Voice Profile sidebar.*

**[1:15-1:35] The Flywheel**
"The intelligence layer is Peec AI. It shows which topics you're losing. SWARM finds the conversations. Your team engages. Those engagements become content AI engines learn from. Your visibility goes up. It's a flywheel."
*Show simple animated diagram of the loop.*

**[1:35-1:55] Real Results**
"We ran SWARM for Attio this morning. 47 conversations across LinkedIn, Reddit, and X."
*Show 3 real, timestamped results. One direct, one adjacent, one cultural. Each with a draft.*

**[1:55-2:00] Close**
"Three marketers. Every conversation. SWARM."

---

## Build Sequence

### Saturday morning: Core pipeline
- [ ] Scaffold React + Vite project
- [ ] Build `peec.ts` — fetch visibility gaps, topics, prompts
- [ ] Build `gemini.ts` — query generation, scoring, voice analysis, drafts
- [ ] Build `tavily.ts` — platform search
- [ ] Build `discovery.ts` — orchestrator connecting all three
- [ ] Pre-process Attio dataset + curate 10-15 great examples

### Saturday afternoon: Frontend
- [ ] Build Radar feed with ConversationCards
- [ ] Build DraftPanel with voice-aware generation
- [ ] Build VisibilityBar with Peec AI data
- [ ] Build VoiceProfile sidebar

### Saturday evening: Polish
- [ ] Brand voice refinement for Attio (make demos sound perfect)
- [ ] Connection type badges, platform icons, score indicators
- [ ] Loading states, error handling
- [ ] Connect Aikido for side challenge

### Sunday morning: Demo
- [ ] Record 2-min video
- [ ] README with setup, architecture, partner tech docs
- [ ] Final testing

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Tavily can't find good LinkedIn posts | Pre-curate 5-10 LinkedIn examples. Lean on Reddit (fully crawlable) for live demo |
| Gemini drafts sound generic | Invest in Brand Voice Profile quality. Include actual Attio phrases. Iterate prompts |
| Non-obvious connections feel forced | Score threshold (60/100 minimum). Better 15 great cards than 50 mediocre |
| Rate limits during demo | Pre-compute + cache results. Show curated AND live |
| Peec AI OAuth broken | Already mitigated: use REST API with API key |

---

## Name Decision
Working name: **SWARM** — "3 marketers, swarming every conversation."
Open to: LOUD, AMBUSH, FLARE, SURGE, or something else entirely. Decide during build.
