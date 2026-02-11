import React, { useState, useEffect } from 'react';

// ═══════════════════════════════════════════════════════════════════════════════
// SERIOUS SOCIAL — EMBED + MINI-APP SHOWCASE
// Three palettes: Amber Terminal, Phantom Purple, Rain Pink
// Shows: Warpcast compose embed, feed embed, and full mini-app view
// ═══════════════════════════════════════════════════════════════════════════════

const PALETTES = {
  amber: {
    name: 'Amber Terminal',
    desc: 'Bloomberg serious money',
    bg: '#0d0b07',
    surface: '#1a1610',
    border: '#2d2820',
    primary: '#f59e0b',
    primaryMuted: '#b45309',
    text: '#fafaf9',
    textMuted: '#a8a29e',
    positive: '#fbbf24',
    negative: '#94a3b8',
    accent: '#fcd34d',
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    embedBg: '#13100a',
  },
  purple: {
    name: 'Phantom Purple',
    desc: 'Modern crypto native',
    bg: '#0c0a15',
    surface: '#1a1625',
    border: '#2d2640',
    primary: '#a78bfa',
    primaryMuted: '#7c3aed',
    text: '#f5f3ff',
    textMuted: '#a1a1aa',
    positive: '#a78bfa',
    negative: '#fb923c',
    accent: '#c4b5fd',
    gradient: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
    embedBg: '#110e1c',
  },
  rain: {
    name: 'Rain Pink',
    desc: 'rain.xyz inspired — bold & vibrant',
    bg: '#0d0710',
    surface: '#1a0f1e',
    border: '#2d1f35',
    primary: '#E42D9A',
    primaryMuted: '#be1b7e',
    text: '#fdf2f8',
    textMuted: '#a78baf',
    positive: '#f472b6',
    negative: '#64748b',
    accent: '#fb7dc0',
    gradient: 'linear-gradient(135deg, #E42D9A 0%, #9333ea 100%)',
    embedBg: '#120a15',
  },
};

const MARKET = {
  author: 'webthe3rd.eth',
  claim: 'Serious mini-app design question: How would you think about visualizing a "belief curve", which could be thought of as a time-weighted version of a prediction market\'s outcome…',
  supportPct: 100,
  committed: 98,
  participants: 3,
  status: 'unchallenged',
  avgSupportHold: '2d 3h',
  avgChallengeHold: '--',
  supportCapital: 98.00,
  challengeCapital: 0.00,
  totalCommitted: 98.00,
  rewardPool: 2.00,
};

const MARKET_2 = {
  author: 'webthe3rd.eth',
  claim: 'Opinion markets will matter in 2026 — but we need to be careful what we optimize for. I think opinion markets are going to be an important meta in 2026…',
  supportPct: 64,
  committed: 252,
  participants: 12,
  status: 'active',
  change: -11.5,
};

// ═══════════════════════════════════════════════════════════════════════════════
// WARPCAST COMPOSE WINDOW — Shows embed as it appears when sharing
// ═══════════════════════════════════════════════════════════════════════════════

