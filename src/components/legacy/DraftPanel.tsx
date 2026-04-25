import { useEffect, useRef, useState } from 'react';
import type { ConversationOpportunity, DraftScaffold, VoiceProfile } from '../../types';
import { generateDraftScaffold } from '../../services/gemini';

type FieldKey = 'opener' | 'angle' | 'supporting' | 'cta';

const FIELDS: { key: FieldKey; label: string; placeholder: string }[] = [
  { key: 'opener', label: 'Opener', placeholder: 'Hook the first sentence…' },
  { key: 'angle', label: 'Angle', placeholder: 'The thesis you bring…' },
  { key: 'supporting', label: 'Supporting', placeholder: 'Proof, story, data…' },
  { key: 'cta', label: 'CTA', placeholder: 'Soft handoff…' },
];

export function DraftPanel({
  brand,
  voice,
  opportunity,
  onClose,
}: {
  brand: { name: string; domain: string };
  voice: VoiceProfile;
  opportunity: ConversationOpportunity;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<DraftScaffold | null>(null);
  const [loading, setLoading] = useState(true);
  const [angle, setAngle] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeAlternate, setActiveAlternate] = useState<string | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const a =
      opportunity.connectionType === 'cultural'
        ? `Hook the cultural moment to ${brand.name}'s positioning without selling.`
        : opportunity.connectionType === 'adjacent'
          ? `Bridge the adjacent pain point to ${brand.name}'s value prop.`
          : `Directly address the question with a builder-flavored answer.`;
    setAngle(a);
    regenerate(a);
    closeBtnRef.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  async function regenerate(nextAngle: string, alternate: string | null = null) {
    setLoading(true);
    setActiveAlternate(alternate);
    try {
      const d = await generateDraftScaffold(brand, voice, opportunity, nextAngle);
      setDraft(d);
    } finally {
      setLoading(false);
    }
  }

  function patch(key: FieldKey, value: string) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  const fullText = draft
    ? [draft.opener, draft.angle, draft.supporting, draft.cta]
        .filter((s) => s && s.trim())
        .join('\n\n')
    : '';

  function copy(text: string) {
    if (!text.trim()) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const platformLabel = { reddit: 'Reddit', linkedin: 'LinkedIn', x: 'X' }[opportunity.platform];
  const connectionMeta = {
    direct: { label: 'Direct', bg: 'var(--peec-badge-green-bg)', text: 'var(--peec-badge-green-text)' },
    adjacent: { label: 'Adjacent', bg: 'var(--peec-badge-violet-bg)', text: 'var(--peec-badge-violet-text)' },
    cultural: { label: 'Cultural', bg: 'var(--peec-badge-pink-bg)', text: 'var(--peec-badge-pink-text)' },
  }[opportunity.connectionType];

  return (
    <div
      className="peec-scrim z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Draft scaffold"
    >
      <div
        className="peec-card-lg peec-modal-enter w-full max-w-[1080px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: 'var(--peec-separator-primary)' }}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="flex items-center justify-center flex-shrink-0"
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'var(--peec-bg-secondary)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2.5 3.5h11M2.5 8h11M2.5 12.5h7"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <h2 className="t-h4">Draft scaffold</h2>
                <span
                  className="peec-pill"
                  style={{
                    background: connectionMeta.bg,
                    color: connectionMeta.text,
                    borderColor: 'transparent',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    fontSize: 9.5,
                    padding: '1px 6px',
                  }}
                >
                  {connectionMeta.label}
                </span>
              </div>
              <p className="text-[11.5px] font-medium" style={{ color: 'var(--peec-fg-tertiary)' }}>
                80% of the way · in {brand.name}'s voice · you ship it
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <a
              href={opportunity.url}
              target="_blank"
              rel="noreferrer"
              className="peec-btn peec-btn-ghost peec-btn-sm"
            >
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3.5H4A1.5 1.5 0 0 0 2.5 5v7A1.5 1.5 0 0 0 4 13.5h7a1.5 1.5 0 0 0 1.5-1.5v-2M9 2.5h4v4M13 2.5L7 8.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Open original
            </a>
            <button
              ref={closeBtnRef}
              className="peec-btn peec-btn-ghost peec-btn-sm"
              onClick={onClose}
              aria-label="Close (Esc)"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path
                  d="M3.5 3.5l9 9M12.5 3.5l-9 9"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </header>

        <div className="grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] flex-1 min-h-0">
          <div
            className="border-r overflow-y-auto"
            style={{ borderColor: 'var(--peec-separator-primary)', background: '#fbfbfb' }}
          >
            <div className="px-5 py-4">
              <div className="peec-eyebrow mb-2">Original post</div>
              <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                <span
                  className="peec-pill"
                  style={{
                    background: 'var(--peec-bg-secondary)',
                    color: 'var(--peec-fg-primary)',
                    borderColor: 'transparent',
                    fontWeight: 600,
                  }}
                >
                  {platformLabel}
                </span>
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--peec-fg-tertiary)' }}
                >
                  {opportunity.author} · {new Date(opportunity.publishedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
              </div>
              <h3
                className="t-body-l mb-2"
                style={{ fontWeight: 600, lineHeight: '20px' }}
              >
                {opportunity.title}
              </h3>
              <p
                className="text-[13px] leading-[19px] whitespace-pre-wrap"
                style={{ color: 'var(--peec-fg-secondary)', letterSpacing: '-0.065px' }}
              >
                {opportunity.content}
              </p>
            </div>

            <div
              className="mx-3 my-2 rounded-[10px] p-3"
              style={{
                background: 'var(--peec-bg-white)',
                boxShadow: 'inset 0 0 0 1px #155dfc26',
              }}
            >
              <div className="flex items-center gap-1.5 mb-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--peec-feature-2-base)' }}>
                  <path
                    d="M8 1.5L9.6 5.6L14 7.2L9.6 8.8L8 13L6.4 8.8L2 7.2L6.4 5.6L8 1.5Z"
                    fill="currentColor"
                    fillOpacity="0.18"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  className="peec-eyebrow"
                  style={{ color: 'var(--peec-feature-2-base)' }}
                >
                  Why this opportunity
                </span>
              </div>
              <p className="text-[12.5px] leading-[18px]" style={{ letterSpacing: '-0.065px' }}>
                {opportunity.peecInsight}
              </p>
              <div
                className="flex items-center justify-between mt-2.5 pt-2.5"
                style={{ borderTop: '1px solid var(--peec-separator-primary)' }}
              >
                <span
                  className="text-[11px] font-medium"
                  style={{ color: 'var(--peec-fg-tertiary)' }}
                >
                  Estimated lift
                </span>
                <span
                  className="text-[13px] font-semibold tabular-nums"
                  style={{ color: 'var(--peec-feature-2-base)' }}
                >
                  +{opportunity.estimatedVisibilityLift.toFixed(1)}pp
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 flex items-center justify-between border-b" style={{ borderColor: 'var(--peec-separator-primary)' }}>
              <div className="peec-eyebrow">Scaffold · {brand.name}'s voice</div>
              <div className="flex items-center gap-1">
                {(['bolder', 'technical', 'shorter'] as const).map((k) => (
                  <button
                    key={k}
                    className="peec-btn peec-btn-ghost peec-btn-sm capitalize"
                    onClick={() => regenerate(`Make this ${k} — ${draft?.alternates[k] ?? ''}`, k)}
                    disabled={loading}
                    style={{
                      background: activeAlternate === k ? 'var(--peec-table-active)' : undefined,
                      color: activeAlternate === k ? 'var(--peec-fg-primary)' : undefined,
                    }}
                  >
                    {k}
                  </button>
                ))}
                <div className="h-4 w-px mx-1" style={{ background: 'var(--peec-separator-primary)' }} />
                <button
                  className="peec-btn peec-btn-ghost peec-btn-sm"
                  onClick={() => regenerate(angle, null)}
                  disabled={loading}
                  aria-label="Regenerate"
                  title="Regenerate"
                >
                  <svg
                    width="11"
                    height="11"
                    viewBox="0 0 16 16"
                    fill="none"
                    className={loading ? 'animate-spin' : ''}
                  >
                    <path
                      d="M2 8a6 6 0 0 1 10.5-3.97V3a.75.75 0 0 1 1.5 0v3a.75.75 0 0 1-.75.75h-3a.75.75 0 0 1 0-1.5h1.32A4.5 4.5 0 0 0 3.5 8a.75.75 0 0 1-1.5 0Z"
                      fill="currentColor"
                    />
                    <path
                      d="M14 8a6 6 0 0 1-10.5 3.97V13a.75.75 0 0 1-1.5 0v-3a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 0 1.5H4.43A4.5 4.5 0 0 0 12.5 8a.75.75 0 0 1 1.5 0Z"
                      fill="currentColor"
                    />
                  </svg>
                  Regenerate
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loading || !draft ? (
                <div className="flex flex-col gap-2.5">
                  {FIELDS.map((f) => (
                    <div key={f.key}>
                      <div
                        className="h-3 w-16 rounded mb-1.5 animate-pulse"
                        style={{ background: 'var(--peec-bg-tertiary)' }}
                      />
                      <div
                        className="h-16 rounded-[8px] animate-pulse"
                        style={{ background: 'var(--peec-bg-secondary)' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {FIELDS.map((f) => (
                    <ScaffoldField
                      key={f.key}
                      label={f.label}
                      value={draft[f.key]}
                      placeholder={f.placeholder}
                      onChange={(v) => patch(f.key, v)}
                    />
                  ))}
                </div>
              )}
            </div>

            <div
              className="px-5 py-3 flex items-center justify-between border-t"
              style={{ borderColor: 'var(--peec-separator-primary)', background: 'var(--peec-bg-white)' }}
            >
              <span className="text-[11px] font-medium" style={{ color: 'var(--peec-fg-tertiary)' }}>
                {draft ? `${fullText.length} chars · 4 sections` : '—'}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  className="peec-btn peec-btn-secondary peec-btn-sm"
                  onClick={() => copy(fullText)}
                  disabled={!draft}
                >
                  Copy text
                </button>
                <button
                  className="peec-btn peec-btn-primary peec-btn-sm"
                  onClick={() => copy(fullText)}
                  disabled={!draft}
                >
                  {copied ? (
                    <>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M3 8.5l3 3 7-7"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Copied
                    </>
                  ) : (
                    <>
                      Copy & open original
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path
                          d="M5 3l5 5-5 5"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ScaffoldField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (next: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="peec-eyebrow">{label}</span>
        <span
          className="text-[10px] font-medium tabular-nums"
          style={{ color: 'var(--peec-fg-quaternary)' }}
        >
          {value.length}
        </span>
      </div>
      <textarea
        ref={ref}
        className="peec-input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        style={{ overflow: 'hidden' }}
      />
    </div>
  );
}
