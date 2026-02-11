import { useState, useRef, useCallback, useEffect } from "react";

// ── Design System Tokens (matching globals.css :root / .theme-purple) ──
const T = {
  bg: "#0c0a15",
  surface: "#1a1625",
  border: "#2d2640",
  primary: "#a78bfa",
  primaryMuted: "#7c3aed",
  text: "#f5f3ff",
  textMuted: "#a1a1aa",
  positive: "#a78bfa",
  negative: "#fb923c",
  accent: "#c4b5fd",
  embedBg: "#110e1c",
  gradStart: "#a78bfa",
  gradEnd: "#7c3aed",
  // Semantic
  support: "#a78bfa",      // positive = primary purple
  supportDim: "rgba(167,139,250,0.1)",
  supportBorder: "rgba(167,139,250,0.25)",
  challenge: "#fb923c",    // negative = orange
  challengeDim: "rgba(251,146,60,0.1)",
  challengeBorder: "rgba(251,146,60,0.25)",
};

const FONT = "'IBM Plex Mono', 'SF Mono', 'Fira Code', 'Consolas', monospace";

// ── Mock Data ──
const MOCK = {
  claim: "The SEC will approve at least one spot Ethereum ETF with staking capabilities before December 31, 2026, allowing institutional investors to earn staking rewards directly through a regulated ETF product.",
  netBelief: 72,
  change24h: +4.2,
  supporters: 184,
  challengers: 71,
  totalCommitted: "14.2 ETH",
  rewardPool: "2.8 ETH",
  participants: 255,
  avgHoldSupport: "12.4d",
  avgHoldChallenge: "6.1d",
  capitalSupport: "10.8 ETH",
  capitalChallenge: "3.4 ETH",
  userPositions: [
    { side: "support", amount: "0.5 ETH", since: "Jan 28", unrealized: "+0.08 ETH" },
  ],
  friends: [
    { name: "vitalik.eth", side: "support", avatar: "V" },
    { name: "jesse.fc", side: "support", avatar: "J" },
    { name: "dwr.eth", side: "challenge", avatar: "D" },
  ],
  activity: [
    { user: "anon42.eth", action: "supported", amount: "0.3 ETH", time: "2m ago", isNew: true },
    { user: "jesse.fc", action: "supported", amount: "1.2 ETH", time: "18m ago", isNew: true },
    { user: "dwr.eth", action: "challenged", amount: "0.8 ETH", time: "1h ago", isNew: false },
    { user: "crypkid.eth", action: "withdrew", amount: "0.1 ETH", time: "3h ago", isNew: false },
    { user: "alpha.fc", action: "supported", amount: "2.0 ETH", time: "5h ago", isNew: false },
  ],
};

const CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  *::-webkit-scrollbar { display: none; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
  @keyframes overlayIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .fade-up {
    animation: fadeUp 0.18s ease-out both;
  }
  .stagger-1 { animation-delay: 0.02s; }
  .stagger-2 { animation-delay: 0.04s; }
  .stagger-3 { animation-delay: 0.06s; }
  .stagger-4 { animation-delay: 0.08s; }
  .stagger-5 { animation-delay: 0.10s; }
`;

// ── Shared Primitives ──

function BeliefBar() {
  const pct = Math.round(50 + MOCK.netBelief / 2);
  const [ready, setReady] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setReady(true)); }, []);

  return (
    <div>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6,
      }}>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.support, fontFamily: FONT }}>
          {pct}%
        </span>
        <div style={{
          fontSize: 10, fontWeight: 600, fontFamily: FONT,
          color: MOCK.change24h > 0 ? T.support : T.challenge,
          background: MOCK.change24h > 0 ? T.supportDim : T.challengeDim,
          border: `1px solid ${MOCK.change24h > 0 ? T.supportBorder : T.challengeBorder}`,
          padding: "2px 7px", borderRadius: 4,
        }}>
          {MOCK.change24h > 0 ? "+" : ""}{MOCK.change24h}% 24h
        </div>
        <span style={{ fontSize: 20, fontWeight: 700, color: T.challenge, fontFamily: FONT }}>
          {100 - pct}%
        </span>
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginBottom: 5,
        fontSize: 10, color: T.textMuted, fontFamily: FONT, fontWeight: 500,
        textTransform: "uppercase", letterSpacing: 0.5,
      }}>
        <span>Support</span>
        <span>Challenge</span>
      </div>
      <div style={{
        height: 6, borderRadius: 3, overflow: "hidden",
        background: T.challengeDim, display: "flex",
      }}>
        <div style={{
          width: ready ? `${pct}%` : "50%",
          background: `linear-gradient(90deg, ${T.gradStart}, ${T.gradEnd})`,
          borderRadius: 3,
          transition: "width 0.7s cubic-bezier(0.16, 1, 0.3, 1)",
        }} />
      </div>
    </div>
  );
}

function Avatars() {
  return (
    <div style={{ display: "flex", alignItems: "center", marginTop: 10 }}>
      {MOCK.friends.slice(0, 4).map((f, i) => (
        <div key={i} style={{
          width: 24, height: 24, borderRadius: 99,
          background: f.side === "support" ? T.supportDim : T.challengeDim,
          border: `1.5px solid ${f.side === "support" ? T.supportBorder : T.challengeBorder}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 9, fontWeight: 700, fontFamily: FONT,
          color: f.side === "support" ? T.support : T.challenge,
          marginLeft: i > 0 ? -6 : 0, zIndex: 4 - i,
        }}>{f.avatar}</div>
      ))}
      <span style={{ fontSize: 11, color: T.textMuted, fontFamily: FONT, marginLeft: 6 }}>
        {MOCK.participants} participants
      </span>
    </div>
  );
}

