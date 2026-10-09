'use client';

/**
 * OBS Split-Screen View
 * 1920×1080 browser source for OBS.
 * Left half (0–960px): transparent → place your camera source here in OBS.
 * Right half (960–1920px): live tournament view (auto-switches per tournament status).
 *
 * OBS setup:
 * 1. Add a Browser Source → this URL → 1920×1080, "Allow transparency" ON
 * 2. Add your Camera source, position it on the left half
 * 3. The tournament view fills the right half automatically
 */

import { use, useEffect, useRef } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { DrawViewerScreen, usePublicTournamentPolling } from '@/components/tournament/DrawViewerScreen';
import { PoolViewerScreen } from '@/components/tournament/PoolViewerScreen';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';

interface SplitViewPageProps {
  params: Promise<{ id: string }>;
}

type ViewerScreen = 'draw' | 'pools' | 'finals';

export default function SplitViewPage({ params }: SplitViewPageProps) {
  const { id } = use(params);
  const screenRef = useRef<HTMLDivElement>(null);
  const shownScreenRef = useRef<ViewerScreen | null>(null);

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  // Poll public API every 3s (no auth required — works for OBS, public viewers)
  const loaded = usePublicTournamentPolling(id, 3000);

  // An archived tournament keeps showing the phase it was archived in
  const phase = tournament?.status === 'archived'
    ? tournament.drawState?.statusBeforeArchive ?? 'completed'
    : tournament?.status ?? 'setup';
  const screen: ViewerScreen = phase === 'setup' ? 'draw' : phase === 'pool-play' ? 'pools' : 'finals';

  // Fade the new screen in when the phase changes (not on initial load)
  useEffect(() => {
    if (!loaded) return;
    if (shownScreenRef.current && shownScreenRef.current !== screen) {
      screenRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease' });
    }
    shownScreenRef.current = screen;
  }, [loaded, screen]);

  if (!loaded) return null;

  const renderScreen = () => {
    switch (screen) {
      case 'pools':
        return <PoolViewerScreen id={id} />;
      case 'finals':
        return <FinalsViewerScreen id={id} />;
      default:
        return <DrawViewerScreen id={id} />;
    }
  };

  return (
    // Fixed 1920×1080 canvas — transparent background for OBS
    <div style={{
      width: 1920,
      height: 1080,
      position: 'relative',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* Left half — transparent (camera goes here in OBS) */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 960,
        height: 1080,
        background: 'transparent',
        pointerEvents: 'none',
      }} />

      {/* Right half — live tournament content fills 960×1080 naturally.
          The transform makes this the containing block of position: fixed content
          (the draw announcement), so it stays in this half instead of covering the camera. */}
      <div ref={screenRef} style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: 960,
        height: 1080,
        overflow: 'hidden',
        transform: 'translateZ(0)',
      }}>
        {renderScreen()}
      </div>
    </div>
  );
}