function WarpcastCompose({ palette }) {
  const p = PALETTES[palette];

  return (
    <div style={{
      background: '#1a1a2e',
      borderRadius: '16px',
      border: '1px solid #2a2a44',
      width: '100%',
      maxWidth: '420px',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 20px',
        borderBottom: '1px solid #2a2a44',
      }}>
        <div style={{ display: 'flex', gap: '16px' }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: '15px', borderBottom: '2px solid #7c5cfc', paddingBottom: '8px' }}>Compose</span>
          <span style={{ color: '#666', fontSize: '15px' }}>Drafts</span>
        </div>
        <span style={{ color: '#666', fontSize: '20px', cursor: 'pointer' }}>✕</span>
      </div>

      {/* Content */}
      <div style={{ padding: '16px 20px' }}>
        {/* User avatar + text */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
            flexShrink: 0,
          }} />
          <div style={{ color: '#e0e0e0', fontSize: '15px', lineHeight: 1.5 }}>
            Check out this belief market. Put your money where your mouth is.
          </div>
        </div>

        {/* EMBED PREVIEW — This is the key piece */}
        <div style={{
          borderRadius: '12px',
          overflow: 'hidden',
          border: `1px solid ${p.border}`,
        }}>
          {/* Embed Image Area (1.91:1) */}
          <div style={{
            aspectRatio: '1.91 / 1',
            background: p.embedBg,
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: '"IBM Plex Mono", monospace',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Subtle grid texture */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${p.border}40 1px, transparent 1px),
                linear-gradient(90deg, ${p.border}40 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px',
              opacity: 0.3,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              {/* Top row */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '12px',
              }}>
                <span style={{
                  color: p.primary,
                  fontSize: '13px',
                  fontWeight: 700,
                  letterSpacing: '2px',
                }}>
                  SERIOUS.SOCIAL
                </span>
                <span style={{
                  color: p.accent,
                  fontSize: '10px',
                  padding: '4px 8px',
                  border: `1px solid ${p.accent}`,
                  letterSpacing: '1px',
                }}>
                  ⚡ UNCHALLENGED
                </span>
              </div>

              {/* Claim */}
              <div style={{
                color: p.text,
                fontSize: '13px',
                lineHeight: 1.5,
                opacity: 0.9,
                maxHeight: '60px',
                overflow: 'hidden',
              }}>
                "{MARKET.claim.slice(0, 100)}…"
              </div>
            </div>

            {/* Bottom stats */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              gap: '20px',
              alignItems: 'flex-end',
              paddingTop: '8px',
              borderTop: `1px solid ${p.border}`,
            }}>
              <div>
                <div style={{ color: p.primary, fontSize: '20px', fontWeight: 700 }}>
                  ${MARKET.committed}
                </div>
                <div style={{ color: p.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>
                  STAKED
                </div>
              </div>
              <div>
                <div style={{ color: p.text, fontSize: '20px', fontWeight: 700 }}>
                  {MARKET.participants}
                </div>
                <div style={{ color: p.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>
                  BELIEVERS
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ color: p.text, fontSize: '20px', fontWeight: 700 }}>
                  100%
                </div>
                <div style={{ color: p.textMuted, fontSize: '10px', letterSpacing: '0.5px' }}>
                  SUPPORT
                </div>
              </div>
            </div>
          </div>

          {/* CTA Button — Warpcast renders this below the image */}
          <button style={{
            width: '100%',
            padding: '14px',
            background: p.gradient,
            border: 'none',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: '-apple-system, sans-serif',
          }}>
            Support or Challenge
          </button>
        </div>
      </div>

      {/* Bottom toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderTop: '1px solid #2a2a44',
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            background: '#2a2a44',
            borderRadius: '20px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            <span style={{ fontSize: '16px' }}>🏠</span>
            <span style={{ color: '#666', fontSize: '12px' }}>▾</span>
          </div>
          <span style={{ fontSize: '18px', opacity: 0.5 }}>🖼️</span>
          <span style={{ fontSize: '18px', opacity: 0.5 }}>😊</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            border: '2px solid #444',
          }} />
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            background: '#333',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '16px',
          }}>+</div>
          <button style={{
            background: '#7c5cfc',
            color: '#fff',
            border: 'none',
            borderRadius: '20px',
            padding: '8px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Cast
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WARPCAST FEED CARD — How it looks in someone's timeline
// ═══════════════════════════════════════════════════════════════════════════════

function FeedEmbed({ palette, market }) {
  const p = PALETTES[palette];
  const m = market || MARKET;

  return (
    <div style={{
      background: '#16161e',
      borderRadius: '12px',
      border: '1px solid #2a2a44',
      width: '100%',
      maxWidth: '420px',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Post header */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #4ade80, #22d3ee)',
            flexShrink: 0,
          }} />
          <div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '14px' }}>
                mumar.eth
              </span>
              <span style={{ color: '#666', fontSize: '13px' }}>@mumar</span>
              <span style={{ color: '#444', fontSize: '13px' }}>· 2m</span>
            </div>
            <div style={{ color: '#c0c0c0', fontSize: '14px', marginTop: '4px', lineHeight: 1.5 }}>
              Check out this belief market. Put your money where your mouth is. 🎯
            </div>
          </div>
        </div>
      </div>

      {/* Embed */}
      <div style={{ padding: '8px 16px 14px' }}>
        <div style={{
          borderRadius: '10px',
          overflow: 'hidden',
          border: `1px solid ${p.border}`,
        }}>
          {/* Embed Image */}
          <div style={{
            aspectRatio: '1.91 / 1',
            background: p.embedBg,
            padding: '18px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            fontFamily: '"IBM Plex Mono", monospace',
            position: 'relative',
          }}>
            {/* Grid */}
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${p.border}40 1px, transparent 1px),
                linear-gradient(90deg, ${p.border}40 1px, transparent 1px)
              `,
              backgroundSize: '28px 28px',
              opacity: 0.25,
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px',
              }}>
                <span style={{ color: p.primary, fontSize: '12px', fontWeight: 700, letterSpacing: '2px' }}>
                  SERIOUS.SOCIAL
                </span>
                {m.status === 'unchallenged' ? (
                  <span style={{
                    color: p.accent,
                    fontSize: '9px',
                    padding: '3px 7px',
                    border: `1px solid ${p.accent}`,
                    letterSpacing: '0.5px',
                  }}>
                    ⚡ UNCHALLENGED
                  </span>
                ) : (
                  <span style={{
                    color: p.textMuted,
                    fontSize: '9px',
                    padding: '3px 7px',
                    border: `1px solid ${p.border}`,
                  }}>
                    {m.supportPct}% SUPPORT
                  </span>
                )}
              </div>

              <div style={{
                color: p.text,
                fontSize: '12px',
                lineHeight: 1.5,
                opacity: 0.85,
                maxHeight: '54px',
                overflow: 'hidden',
              }}>
                "{m.claim.slice(0, 90)}…"
              </div>
            </div>

            <div style={{
              position: 'relative',
              zIndex: 1,
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-end',
              paddingTop: '8px',
              borderTop: `1px solid ${p.border}`,
            }}>
              <div>
                <div style={{ color: p.primary, fontSize: '16px', fontWeight: 700 }}>
                  ${m.committed}
                </div>
                <div style={{ color: p.textMuted, fontSize: '9px' }}>STAKED</div>
              </div>
              <div>
                <div style={{ color: p.text, fontSize: '16px', fontWeight: 700 }}>
                  {m.participants}
                </div>
                <div style={{ color: p.textMuted, fontSize: '9px' }}>BELIEVERS</div>
              </div>
              {m.status !== 'unchallenged' && (
                <div style={{ marginLeft: 'auto' }}>
                  <div style={{ display: 'flex', gap: '1px', width: '60px', height: '6px' }}>
                    <div style={{ width: `${m.supportPct}%`, background: p.positive, height: '100%' }} />
                    <div style={{ flex: 1, background: p.negative, opacity: 0.4, height: '100%' }} />
                  </div>
                  <div style={{ color: p.textMuted, fontSize: '9px', marginTop: '3px', textAlign: 'right' }}>
                    {m.supportPct}% / {100 - m.supportPct}%
                  </div>
                </div>
              )}
              {m.status === 'unchallenged' && (
                <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                  <div style={{ color: p.text, fontSize: '16px', fontWeight: 700 }}>100%</div>
                  <div style={{ color: p.textMuted, fontSize: '9px' }}>SUPPORT</div>
                </div>
              )}
            </div>
          </div>

          {/* CTA */}
          <button style={{
            width: '100%',
            padding: '12px',
            background: p.gradient,
            border: 'none',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            Support or Challenge
          </button>
        </div>
      </div>

      {/* Engagement row */}
      <div style={{
        padding: '4px 16px 14px',
        display: 'flex',
        gap: '32px',
        color: '#555',
        fontSize: '13px',
      }}>
        <span>💬 3</span>
        <span>🔁 7</span>
        <span>❤️ 24</span>
        <span style={{ marginLeft: 'auto' }}>🔖</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MINI-APP VIEW — Full screen after launching from embed
// ═══════════════════════════════════════════════════════════════════════════════

function MiniApp({ palette }) {
  const p = PALETTES[palette];

  return (
    <div style={{
      width: '100%',
      maxWidth: '420px',
      background: p.bg,
      borderRadius: '16px',
      border: `1px solid ${p.border}`,
      overflow: 'hidden',
      fontFamily: '"IBM Plex Mono", monospace',
    }}>
      {/* Farcaster header bar */}
      <div style={{
        background: p.surface,
        padding: '12px 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: `1px solid ${p.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: p.textMuted, fontSize: '18px' }}>←</span>
          <span style={{ color: p.primary, fontSize: '16px' }}>⊞</span>
          <div>
            <div style={{ color: p.text, fontSize: '14px', fontWeight: 600 }}>
              Serious Social
            </div>
            <div style={{ color: p.textMuted, fontSize: '11px' }}>by mumar</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', color: p.textMuted, fontSize: '16px' }}>
          <span>⋯</span>
          <span>⌄</span>
          <span>✕</span>
        </div>
      </div>

      {/* App content */}
      <div style={{ padding: '20px 16px' }}>
        {/* Net Belief Signal */}
        <div style={{
          fontSize: '12px',
          color: p.textMuted,
          marginBottom: '8px',
        }}>
          ⚖️ Net Belief Signal
        </div>

        <div style={{
          background: p.primary,
          padding: '10px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ color: p.bg, fontSize: '13px', fontWeight: 500 }}>Support</span>
          <span style={{ color: p.bg, fontSize: '18px', fontWeight: 700 }}>100%</span>
          <span style={{ color: p.bg, fontSize: '13px', opacity: 0.5 }}>Challenge</span>
        </div>

        {/* How it works link */}
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <a href="#" style={{
            color: p.primary,
            fontSize: '13px',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
          }}>
            How does this work?
          </a>
        </div>

        {/* Stats Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          marginBottom: '20px',
        }}>
          {[
            { label: 'Avg Support Hold', value: '2d 3h', accent: false },
            { label: 'Avg Challenge Hold', value: '--', accent: false },
            { label: 'Support Capital', value: '$98.00', accent: true },
            { label: 'Challenge Capital', value: '$0.00', accent: false },
            { label: 'Total Committed', value: '$98.00', accent: true },
            { label: 'Reward Pool', value: '$2.00', accent: true },
          ].map((stat, i) => (
            <div key={i} style={{
              background: p.surface,
              border: `1px solid ${p.border}`,
              padding: '16px 12px',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: '20px',
                fontWeight: 600,
                color: stat.accent ? p.primary : p.text,
                marginBottom: '4px',
              }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '10px',
                color: p.textMuted,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* No counter signal */}
        <p style={{
          textAlign: 'center',
          fontStyle: 'italic',
          color: p.textMuted,
          marginBottom: '20px',
          fontSize: '13px',
        }}>
          No counter-signal yet
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
          <button style={{
            flex: 1,
            background: 'transparent',
            border: `1px solid ${p.border}`,
            color: p.text,
            padding: '14px',
            fontFamily: 'inherit',
            fontSize: '14px',
            cursor: 'pointer',
          }}>
            SUPPORT
          </button>
          <button style={{
            flex: 1,
            background: p.gradient,
            border: 'none',
            color: '#fff',
            padding: '14px',
            fontFamily: 'inherit',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}>
            CHALLENGE
          </button>
        </div>

        {/* Share */}
        <button style={{
          width: '100%',
          background: p.surface,
          border: `1px solid ${p.border}`,
          color: p.textMuted,
          padding: '12px',
          fontFamily: 'inherit',
          fontSize: '13px',
          cursor: 'pointer',
          marginBottom: '12px',
        }}>
          Share this market
        </button>

        {/* How it works collapsible */}
        <div style={{
          color: p.textMuted,
          fontSize: '13px',
          padding: '8px 0',
          borderTop: `1px solid ${p.border}`,
        }}>
          ► How it works
        </div>

        {/* Contract info */}
        <div style={{
          display: 'flex',
          gap: '8px',
          alignItems: 'center',
          padding: '8px 0',
          borderTop: `1px solid ${p.border}`,
          marginTop: '8px',
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: p.border,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: p.textMuted,
          }}>N</div>
          <div style={{ fontSize: '11px', color: p.textMuted }}>
            <div>Market: 0x319B502A…7308615c</div>
            <div>Post ID: 0x47c2d212…472b40d8</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SHOWCASE
// ═══════════════════════════════════════════════════════════════════════════════

export default function SeriousSocialEmbeds() {
  const [palette, setPalette] = useState('amber');
  const [view, setView] = useState('all');

  const p = PALETTES[palette];

  return (
    <div style={{
      minHeight: '100vh',
      background: '#09090b',
      color: '#e4e4e7',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Controls */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(9,9,11,0.95)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid #27272a',
        padding: '16px 20px',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
            {Object.entries(PALETTES).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setPalette(key)}
                style={{
                  background: palette === key ? val.primary : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${palette === key ? val.primary : 'rgba(255,255,255,0.1)'}`,
                  color: palette === key ? (key === 'ink' ? '#000' : '#fff') : '#888',
                  padding: '10px 20px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: '13px',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ fontWeight: 700 }}>{val.name}</div>
                <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '2px' }}>{val.desc}</div>
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: 'All Views' },
              { id: 'compose', label: 'Compose' },
              { id: 'feed', label: 'Feed' },
              { id: 'app', label: 'Mini-App' },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                style={{
                  background: view === v.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: view === v.id ? '#fff' : '#666',
                  padding: '6px 14px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '32px 20px',
      }}>
        {view === 'all' ? (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
            gap: '32px',
            alignItems: 'start',
          }}>
            <div>
              <div style={{
                fontSize: '12px',
                color: p.primary,
                fontFamily: '"IBM Plex Mono", monospace',
                marginBottom: '12px',
                letterSpacing: '1px',
              }}>
                01 — WARPCAST COMPOSE WINDOW
              </div>
              <div style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}>
                How it looks when someone shares your market in Warpcast.
                The embed image auto-renders at 1.91:1 with CTA button below.
              </div>
              <WarpcastCompose palette={palette} />
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: p.primary,
                fontFamily: '"IBM Plex Mono", monospace',
                marginBottom: '12px',
                letterSpacing: '1px',
              }}>
                02 — FEED EMBED (UNCHALLENGED)
              </div>
              <div style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}>
                How it appears in someone's timeline. Users scroll past dozens
                of casts — your embed needs to convey value in ~2 seconds.
              </div>
              <FeedEmbed palette={palette} />

              <div style={{ marginTop: '24px' }}>
                <div style={{
                  fontSize: '12px',
                  color: p.primary,
                  fontFamily: '"IBM Plex Mono", monospace',
                  marginBottom: '12px',
                  letterSpacing: '1px',
                }}>
                  03 — FEED EMBED (ACTIVE MARKET)
                </div>
                <FeedEmbed palette={palette} market={MARKET_2} />
              </div>
            </div>

            <div>
              <div style={{
                fontSize: '12px',
                color: p.primary,
                fontFamily: '"IBM Plex Mono", monospace',
                marginBottom: '12px',
                letterSpacing: '1px',
              }}>
                04 — MINI-APP (424×695px)
              </div>
              <div style={{
                fontSize: '11px',
                color: '#666',
                marginBottom: '16px',
                lineHeight: 1.6,
              }}>
                Full-screen app after tapping "Support or Challenge".
                Matches your current layout structure with new palette.
              </div>
              <MiniApp palette={palette} />
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px',
          }}>
            {view === 'compose' && <WarpcastCompose palette={palette} />}
            {view === 'feed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <FeedEmbed palette={palette} />
                <FeedEmbed palette={palette} market={MARKET_2} />
              </div>
            )}
            {view === 'app' && <MiniApp palette={palette} />}
          </div>
        )}
      </div>
    </div>
  );
}