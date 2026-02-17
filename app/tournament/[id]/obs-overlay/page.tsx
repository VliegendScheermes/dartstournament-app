'use client';

/**
 * OBS Scoreboard Overlay
 * Transparent 1920x1080 page — add as Browser Source in OBS with "Allow transparency" enabled.
 * Reads live match state from localStorage (written by the scoreboard page).
 */

import { use, useState, useEffect, useRef } from 'react';
import { soundPlayer } from '@/lib/audio/soundPlayer';

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

interface LiveScoreData {
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
  frontendVolume?: number;
}

interface OBSOverlayPageProps {
  params: Promise<{ id: string }>;
}

export default function OBSOverlayPage({ params }: OBSOverlayPageProps) {
  const { id } = use(params);
  const [data, setData] = useState<LiveScoreData | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const prevP1Score = useRef<number | null>(null);
  const prevP2Score = useRef<number | null>(null);

  const readState = () => {
    try {
      const raw = localStorage.getItem(`darts-scoreboard-${id}`);
      if (raw) {
        const newData = JSON.parse(raw);

        // Apply frontend volume from scoreboard FIRST (before playing sounds)
        if (newData.frontendVolume !== undefined) {
          soundPlayer.setVolume(newData.frontendVolume / 100);
          soundPlayer.setEnabled(newData.frontendVolume > 0);
        }

        // Detect score changes and play sound
        if (data && audioEnabled) {
          // Player 1 scored
          if (newData.p1Score < data.p1Score && prevP1Score.current !== null) {
            const scoreDiff = prevP1Score.current - newData.p1Score;
            soundPlayer.playScore(scoreDiff);
          }
          // Player 2 scored
          if (newData.p2Score < data.p2Score && prevP2Score.current !== null) {
            const scoreDiff = prevP2Score.current - newData.p2Score;
            soundPlayer.playScore(scoreDiff);
          }
        }

        // Update previous scores
        prevP1Score.current = newData.p1Score;
        prevP2Score.current = newData.p2Score;

        setData(newData);
      }
    } catch {
      // ignore parse errors
    }
  };

  // Enable audio on first interaction
  const enableAudio = () => {
    soundPlayer.preloadCommonSounds();
    setAudioEnabled(true);
  };

  useEffect(() => {
    // Try to preload sounds (might be blocked by browser)
    soundPlayer.preloadCommonSounds();

    // Initial read
    readState();

    // Listen to storage events (works when scoreboard is in different browser tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === `darts-scoreboard-${id}`) readState();
    };
    window.addEventListener('storage', onStorage);

    // Poll localStorage every 200ms (needed for OBS browser source which doesn't receive storage events)
    const pollInterval = setInterval(() => {
      readState();
    }, 200);

    return () => {
      window.removeEventListener('storage', onStorage);
      clearInterval(pollInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
      {/* Audio Enable Button (only shows if audio is disabled) */}
      {!audioEnabled && (
        <button
          onClick={enableAudio}
          style={{
            position: 'absolute',
            top: 20,
            left: 20,
            padding: '12px 20px',
            background: 'rgba(255, 165, 0, 0.9)',
            color: '#000',
            border: '2px solid #fff',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            zIndex: 1000,
          }}
        >
          🔊 Klik om geluid te activeren
        </button>
      )}

      {/* TV Scoreboard — positioned bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: 80,
        right: 48,
        width: 560,
        fontFamily: "'Arial', sans-serif",
        borderRadius: 6,
        overflow: 'visible',
        boxShadow: '0 4px 32px rgba(0,0,0,0.7)',
      }}>
        {data ? (
          <>
            {/* Header - Format spec + labels */}
            <div style={{
              background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              padding: '8px 14px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
            }}>
              <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>
                {formatSpec()}
              </div>
              <div style={{ display: 'flex', gap: 28, color: '#aaaaaa', fontSize: 13, fontWeight: 600 }}>
                {data.setsEnabled && <span>Sets</span>}
                <span>Legs</span>
                <span style={{ minWidth: 54, textAlign: 'right' }}></span>
              </div>
            </div>

            {/* Player 1 row */}
            <PlayerRow
              name={data.p1Name}
              score={data.p1Score}
              legs={data.p1Legs}
              sets={data.p1Sets}
              active={data.p1Active}
              startedLeg={data.p1StartedLeg}
              setsEnabled={data.setsEnabled}
              isTop
            />

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

            {/* Player 2 row */}
            <PlayerRow
              name={data.p2Name}
              score={data.p2Score}
              legs={data.p2Legs}
              sets={data.p2Sets}
              active={data.p2Active}
              startedLeg={data.p2StartedLeg}
              setsEnabled={data.setsEnabled}
              isTop={false}
            />

            {/* Footer - Tournament name */}
            <div style={{
              background: 'linear-gradient(90deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
              padding: '8px 14px',
              textAlign: 'center',
              borderBottomLeftRadius: 6,
              borderBottomRightRadius: 6,
            }}>
              <div style={{ color: '#ffffff', fontSize: 13, fontWeight: 600 }}>
                {data.tournamentName}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            background: 'rgba(10,10,20,0.92)',
            padding: '16px 20px',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 14,
            textAlign: 'center',
          }}>
            Waiting for scoreboard...
          </div>
        )}
      </div>
    </div>
  );
}

