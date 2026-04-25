# Peec AI MCP Exploration Summary

## What is Peec AI?
Peec AI monitors how brands appear across AI search engines (ChatGPT, Perplexity, Gemini, Google AI Overviews, Claude, Copilot, Grok). It tracks visibility, sentiment, share of voice, and citations — then provides actionable recommendations.

## How it works
1. You define **brands** (your own + competitors) with their domains
2. You create **topics** (categories) and **prompts** (the actual questions users would ask AI engines)
3. Peec AI sends those prompts to AI engines and records the responses
4. It extracts: which brands were mentioned, in what position, with what sentiment, and what sources were cited
5. Reports aggregate this into visibility scores, share of voice, and competitive benchmarks

## Authentication
- **OAuth MCP**: Broken at time of testing (PKCE S256 validation bug on their server)
- **REST API with API key**: Works perfectly
  - Base URL: `https://api.peec.ai/customer/v1`
  - Auth header: `X-API-Key: <key>`
  - Key stored in `.env` (not committed)

## API Endpoints (full list)
```
POST   /reports/brands          — Brand visibility/sentiment/SoV report (supports dimensions & filters)
POST   /reports/domains          — Source domain citation report
POST   /reports/urls             — URL-level citation report
POST   /sources/urls/content     — Scraped markdown of a cited URL
POST   /queries/search           — Fanout search queries
POST   /queries/shopping         — Fanout shopping queries
GET    /brands                   — List brands
POST   /brands                   — Create brand
GET    /prompts                  — List prompts
POST   /prompts                  — Create prompt
GET    /topics                   — List topics
POST   /topics                   — Create topic
GET    /tags                     — List tags
POST   /tags                     — Create tag
GET    /model-channels           — List AI engine channels
GET    /chats                    — List AI responses (filterable by date, brand, prompt, model)
GET    /chats/{id}/content       — Full chat: messages, sources, brand mentions
GET    /projects                 — List all projects
```

### Key report parameters
- **dimensions**: `[date, model_channel_id, topic_id, tag_id, prompt_id, country_code, chat_id]`
- **filters**: `brand_id`, `model_channel_id`, `tag_id`, `topic_id`, `country_code` with `in`/`not_in` operators
- **order_by**: `visibility`, `mention_count`, `sentiment`, `position`, `share_of_voice`

## Attio Project (hackathon test data)
**Project ID**: `or_47ccb54e-0f32-4c95-b460-6a070499d084`

### Brands
| Brand | ID | Own? |
|-------|----|------|
| Attio | kw_aa69e6a9-2d6b-40be-84a7-77b8bb3a04aa | Yes |
| HubSpot | kw_2cb435a5-37da-4b01-9767-f7e878f7ecc2 | No |
| Salesforce | kw_5604d168-9e16-4b79-aeec-2628322bb240 | No |
| Pipedrive | kw_0f576912-e163-4829-a15e-a70238d5fec7 | No |
| Zoho | kw_f8720a05-a06d-4702-8fde-d73d071696de | No |

### Brand Report (Jan 2025 - Apr 2026)
| Brand | Share of Voice | Visibility | Sentiment | Avg Position |
|-------|---------------|------------|-----------|-------------|
| HubSpot | 30.6% | 77.9% | 65 | 2.5 |
| Salesforce | 27.7% | 73.2% | 63 | 3.0 |
| **Attio** | **20.4%** | **32.9%** | **64** | **2.8** |
| Pipedrive | 12.5% | 36.7% | 68 | 4.4 |
| Zoho | 8.7% | 35.6% | 68 | 4.9 |

**Key insight**: Attio has decent share of voice (20%) but very low visibility (33% vs HubSpot's 78%). When Attio does appear, it ranks well (position 2.8), but it's simply not showing up in most AI conversations.

### Topics
- CRM Automation (`to_c48a31d6-58be-4738-8d02-b88d5df3d0ab`)
- Data Integration (`to_28f787cc-6d83-40ce-a3c6-ead428c6dfa1`)
- Product-Led Growth (`to_8f9381cf-7c52-4277-b326-1fbd4d9782d8`)
- Revenue Operations (`to_97cdc70b-1d51-468f-8248-662bd2714176`)
- AI in Sales (`to_1580a71e-41c3-4313-9f83-ff330a1d48dc`)

### Tags (funnel stage + persona)
- Funnel: awareness, consideration, decision, informational, transactional
- Persona: Sales Manager, Software Engineer/Developer, Head of RevOps
- Type: branded, non-branded

### Active AI Engines
- ChatGPT UI (openai-0)
- Gemini UI (google-2)
- Google AI Overview (google-0)

### Data volume
- 545 chats collected
- ~50 prompts across topics

### Top Cited Domains
| Domain | Type | Retrieval Count | Citation Count |
|--------|------|----------------|---------------|
| youtube.com | UGC | 196 | 96 |
| attio.com | OWN | 238 | 167 |
| monday.com | CORPORATE | 155 | 115 |
| reddit.com | UGC | 104 | 82 |
| salesforce.com | COMPETITOR | 81 | 52 |
| hubspot.com | COMPETITOR | 67 | 62 |

### Sample Chat Content
A chat shows: the user prompt sent to the AI engine, the AI engine's full response, all source URLs cited (with citation counts and positions), and which brands were mentioned. Example: Google AI Overview was asked "Compare CRM automation tools with robust webhooks and API support" and returned a response citing 26 sources.

## Metric Definitions
- **Visibility**: % of AI conversations where the brand appeared at all (visibility_count / visibility_total)
- **Share of Voice**: Brand's mentions as a proportion of all brand mentions
- **Sentiment**: 0-100 scale, how positively the AI talks about the brand
- **Position**: Average rank when mentioned (1 = mentioned first)
- **Citation**: When the AI engine links to a source URL
- **Retrieval**: When the AI engine reads/accesses a source URL during generation

## Fyxer Project (set up during this session)
**Project ID**: `or_08e8d158-7f02-4469-9f63-34a5013d16d4`

### Brands added
- Fyxer (own) — fyxer.com
- Superhuman — superhuman.com
- SaneBox — sanebox.com
- Shortwave — shortwave.com
- Microsoft Copilot — microsoft.com
- Gemini for Gmail — google.com

### Topics created
- Email Productivity
- AI Email Assistants
- Meeting Notes
- Inbox Management

### Prompts created (15 total)
- "What are the best tools to save time on email?"
- "How can I be more productive with my email inbox?"
- "Best email productivity tools for busy professionals"
- "AI tools that help manage email overload"
- "What is the best AI email assistant in 2026?"
- "Compare AI email assistants like Superhuman and Fyxer"
- "Which AI tool can draft emails in my writing style?"
- "Best AI assistant for email replies and follow-ups"
- "Best AI meeting note taker for business meetings"
- "AI tools that take meeting notes and draft follow-up emails"
- "Compare AI notetakers like Otter Fireflies and Fyxer"
- "How to organize a cluttered email inbox with AI"
- "Best tools to automatically sort and categorize emails"
- "AI email organizer that filters spam and labels emails"
- "Which email tool is best for inbox zero?"

**Status**: Prompts created but no data yet — Peec AI needs time to crawl AI engines.

## Other Available Projects
- Nothing Phone (`or_faaa7625-...`) — phones vs Apple/Samsung, has data
- Big Berlin Hack (`or_7e684be5-...`)
- BMW, Revolut, and others
