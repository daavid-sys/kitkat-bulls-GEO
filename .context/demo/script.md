# SWARM — 90s Demo Script

**Target run-time: 1:30. Hard cap: 1:45.** Built for two-screen recording: presenter cam + screen capture.

> **Core line if you forget everything else:** *"HubSpot has 78% AI search visibility. Attio has 33%. HubSpot has 200 marketers. Attio has 5. They don't compete — they SWARM."*

> **Demo state**: Radar pre-loaded from `src/data/attio-curated.json`. ONE live moment: clicking "Regenerate" on the hero card scaffold. Everything else is rendered from the curated cache. If wifi dies, demo still lands.

---

## [0:00 – 0:12] Hook (12s)

**Visual**: Full-screen Peec dashboard screenshot — Attio's brand report, HubSpot dominating.

**Voice (verbatim, fast pace):**
> "HubSpot has 78% AI search visibility. Attio has 33%. HubSpot has 200 marketers. Attio has 5. How do five people compete with two hundred? They don't. They SWARM."

**Pause beat. Cut.**

---

## [0:12 – 0:28] Problem framing — Peec is the scoreboard (16s)

**Visual**: Peec dashboard with the visibility gap pills highlighted, then a quick zoom on Peec's "recommendations" panel.

**Voice:**
> "Peec AI shows you which AI search topics you're losing. It even suggests where to engage. But it stops there. No impact estimate. No draft. No next step. That gap — that's the product."

**Hand-off line into screen change:**
> "Meet SWARM."

---

## [0:28 – 0:50] Product reveal — three agents, one Radar (22s)

**Visual**: SWARM Radar opens (loaded from `attio-curated.json`). Wide shot of the full screen — Trends rail left, Conversations feed center, Voice profile right.

**Voice (narrate while cursor moves):**
> "Three always-on agents working for Attio. **Trends** — every week, where mass attention is heading, scored against Attio's weak Peec topics. **Brand Context** — every public mention of Attio, ever, indexed and feeding the voice engine. **Conversation Interception** — live posts on Reddit, LinkedIn, X where Attio should show up."

**Cursor moves across the visibility bar:**
> "Top of the Radar — Attio's actual Peec topics. CRM Automation: 18%. Revenue Ops: 15%. Every conversation below traces back to one of these gaps."

---

## [0:50 – 1:15] The non-obvious magic + Peec quantification (25s)

**Visual**: Cursor lands on **Card #1 — "My startup just hit 50 employees and everything is chaos"** (CULTURAL badge, score 94, LinkedIn).

**Voice (slower, this is the wedge):**
> "It doesn't just find CRM posts. It finds *this*. A founder venting about scaling chaos at 50 employees. The badge says CULTURAL — we don't sell here, we show up. But look at the Peec impact —"

**Hover the Peec impact pill — read it:**
> "*Attio is invisible for Product-Led Growth at 28%. This post is the moment a founder buys a real CRM — 487 comments inside the buying window. Engaging here is estimated to lift visibility on this topic by ~2.7 percentage points.*"

**Click "Open draft". Modal opens with Attio-voice scaffold. Linger 1s.**

> "And here's the scaffold. Attio's voice. Opener, angle, supporting, soft CTA. Editable."

**Click "Regenerate" — the ONE live Gemini call. ~2s.**

> "Click regenerate — fresh Gemini call grounded in Attio's brand context."

**New scaffold lands. Don't read it — let it visually land.**

---

## [1:15 – 1:30] Flywheel + close (15s)

**Visual**: Close modal. Briefly show Voice profile sidebar (signature phrases, brand context).

**Voice:**
> "Every reply gets scored back into Peec. The flywheel: Peec measures invisibility. SWARM finds the conversation. Brand voice grounds the reply. Team ships. AI engines re-cite. Visibility goes up."

**Cut to title card: SWARM logo + Peec AI Powered badge.**

> "Peec is the scoreboard. SWARM is the offense. Three marketers, every conversation. **SWARM.**"

**End at 1:30 sharp.**

---

## Timing marks (for editor)

| Mark | Cue | Cumulative |
|------|-----|-----------|
| 0:00 | Hook starts | — |
| 0:12 | Cut to Peec dashboard | 12s |
| 0:28 | Cut to SWARM Radar | 28s |
| 0:50 | Hero card hover begins | 50s |
| 0:58 | Read Peec impact aloud | 58s |
| 1:05 | Click "Open draft" | 65s |
| 1:10 | Click "Regenerate" (live) | 70s |
| 1:13 | Regen lands | 73s |
| 1:15 | Close modal, flywheel beat | 75s |
| 1:25 | "Peec is the scoreboard" close | 85s |
| 1:30 | End card | 90s |

15s of buffer between target (1:30) and hard cap (1:45). If the live Gemini call slips past 3s, kill the buffer; do not extend hook or product reveal.

---

## Pre-flight checklist (run 5 min before recording)

- [ ] `npm run dev` — Radar loads under 1s with curated JSON.
- [ ] Hero card (`swarm-attio-001`) is at top of feed (relevanceScore 94 sorts highest).
- [ ] Click "Open draft" on hero card — modal renders with curated scaffold.
- [ ] Click "Regenerate" — Gemini key live, response in ≤3s.
- [ ] Voice profile sidebar shows Attio's signature phrases (mock fallback is fine).
- [ ] Visibility bar shows CRM Automation 18%, Revenue Ops 15%, PLG 28%.
- [ ] Browser zoom: 100%. Window: 1440×900. Cursor visible.
- [ ] Wifi backup: hotspot ready. If Gemini fails, mockDraft fallback is silently swapped — no demo break.

---

## Backup lines (if a beat overruns)

- **Cut from product reveal**: drop "Brand Context — every public mention of Attio, ever, indexed and feeding the voice engine." (-5s)
- **Cut from magic moment**: skip reading the Peec impact aloud — just hover and let it appear. (-6s)
- **Cut from close**: drop the flywheel sentence, go straight to "Peec is the scoreboard." (-7s)

---

## Hero card payload (memorize)

> **Post**: "My startup just hit 50 employees and everything is chaos" — Sarah Chen, LinkedIn, 487 comments.
> **Topic**: Product-Led Growth (Attio at 28%).
> **Lift**: +2.7pp.
> **Why it lands in the demo**: it's a CULTURAL post, not a CRM post. Peec's static recommendations would never surface this. SWARM does — that's the wedge.
