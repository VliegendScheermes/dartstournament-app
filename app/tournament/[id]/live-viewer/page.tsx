'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { DrawViewerScreen } from '@/components/tournament/DrawViewerScreen';
import { PoolViewerScreen } from '@/components/tournament/PoolViewerScreen';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';

interface LiveViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function LiveViewerPage({ params }: LiveViewerPageProps) {
  const { id } = use(params);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [opacity, setOpacity] = useState(1);
  const [debugMode, setDebugMode] = useState(false);
  const prevStatusRef = useRef<string | undefined>(undefined);

  // Single source of truth: backend tournament status
  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const loadTournamentPublic = useTournamentStore(state => state.loadTournamentPublic);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Poll public API every 3s (no auth required — works for OBS, public viewers)
  useEffect(() => {
    let cancelled = false;
    const doFirstLoad = async () => {
      await loadTournamentPublic(id);
      if (!cancelled) setIsLoadingData(false);
    };
    doFirstLoad();
    const interval = setInterval(() => loadTournamentPublic(id), 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [id, loadTournamentPublic]);

  useEffect(() => {
    setDebugMode(new URLSearchParams(window.location.search).get('debug') === '1');
  }, []);

  // Fade transition only when status actually changes between real values (not on initial load)
  useEffect(() => {
    const newStatus = tournament?.status;
    if (prevStatusRef.current === undefined || newStatus === undefined || prevStatusRef.current === newStatus) {
      prevStatusRef.current = newStatus;
      return;
    }
    prevStatusRef.current = newStatus;
    setOpacity(0);
    const timer = setTimeout(() => setOpacity(1), 350);
    return () => clearTimeout(timer);
  }, [tournament?.status]);

  if (!isHydrated || isLoadingData) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Tournament not found</p>
      </div>
    );
  }

  // Authoritative phase from backend — no heuristics, no derived state
  const status = tournament.status;

  const renderScreen = () => {
    switch (status) {
      case 'pool-play':
        return <PoolViewerScreen id={id} />;
      case 'finals':
      case 'completed':
        return <FinalsViewerScreen id={id} />;
      default:
        // 'setup' or any other status → draw view
        return <DrawViewerScreen id={id} />;
    }
  };

  return (
    <div style={{ transition: 'opacity 0.35s ease', opacity, minHeight: '100vh', background: '#000' }}>
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
          <div>backend status: <span style={{ color: '#fdf5e6' }}>{status}</span></div>
          <div>rendering: <span style={{ color: '#fdf5e6' }}>
            {status === 'pool-play' ? 'Pool View' :
             (status === 'finals' || status === 'completed') ? 'Finals View' : 'Draw View'}
          </span></div>
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