interface PlayerRowProps {
  name: string;
  score: number;
  legs: number;
  sets: number;
  active: boolean;
  startedLeg: boolean;
  setsEnabled: boolean;
  isTop: boolean;
}

function PlayerRow({ name, score, legs, sets, active, startedLeg, setsEnabled }: PlayerRowProps) {
  const checkout = score >= 2 && score <= 170 ? CHECKOUTS[score] : undefined;

  return (
    <div style={{ position: 'relative', display: 'flex' }}>
      {/* Checkout bar - slides out to the left */}
      {checkout && (
        <div style={{
          position: 'absolute',
          right: '100%',
          top: 0,
          bottom: 0,
          background: 'linear-gradient(90deg, #d32f2f 0%, #f44336 100%)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          borderTopLeftRadius: 6,
          borderBottomLeftRadius: 6,
          boxShadow: '-2px 0 8px rgba(0,0,0,0.3)',
          minWidth: 140,
        }}>
          <span style={{
            color: '#ffffff',
            fontSize: 16,
            fontWeight: 700,
            fontFamily: 'monospace',
            letterSpacing: '0.05em',
            whiteSpace: 'nowrap',
          }}>
            {checkout}
          </span>
        </div>
      )}

      {/* Main player row */}
      <div style={{
        background: active
          ? 'linear-gradient(90deg, rgba(30,60,120,0.97) 0%, rgba(20,40,90,0.97) 100%)'
          : 'rgba(10,10,20,0.92)',
        padding: '10px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flex: 1,
      }}>
        {/* Active indicator */}
        <div style={{
          width: 4,
          height: 28,
          borderRadius: 2,
          background: active ? '#00aaff' : 'transparent',
          flexShrink: 0,
        }} />

        {/* Player name */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            color: '#ffffff',
            fontSize: 20,
            fontWeight: 700,
            letterSpacing: '0.01em',
          }}>
            {name}
          </span>
          {startedLeg && (
            <span style={{
              color: '#00e676',
              fontSize: 16,
              fontWeight: 900,
            }}>
              ●
            </span>
          )}
        </div>

        {/* Sets */}
        {setsEnabled && (
          <span style={{
            color: '#cccccc',
            fontSize: 20,
            fontWeight: 600,
            minWidth: 28,
            textAlign: 'center',
          }}>
            {sets}
          </span>
        )}

        {/* Legs */}
        <span style={{
          color: '#cccccc',
          fontSize: 20,
          fontWeight: 600,
          minWidth: 28,
          textAlign: 'center',
        }}>
          {legs}
        </span>

        {/* Remaining score */}
        <span style={{
          color: '#00d4ff',
          fontSize: 26,
          fontWeight: 800,
          minWidth: 54,
          textAlign: 'right',
          letterSpacing: '-0.02em',
        }}>
          {score}
        </span>
      </div>
    </div>
  );
}
