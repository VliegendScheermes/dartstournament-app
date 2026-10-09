'use client';

import { use, useEffect, useRef } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { DrawViewerScreen, usePublicTournamentPolling } from '@/components/tournament/DrawViewerScreen';
import { PoolViewerScreen } from '@/components/tournament/PoolViewerScreen';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';

interface LiveViewerPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

type ViewerScreen = 'draw' | 'pools' | 'finals';

const SCREEN_LABELS: Record<ViewerScreen, string> = {
  draw: 'Draw View',
  pools: 'Pool View',
  finals: 'Finals View',
};

export default function LiveViewerPage({ params, searchParams }: LiveViewerPageProps) {
  const { id } = use(params);
  const debugMode = use(searchParams).debug === '1';
  const screenRef = useRef<HTMLDivElement>(null);
  const shownScreenRef = useRef<ViewerScreen | null>(null);

  // Single source of truth: backend tournament status
  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  // Poll public API every 3s (no auth required — works for OBS, public viewers)
  const loaded = usePublicTournamentPolling(id, 3000);

  // Authoritative phase from backend — no heuristics. An archived tournament keeps
  // showing the phase it was archived in.
  const phase = tournament?.status === 'archived'
    ? tournament.drawState?.statusBeforeArchive ?? 'completed'
    : tournament?.status;
  const screen: ViewerScreen | null = !phase
    ? null
    : phase === 'setup' ? 'draw' : phase === 'pool-play' ? 'pools' : 'finals';

  // Fade the new screen in when the phase changes (not on initial load)
  useEffect(() => {
    if (!loaded || !screen) return;
    if (shownScreenRef.current && shownScreenRef.current !== screen) {
      screenRef.current?.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 350, easing: 'ease' });
    }
    shownScreenRef.current = screen;
  }, [loaded, screen]);

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
      </div>
    );
  }

  if (!tournament || !screen) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Tournament not found</p>
      </div>
    );
  }

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
    <div ref={screenRef} style={{ minHeight: '100vh', background: '#000' }}>
      {renderScreen()}

      {debugMode && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-3 rounded-lg text-xs" style={{
          background: 'rgba(0,0,0,0.85)',
          border: '1px solid #d4af37',
          fontFamily: 'monospace',
          color: '#d4af37',
          minWidth: 240,
        }}>
          <div className="font-bold mb-1">🛠 Debug</div>
          <div>backend status: <span style={{ color: '#fdf5e6' }}>{tournament.status}</span></div>
          {tournament.status === 'archived' && (
            <div>archived in: <span style={{ color: '#fdf5e6' }}>{tournament.drawState?.statusBeforeArchive ?? '—'}</span></div>
          )}
          <div>rendering: <span style={{ color: '#fdf5e6' }}>{SCREEN_LABELS[screen]}</span></div>
          <div>pools drawn: <span style={{ color: '#fdf5e6' }}>
            {tournament.pools.filter(p => p.playerIds.length > 0).length}/{tournament.pools.length}
          </span></div>
          <div>pool matches: <span style={{ color: '#fdf5e6' }}>
            {tournament.matches.filter(m => m.stage === 'POOL').length}
          </span></div>
          <div>updatedAt: <span style={{ color: '#fdf5e6' }}>{tournament.updatedAt?.slice(11, 19) ?? '—'}</span></div>
        </div>
      )}
    </div>
  );
}
