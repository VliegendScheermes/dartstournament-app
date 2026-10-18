'use client';

/**
 * OBS Scoreboard Overlay
 * Transparent 1920x1080 page — add as Browser Source in OBS with "Allow transparency" enabled.
 * Polls live match state from /api/tournaments/[id]/live-match (written by the scoreboard page).
 * Score announcements and Barney animations fire only for events with a new sequence number,
 * never on page load and never based on score differences.
 */

import { use, useState, useEffect } from 'react';
import { soundPlayer } from '@/lib/audio/soundPlayer';
import {
  announcementScore,
  detectNewLiveEvents,
  INITIAL_SEEN_LIVE_EVENTS,
  type LiveMatchBarney,
  type LiveMatchEvent,
} from '@/lib/scoring/liveMatch';

const CHECKOUTS: Record<number, string> = {
  170: 'T20 T20 D25', 167: 'T20 T19 D25', 164: 'T20 T18 D25',
  161: 'T20 T17 D25', 160: 'T20 T20 D20', 158: 'T20 T20 D19',
  157: 'T20 T19 D20', 156: 'T20 T20 D18', 155: 'T20 T19 D19',
  154: 'T20 T18 D20', 153: 'T20 T19 D18', 152: 'T20 T20 D16',
  151: 'T20 T17 D20', 150: 'T20 T18 D18', 149: 'T20 T19 D16',
  148: 'T20 T16 D20', 147: 'T20 T17 D18', 146: 'T20 T18 D16',
  145: 'T20 T19 D14', 144: 'T20 T20 D12', 143: 'T20 T17 D16',
  142: 'T20 T14 D20', 141: 'T20 T19 D12', 140: 'T20 T16 D16',
  139: 'T20 T13 D20', 138: 'T20 T18 D12', 137: 'T20 T15 D16',
  136: 'T20 T20 D8',  135: 'T20 T17 D12', 134: 'T20 T14 D16',
  133: 'T20 T19 D8',  132: 'T20 T16 D12', 131: 'T20 T13 D16',
  130: 'T20 T18 D8',  129: 'T19 T16 D12', 128: 'T20 T16 D10',
  127: 'T20 T17 D8',  126: 'T19 T19 D6',  125: 'T20 T15 D10',
  124: 'T20 T16 D8',  123: 'T19 T16 D9',  122: 'T18 T18 D7',
  121: 'T20 T11 D14', 120: 'T20 S20 D20', 119: 'T19 T12 D13',
  118: 'T20 S18 D20', 117: 'T20 S17 D20', 116: 'T20 S16 D20',
  115: 'T20 S15 D20', 114: 'T20 S14 D20', 113: 'T20 S13 D20',
  112: 'T20 S12 D20', 111: 'T20 S19 D16', 110: 'T20 S10 D20',
  109: 'T20 S9 D20',  108: 'T20 S8 D20',  107: 'T19 S10 D20',
  106: 'T20 S6 D20',  105: 'T20 S5 D20',  104: 'T18 S18 D16',
  103: 'T19 S6 D20',  102: 'T20 S2 D20',  101: 'T17 S10 D20',
  100: 'T20 D20',     99:  'T19 S10 D16', 98:  'T20 D19',
  97:  'T19 D20',     96:  'T20 D18',     95:  'T19 D19',
  94:  'T18 D20',     93:  'T19 D18',     92:  'T20 D16',
  91:  'T17 D20',     90:  'T18 D18',     89:  'T19 D16',
  88:  'T20 D14',     87:  'T17 D18',     86:  'T18 D16',
  85:  'T15 D20',     84:  'T20 D12',     83:  'T17 D16',
  82:  'T14 D20',     81:  'T19 D12',     80:  'T20 D10',
  79:  'T13 D20',     78:  'T18 D12',     77:  'T15 D16',
  76:  'T20 D8',      75:  'T17 D12',     74:  'T14 D16',
  73:  'T19 D8',      72:  'T16 D12',     71:  'T13 D16',
  70:  'T18 D8',      69:  'T19 D6',      68:  'T20 D4',
  67:  'T17 D8',      66:  'T14 D12',     65:  'T19 D4',
  64:  'T16 D8',      63:  'T13 D12',     62:  'T10 D16',
  61:  'T15 D8',      60:  'S20 D20',     59:  'S19 D20',
  58:  'S18 D20',     57:  'S17 D20',     56:  'T16 D4',
  55:  'S15 D20',     54:  'S14 D20',     53:  'S13 D20',
  52:  'S12 D20',     51:  'S19 D16',     50:  'S10 D20',
  49:  'S9 D20',      48:  'S16 D16',     47:  'S15 D16',
  46:  'S6 D20',      45:  'S13 D16',     44:  'S12 D16',
  43:  'S3 D20',      42:  'S10 D16',     41:  'S9 D16',
  40:  'D20',         38:  'D19',         36:  'D18',
  34:  'D17',         32:  'D16',         30:  'D15',
  28:  'D14',         26:  'D13',         24:  'D12',
  22:  'D11',         20:  'D10',         18:  'D9',
  16:  'D8',          14:  'D7',          12:  'D6',
  10:  'D5',          8:   'D4',          6:   'D3',
  4:   'D2',          2:   'D1',
};

