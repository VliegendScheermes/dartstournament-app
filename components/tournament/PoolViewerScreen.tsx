'use client';

import { useState, useEffect } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { ViewerStandingsTable } from '@/components/tournament/ViewerStandingsTable';
import { ViewerMatchSchedule } from '@/components/tournament/ViewerMatchSchedule';

export function PoolViewerScreen({ id }: { id: string }) {
  const [isHydrated, setIsHydrated] = useState(false);

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const loadTournamentPublic = useTournamentStore(state => state.loadTournamentPublic);
  const getStandings = useTournamentStore(state => state.getStandings);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load tournament data from public API and poll every 3s for live updates
  useEffect(() => {
    if (!isHydrated) return;
    loadTournamentPublic(id);
    const interval = setInterval(() => loadTournamentPublic(id), 3000);
    return () => clearInterval(interval);
  }, [id, isHydrated, loadTournamentPublic]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-stone-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-amber-100">Loading...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-stone-800 to-neutral-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-amber-100 mb-4">Tournament Not Found</h1>
          <p className="text-amber-200">The tournament you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  const hasPoolsDrawn = tournament.pools.length > 0 && tournament.pools.some((p) => p.playerIds.length > 0);
  const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');

  if (!hasPoolsDrawn) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(10, 10, 10, 0.9)), url(/images/background-darts.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-4" style={{ fontFamily: 'Georgia, serif', color: '#d4af37' }}>
            {tournament.settings.tournamentName}
          </h1>
          <p className="text-lg" style={{ color: '#d4af37', opacity: 0.7 }}>
            Pool draw not completed yet
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4" style={{
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(10, 10, 10, 0.9)), url(/images/background-darts.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="max-w-7xl mx-auto p-6 rounded-lg" style={{
        background: '#0A0A0A',
        border: '1px solid #1a1a1a'
      }}>
        <div className="mb-8 text-center relative">
          <div className="relative px-8 py-3 rounded-lg" style={{
            background: '#004d30',
            border: '4px solid #000000',
            outline: '2px solid #d4af37',
            outlineOffset: '-6px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.9), inset 0 1px 3px rgba(212, 175, 55, 0.3)'
          }}>
            <h1 className="text-3xl font-bold tracking-wide mb-1" style={{
              fontFamily: 'Georgia, serif',
              color: '#d4af37',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8), 0 0 10px rgba(212, 175, 55, 0.3)'
            }}>
              {tournament.settings.tournamentName}
            </h1>
            <p className="text-sm" style={{
              fontFamily: 'Georgia, serif',
              color: '#d4af37',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
            }}>
              Pool Play Phase
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 h-full p-4 rounded-lg" style={{
            background: '#000000',
            border: '2px solid #1a1a1a'
          }}>
            <div className="rounded-lg shadow-2xl p-6 h-full flex flex-col" style={{
              background: '#004d30',
              border: '3px solid #d4af37',
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 25px rgba(212, 175, 55, 0.4)'
            }}>
              <h3 className="text-2xl font-bold mb-4 pb-2" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                borderBottom: '2px solid rgba(212, 175, 55, 0.4)'
              }}>
                Poules
              </h3>
              <div className="space-y-6 flex-1 overflow-y-auto">
                {tournament.pools.map((pool) => {
                  const standings = getStandings(id, pool.id);
                  const manualAssignments = tournament.drawState?.finalsAssignments || {};
                  return (
                    <ViewerStandingsTable
                      key={pool.id}
                      poolName={pool.name}
                      standings={standings}
                      topPlayers={tournament.settings.advanceToCrossFinals}
                      bottomPlayers={tournament.settings.advanceToLosersFinal}
                      boardNumber={pool.boardNumber}
                      manualAssignments={manualAssignments}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          <div className="lg:col-span-7 p-4 rounded-lg" style={{
            background: '#000000',
            border: '2px solid #1a1a1a'
          }}>
            <ViewerMatchSchedule
              matches={poolMatches}
              rounds={tournament.rounds}
              players={tournament.players}
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          {tournament.settings.youtubeStreamUrl ? (
            <a href={tournament.settings.youtubeStreamUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ background: '#000000', border: '2px solid #d4af37', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)' }}
            >
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#d4af37' }}>🎯 Watch Tournament Live</p>
            </a>
          ) : (
            <a href="https://sportsplugins.com/" target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ background: '#000000', border: '2px solid #d4af37', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)' }}
            >
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#d4af37' }}>Powered by SportsPlugins</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