function CompactStats() {
  const items = [
    { label: "Committed", val: MOCK.totalCommitted },
    { label: "Pool", val: MOCK.rewardPool },
    { label: "Avg Hold", val: MOCK.avgHoldSupport },
  ];
  return (
    <div style={{
      display: "flex", gap: 1, marginTop: 10,
      background: T.border, borderRadius: 8, overflow: "hidden",
    }}>
      {items.map((s, i) => (
        <div key={i} style={{
          flex: 1, textAlign: "center", padding: "8px 4px", background: T.surface,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, fontFamily: FONT }}>
            {s.val}
          </div>
          <div style={{
            fontSize: 8, color: T.textMuted, textTransform: "uppercase",
            letterSpacing: 0.6, marginTop: 1, fontWeight: 600, fontFamily: FONT,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function InlinePosition({ pos, onClick }) {
  const side = pos.side === "support";
  return (
    <button onClick={onClick} style={{
      width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "7px 10px", borderRadius: 8, cursor: "pointer",
      background: side ? T.supportDim : T.challengeDim,
      border: `1px solid ${side ? T.supportBorder : T.challengeBorder}`,
      fontFamily: FONT,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{
          width: 5, height: 5, borderRadius: 99,
          background: side ? T.support : T.challenge,
          boxShadow: `0 0 5px ${side ? T.support : T.challenge}60`,
        }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{pos.amount}</span>
        <span style={{ fontSize: 10, color: T.textMuted }}>{pos.side}</span>
      </div>
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: FONT,
        color: pos.unrealized.startsWith("+") ? T.support : T.challenge,
      }}>{pos.unrealized}</span>
    </button>
  );
}

// ── Tab Contents ──

function SignalTab() {
  const caps = [
    { label: "Capital (Support)", value: MOCK.capitalSupport, pct: 76, color: T.support },
    { label: "Capital (Challenge)", value: MOCK.capitalChallenge, pct: 24, color: T.challenge },
  ];
  const holds = [
    { label: "Avg Hold (Support)", value: MOCK.avgHoldSupport },
    { label: "Avg Hold (Challenge)", value: MOCK.avgHoldChallenge },
  ];

  return (
    <div className="fade-up">
      {/* Capital Distribution */}
      <div style={{ marginBottom: 14 }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: 0.8, color: T.textMuted, marginBottom: 8, fontFamily: FONT,
        }}>Capital Distribution</div>
        {caps.map((c, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", fontSize: 11,
              color: T.textMuted, marginBottom: 3, fontFamily: FONT,
            }}>
              <span>{c.label}</span>
              <span style={{ color: c.color, fontWeight: 600 }}>{c.value}</span>
            </div>
            <div style={{ height: 3, background: T.border, borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                width: `${c.pct}%`, height: "100%", borderRadius: 2,
                background: c.color, opacity: 0.65,
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* Hold Times */}
      <div style={{
        display: "flex", gap: 1, background: T.border, borderRadius: 8, overflow: "hidden",
        marginBottom: 16,
      }}>
        {holds.map((h, i) => (
          <div key={i} style={{ flex: 1, padding: "8px 10px", background: T.surface }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: T.text, fontFamily: FONT }}>
              {h.value}
            </div>
            <div style={{
              fontSize: 8, color: T.textMuted, textTransform: "uppercase",
              letterSpacing: 0.6, marginTop: 1, fontFamily: FONT, fontWeight: 600,
            }}>{h.label}</div>
          </div>
        ))}
      </div>

      {/* Friends */}
      <div style={{
        fontSize: 10, fontWeight: 700, textTransform: "uppercase",
        letterSpacing: 0.8, color: T.textMuted, marginBottom: 8, fontFamily: FONT,
      }}>Friends in Market</div>
      {MOCK.friends.map((f, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "8px 0",
          borderBottom: i < MOCK.friends.length - 1 ? `1px solid ${T.border}60` : "none",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 6,
              background: f.side === "support" ? T.supportDim : T.challengeDim,
              border: `1px solid ${f.side === "support" ? T.supportBorder : T.challengeBorder}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 11, fontWeight: 700, fontFamily: FONT,
              color: f.side === "support" ? T.support : T.challenge,
            }}>{f.avatar}</div>
            <span style={{ fontSize: 12, fontWeight: 600, color: T.text, fontFamily: FONT }}>
              {f.name}
            </span>
          </div>
          <span style={{
            fontSize: 9, fontWeight: 700, textTransform: "uppercase",
            letterSpacing: 0.4, padding: "2px 6px", borderRadius: 4,
            fontFamily: FONT,
            background: f.side === "support" ? T.supportDim : T.challengeDim,
            color: f.side === "support" ? T.support : T.challenge,
            border: `1px solid ${f.side === "support" ? T.supportBorder : T.challengeBorder}`,
          }}>{f.side}</span>
        </div>
      ))}
    </div>
  );
}

function ActivityTab() {
  return (
    <div>
      {MOCK.activity.map((a, i) => {
        const isSup = a.action.includes("support");
        const isWithdraw = a.action === "withdrew";
        const color = isWithdraw ? T.textMuted : isSup ? T.support : T.challenge;
        return (
          <div key={i}
            className={`fade-up stagger-${Math.min(i + 1, 5)}`}
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 0", borderBottom: `1px solid ${T.border}40`,
            }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 6,
                background: isWithdraw ? T.embedBg : isSup ? T.supportDim : T.challengeDim,
                border: `1px solid ${isWithdraw ? T.border : isSup ? T.supportBorder : T.challengeBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 10, fontWeight: 700, color, fontFamily: FONT,
              }}>{a.user[0].toUpperCase()}</div>
              <div>
                <div style={{ fontSize: 12, color: T.text, fontWeight: 600, fontFamily: FONT }}>
                  {a.user}
                </div>
                <div style={{ fontSize: 10, color: T.textMuted, fontFamily: FONT }}>
                  <span style={{ color }}>{a.action}</span> · {a.amount}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {a.isNew && (
                <div style={{
                  width: 4, height: 4, borderRadius: 99,
                  background: T.primary, boxShadow: `0 0 4px ${T.primary}`,
                }} />
              )}
              <span style={{ fontSize: 10, color: T.textMuted, fontFamily: FONT }}>{a.time}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PositionTab() {
  if (!MOCK.userPositions.length) {
    return (
      <div className="fade-up" style={{
        padding: 28, textAlign: "center", borderRadius: 8,
        border: `1px dashed ${T.border}`, background: T.surface,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.text, fontFamily: FONT, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.8 }}>
          No active positions
        </div>
        <div style={{ fontSize: 11, color: T.textMuted, fontFamily: FONT, lineHeight: 1.5 }}>
          Support or Challenge this claim to open a position and earn from the reward pool.
        </div>
      </div>
    );
  }

  return MOCK.userPositions.map((pos, i) => {
    const side = pos.side === "support";
    return (
      <div key={i} className="fade-up" style={{
        padding: 14, background: T.surface, borderRadius: 8,
        border: `1px solid ${side ? T.supportBorder : T.challengeBorder}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{
              width: 6, height: 6, borderRadius: 99,
              background: side ? T.support : T.challenge,
              boxShadow: `0 0 6px ${side ? T.support : T.challenge}50`,
            }} />
            <span style={{
              fontSize: 10, fontWeight: 700, textTransform: "uppercase",
              letterSpacing: 0.8, color: side ? T.support : T.challenge, fontFamily: FONT,
            }}>{pos.side}</span>
          </div>
          <span style={{ fontSize: 10, color: T.textMuted, fontFamily: FONT }}>since {pos.since}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
          <div>
            <div style={{
              fontSize: 8, color: T.textMuted, textTransform: "uppercase",
              letterSpacing: 0.6, marginBottom: 1, fontFamily: FONT,
            }}>Committed</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: T.text, fontFamily: FONT }}>
              {pos.amount}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 8, color: T.textMuted, textTransform: "uppercase",
              letterSpacing: 0.6, marginBottom: 1, fontFamily: FONT,
            }}>Unrealized</div>
            <div style={{
              fontSize: 18, fontWeight: 700, fontFamily: FONT,
              color: pos.unrealized.startsWith("+") ? T.support : T.challenge,
            }}>{pos.unrealized}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            flex: 1, padding: "9px 0", borderRadius: 8, fontFamily: FONT,
            border: `1px solid ${T.border}`, background: T.embedBg,
            color: T.textMuted, fontSize: 11, fontWeight: 600, cursor: "pointer",
          }}>Withdraw</button>
          <button style={{
            flex: 1, padding: "9px 0", borderRadius: 8, fontFamily: FONT,
            border: "none",
            background: `linear-gradient(135deg, ${T.gradStart}, ${T.gradEnd})`,
            color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer",
          }}>Claim Reward</button>
        </div>
      </div>
    );
  });
}

// ── Bottom Sheet ──

function BottomSheet({ open, onClose }) {
  if (!open) return null;
  const steps = [
    { n: "01", title: "Commit Capital", desc: "Support or Challenge a claim by committing ETH. Your position earns rewards based on conviction over time." },
    { n: "02", title: "Time-Weighted Signal", desc: "Earlier and longer commitments generate stronger belief signals. The market reflects genuine conviction, not just capital." },
    { n: "03", title: "Earn Rewards", desc: "When you're on the right side, claim rewards from the pool. The longer you hold, the larger your share." },
  ];
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 50 }}>
      <div onClick={onClose} style={{
        position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)",
        animation: "overlayIn 0.2s ease-out",
      }} />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        background: T.surface, borderRadius: "16px 16px 0 0",
        padding: "14px 18px 22px", fontFamily: FONT,
        animation: "sheetUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        maxHeight: "65%", overflowY: "auto",
      }}>
        <div style={{ width: 32, height: 3, borderRadius: 99, background: T.border, margin: "0 auto 14px" }} />
        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 12 }}>
          How Belief Markets Work
        </div>
        {steps.map((s, i) => (
          <div key={i} style={{
            display: "flex", gap: 10, padding: "10px 0",
            borderBottom: i < 2 ? `1px solid ${T.border}60` : "none",
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, color: T.primary,
              fontFamily: FONT, minWidth: 18,
            }}>{s.n}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>
                {s.title}
              </div>
              <div style={{ fontSize: 11, color: T.textMuted, lineHeight: 1.5 }}>
                {s.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main ──

export default function MarketDetailTabs() {
  const [claimOpen, setClaimOpen] = useState(false);
  const [tab, setTab] = useState(0);
  const [tabKey, setTabKey] = useState(0);
  const [sheet, setSheet] = useState(false);
  const touchX = useRef(null);
  const touchY = useRef(null);

  const hasPos = MOCK.userPositions.length > 0;
  const newCount = MOCK.activity.filter(a => a.isNew).length;

  const tabs = [
    { label: "Signal", badge: null },
    { label: "Activity", badge: newCount || null },
    { label: "Position", badge: hasPos ? MOCK.userPositions.length : null },
  ];

  const switchTab = (i) => { setTab(i); setTabKey(k => k + 1); };

  const onTouchStart = (e) => {
    touchX.current = e.touches[0].clientX;
    touchY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    const dy = e.changedTouches[0].clientY - touchY.current;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      const next = tab + (dx < 0 ? 1 : -1);
      if (next >= 0 && next < tabs.length) switchTab(next);
    }
    touchX.current = null;
  };

  return (
    <div style={{
      maxWidth: 420, margin: "0 auto", height: "100vh",
      background: T.bg, fontFamily: FONT, color: T.text,
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column",
    }}>
      <style>{CSS}</style>

      <div style={{ flex: 1, overflowY: "auto", padding: "10px 16px", paddingBottom: 88 }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}
      >
        {/* Back */}
        <button style={{
          background: "none", border: "none", color: T.textMuted,
          fontSize: 12, fontFamily: FONT, cursor: "pointer",
          padding: "4px 0", marginBottom: 8,
        }}>← back</button>

        {/* Claim */}
        <div style={{ marginBottom: 12 }}>
          <p style={{
            fontSize: 14, lineHeight: 1.5, color: T.text, fontWeight: 500, fontFamily: FONT,
            ...(claimOpen ? {} : {
              display: "-webkit-box", WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical", overflow: "hidden",
            }),
          }}>{MOCK.claim}</p>
          {MOCK.claim.length > 120 && (
            <button onClick={() => setClaimOpen(!claimOpen)} style={{
              background: "none", border: "none", color: T.primary,
              fontSize: 11, fontFamily: FONT, cursor: "pointer",
              padding: "3px 0 0", fontWeight: 600,
            }}>{claimOpen ? "show less" : "read more"}</button>
          )}
        </div>

        {/* Inline Position */}
        {hasPos && (
          <div style={{ marginBottom: 10 }}>
            <InlinePosition pos={MOCK.userPositions[0]} onClick={() => switchTab(2)} />
          </div>
        )}

        {/* Primary Belief Signal */}
        <div style={{
          padding: 14, background: T.surface, borderRadius: 8,
          border: `1px solid ${T.border}`, marginBottom: 12,
        }}>
          <BeliefBar />
          <Avatars />
          <CompactStats />
          <button onClick={() => setSheet(true)} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 5, width: "100%", marginTop: 10,
            padding: "7px 0", borderRadius: 6,
            background: `${T.primary}10`, border: `1px solid ${T.supportBorder}`,
            color: T.primary, fontSize: 11, fontWeight: 600,
            fontFamily: FONT, cursor: "pointer",
          }}>
            how does this work? →
          </button>
        </div>

        {/* Tab Bar — underline style */}
        <div style={{
          display: "flex",
          borderBottom: `1px solid ${T.border}`,
          marginBottom: 12,
          position: "sticky", top: 0, background: T.bg, zIndex: 10,
          paddingTop: 2,
        }}>
          {tabs.map((t, i) => (
            <button key={i} onClick={() => switchTab(i)}
              role="tab" aria-selected={tab === i}
              style={{
                flex: 1, padding: "9px 0", background: "none", border: "none",
                borderBottom: `2px solid ${tab === i ? T.primary : "transparent"}`,
                color: tab === i ? T.text : T.textMuted,
                fontSize: 11, fontWeight: tab === i ? 700 : 500,
                fontFamily: FONT, cursor: "pointer",
                transition: "color 0.15s, border-color 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
              }}>
              {t.label}
              {t.badge !== null && (
                <span style={{
                  fontSize: 8, fontWeight: 700, fontFamily: FONT,
                  minWidth: 14, height: 14, borderRadius: 99,
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  padding: "0 3px",
                  background: i === 2 ? T.supportDim : `${T.primary}15`,
                  color: i === 2 ? T.support : T.primary,
                  border: `1px solid ${i === 2 ? T.supportBorder : T.supportBorder}`,
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div key={tabKey} role="tabpanel">
          {tab === 0 && <SignalTab />}
          {tab === 1 && <ActivityTab />}
          {tab === 2 && <PositionTab />}
        </div>
      </div>

      {/* Sticky CTA */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 16px 14px", paddingTop: 22,
        background: `linear-gradient(transparent, ${T.bg} 28%)`,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{
            flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
            background: `linear-gradient(135deg, ${T.gradStart}, ${T.gradEnd})`,
            color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT,
            cursor: "pointer", boxShadow: `0 4px 16px ${T.primary}25`,
          }}>Support</button>
          <button style={{
            flex: 1, padding: "12px 0", borderRadius: 8, border: "none",
            background: `linear-gradient(135deg, ${T.challenge}, #f97316)`,
            color: "#fff", fontSize: 13, fontWeight: 700, fontFamily: FONT,
            cursor: "pointer", boxShadow: `0 4px 16px ${T.challenge}25`,
          }}>Challenge</button>
        </div>
      </div>

      <BottomSheet open={sheet} onClose={() => setSheet(false)} />
    </div>
  );
}