// Shape of LiveMatchPayload (lib/scoring/liveMatch.ts); newer fields optional for older writers
interface LiveScoreData {
  seq?: number;
  tournamentName: string;
  p1Name: string;
  p1Score: number;
  p1Legs: number;
  p1Sets: number;
  p1Active: boolean;
  p1StartedLeg: boolean;
  p2Name: string;
  p2Score: number;
  p2Legs: number;
  p2Sets: number;
  p2Active: boolean;
  p2StartedLeg: boolean;
  startScore: number;
  legsEnabled: boolean;
  legs: number;
  setsEnabled: boolean;
  sets: number;
  matchWinner?: 0 | 1 | null;
  frontendVolume?: number;
  lastEvent?: LiveMatchEvent | null;
  barney?: LiveMatchBarney | null;
}

interface OBSOverlayPageProps {
  params: Promise<{ id: string }>;
}

// How often the overlay asks the server for new state. While a match is being
// scored it polls fast so scores appear almost immediately; after a while
// without changes it backs off, so an overlay left open all day stays cheap.
const POLL_ACTIVE_MS = 250;
const POLL_IDLE_MS = 1500;
// How long after the last change the overlay keeps polling fast. Long enough to cover
// normal gaps in play (walking to the board, the break between legs), so only a board
// that is really idle — between matches, overlay left open — falls back to slow polling.
const ACTIVE_WINDOW_MS = 180000;

export default function OBSOverlayPage({ params }: OBSOverlayPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<LiveScoreData | null>(null);
  const [barneyAnim, setBarneyAnim] = useState<{ src: string; key: number } | null>(null);

  useEffect(() => {
    soundPlayer.preloadCommonSounds();

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    // Sequence numbers already seen; events present on the first load are not replayed
    let seen = INITIAL_SEEN_LIVE_EVENTS;
    let lastSeq: number | null = null;
    let lastChangeAt = Date.now();

    const pollApi = async () => {
      try {
        const response = await fetch(`/api/tournaments/${id}/live-match`, { cache: 'no-store' });
        if (response.ok) {
          const newData: LiveScoreData | null = await response.json();
          if (cancelled) return;

          // Keep polling fast for a while after every change
          const seq = typeof newData?.seq === 'number' ? newData.seq : null;
          if (seq !== lastSeq) {
            lastSeq = seq;
            lastChangeAt = Date.now();
          }

          if (newData) {
            // Apply frontend volume FIRST (before playing sounds)
            if (newData.frontendVolume !== undefined) {
              soundPlayer.setVolume(newData.frontendVolume / 100);
              soundPlayer.setEnabled(newData.frontendVolume > 0);
            }

            // Announce / animate only events with a new sequence number
            const detected = detectNewLiveEvents(seen, newData);
            seen = detected.seen;
            if (detected.announce) {
              soundPlayer.playScore(announcementScore(detected.announce));
            }
            if (detected.barney) {
              setBarneyAnim({ src: detected.barney.src, key: detected.barney.seq });
            }

            setData(newData);
          } else {
            setData(null);
          }
        }
      } catch {
        // ignore network errors
      }
      // Poll again only after this request finished, so responses can't arrive out of
      // order (works in OBS browser source, any browser, cross-device)
      if (!cancelled) {
        const active = Date.now() - lastChangeAt < ACTIVE_WINDOW_MS;
        timer = setTimeout(pollApi, active ? POLL_ACTIVE_MS : POLL_IDLE_MS);
      }
    };

    pollApi();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [id]);

  const formatSpec = () => {
    if (!data) return '';
    const parts = [];
    if (data.setsEnabled) parts.push(`Best of ${data.sets} Sets`);
    if (data.legsEnabled) parts.push(`Best of ${data.legs} Legs`);
    return parts.length > 0 ? parts.join(' · ') : `${data.startScore}`;
  };

  return (
    // 1920×1080 canvas, transparent background
    <div style={{
      width: 1920,
      height: 1080,
      position: 'relative',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* Barney animation overlay */}
      {barneyAnim && (
        <BarneyOverlay
          key={barneyAnim.key}
          src={barneyAnim.src}
          onDone={() => setBarneyAnim(null)}
        />
      )}

      {/* Country Club Scoreboard — bottom-right */}
      {/* Outer wrapper: overflow visible so checkout bar can extend left */}
      <div style={{
        position: 'absolute',
        bottom: 72,
        right: 56,
        width: 580,
        fontFamily: 'Georgia, serif',
      }}>
        {data ? (
          <>
            {/* Checkout bar — positioned on outer wrapper (overflow visible), skip header ~41px, each row ~57px */}
            {(() => {
              // No active player once the match is won → no checkout bar
              if (!data.p1Active && !data.p2Active) return null;
              const activeScore = data.p1Active ? data.p1Score : data.p2Score;
              const checkout = activeScore >= 2 && activeScore <= 170 ? CHECKOUTS[activeScore] : undefined;
              if (!checkout) return null;
              const topOffset = 41 + (data.p2Active ? 58 : 0);
              return (
                <div style={{
                  position: 'absolute',
                  right: '100%',
                  top: topOffset,
                  height: 57,
                  background: '#004d30',
                  border: '3px solid #d4af37',
                  borderRight: 'none',
                  padding: '0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  borderTopLeftRadius: 6,
                  borderBottomLeftRadius: 6,
                  boxShadow: '-4px 0 12px rgba(0,0,0,0.7), 0 0 16px rgba(212,175,55,0.25)',
                  minWidth: 150,
                }}>
                  <span style={{
                    color: '#d4af37',
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: 'Georgia, serif',
                    letterSpacing: '0.06em',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 10px rgba(212,175,55,0.5)',
                  }}>
                    {checkout}
                  </span>
                </div>
              );
            })()}

            {/* Inner scoreboard: overflow hidden clips rows cleanly to border-radius */}
            <div style={{
              borderRadius: 8,
              border: '3px solid #d4af37',
              overflow: 'hidden',
              boxShadow: '0 0 40px rgba(212,175,55,0.3), 0 16px 48px rgba(0,0,0,0.95)',
            }}>
              {/* Header */}
              <div style={{
                background: '#004d30',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(212,175,55,0.4)',
              }}>
                <span style={{
                  color: '#d4af37',
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  textShadow: '0 0 8px rgba(212,175,55,0.4)',
                }}>
                  🎯 {data.tournamentName}
                </span>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  {data.setsEnabled && (
                    <span style={{ color: 'rgba(212,175,55,0.55)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sets</span>
                  )}
                  <span style={{ color: 'rgba(212,175,55,0.55)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Legs</span>
                  <span style={{ color: 'rgba(212,175,55,0.55)', fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', minWidth: 52, textAlign: 'right' }}>Score</span>
                </div>
              </div>

              {/* Player 1 */}
              <PlayerRow
                name={data.p1Name}
                score={data.p1Score}
                legs={data.p1Legs}
                sets={data.p1Sets}
                active={data.p1Active || data.matchWinner === 0}
                startedLeg={data.p1StartedLeg && data.matchWinner == null}
                winner={data.matchWinner === 0}
                setsEnabled={data.setsEnabled}
                isTop
              />

              {/* Solid divider — no transparency */}
              <div style={{ height: 1, background: '#002d1a' }} />

              {/* Player 2 */}
              <PlayerRow
                name={data.p2Name}
                score={data.p2Score}
                legs={data.p2Legs}
                sets={data.p2Sets}
                active={data.p2Active || data.matchWinner === 1}
                startedLeg={data.p2StartedLeg && data.matchWinner == null}
                winner={data.matchWinner === 1}
                setsEnabled={data.setsEnabled}
                isTop={false}
              />

              {/* Footer — format spec */}
              {formatSpec() && (
                <div style={{
                  background: '#003d26',
                  padding: '6px 16px',
                  textAlign: 'center',
                  borderTop: '1px solid rgba(212,175,55,0.25)',
                }}>
                  <span style={{ color: 'rgba(212,175,55,0.6)', fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: 'Georgia, serif' }}>
                    {formatSpec()}
                  </span>
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{
            borderRadius: 8,
            border: '3px solid #d4af37',
            background: '#004d30',
            padding: '20px 24px',
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(212,175,55,0.3), 0 16px 48px rgba(0,0,0,0.95)',
          }}>
            <p style={{ color: 'rgba(212,175,55,0.5)', fontSize: 14, fontFamily: 'Georgia, serif', margin: 0, letterSpacing: '0.1em' }}>
              Waiting for scoreboard...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Barney Overlay ─────────────────────────────────────────────────────────

function BarneyOverlay({ src, onDone }: { src: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes barney-pop {
          0%   { transform: scale(0)    rotate(0deg);    opacity: 0; }
          18%  { transform: scale(1.12) rotate(390deg);  opacity: 1; }
          28%  { transform: scale(1)    rotate(360deg);  opacity: 1; }
          68%  { transform: scale(1)    rotate(360deg);  opacity: 1; }
          88%  { transform: scale(0.6)  rotate(360deg);  opacity: 0.6; }
          100% { transform: scale(0)    rotate(360deg);  opacity: 0; }
        }
      `}</style>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none', zIndex: 100,
      }}>
        <img
          src={src}
          alt="Barney"
          style={{
            width: 500, height: 500, objectFit: 'contain',
            animation: 'barney-pop 3.2s ease-in-out forwards',
            filter: 'drop-shadow(0 0 60px rgba(0,0,0,0.9))',
          }}
        />
      </div>
    </>
  );
}

interface PlayerRowProps {
  name: string;
  score: number;
  legs: number;
  sets: number;
  active: boolean;
  startedLeg: boolean;
  winner: boolean;
  setsEnabled: boolean;
  isTop: boolean;
}

function PlayerRow({ name, score, legs, sets, active, startedLeg, winner, setsEnabled }: PlayerRowProps) {
  return (
    <div style={{
      background: active ? '#004d30' : '#001d0e',
      padding: '13px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      transition: 'background 0.4s ease',
      // No borderRadius — parent overflow:hidden handles corner clipping
    }}>
      {/* Player name + leg-starter indicator */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          color: active ? '#fdf5e6' : 'rgba(253,245,230,0.5)',
          fontSize: 22,
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          textShadow: active ? '0 1px 4px rgba(0,0,0,0.6)' : 'none',
          transition: 'color 0.4s ease',
        }}>
          {name}
        </span>
        {startedLeg && (
          <span style={{ color: active ? '#d4af37' : 'rgba(212,175,55,0.35)', fontSize: 10, lineHeight: 1, transition: 'color 0.4s ease' }}>
            ▶
          </span>
        )}
        {/* Match winner */}
        {winner && (
          <span style={{ fontSize: 18, lineHeight: 1 }}>🏆</span>
        )}
      </div>

      {/* Sets */}
      {setsEnabled && (
        <span style={{
          color: active ? '#d4af37' : 'rgba(212,175,55,0.35)',
          fontSize: 20,
          fontWeight: 700,
          fontFamily: 'Georgia, serif',
          minWidth: 28,
          textAlign: 'center',
          transition: 'color 0.4s ease',
        }}>
          {sets}
        </span>
      )}

      {/* Legs */}
      <span style={{
        color: active ? '#d4af37' : 'rgba(212,175,55,0.35)',
        fontSize: 20,
        fontWeight: 700,
        fontFamily: 'Georgia, serif',
        minWidth: 28,
        textAlign: 'center',
        transition: 'color 0.4s ease',
      }}>
        {legs}
      </span>

      {/* Remaining score */}
      <span style={{
        color: active ? '#d4af37' : 'rgba(253,245,230,0.4)',
        fontSize: 30,
        fontWeight: 800,
        fontFamily: 'Georgia, serif',
        minWidth: 62,
        textAlign: 'right',
        letterSpacing: '-0.02em',
        textShadow: active ? '0 0 16px rgba(212,175,55,0.5)' : 'none',
        transition: 'color 0.4s ease, text-shadow 0.4s ease',
      }}>
        {score}
      </span>
    </div>
  );
}
