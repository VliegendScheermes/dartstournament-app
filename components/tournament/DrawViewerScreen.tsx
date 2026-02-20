'use client';

import { useState, useEffect, useRef } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { Player } from '@/types/tournament';

export function DrawViewerScreen({ id }: { id: string }) {
  const [isHydrated, setIsHydrated] = useState(false);

  const [centerStagePlayer, setCenterStagePlayer] = useState<{ name: string; poolName: string } | null>(null);
  const [centerStagePhase, setCenterStagePhase] = useState<'entering' | 'holding' | 'exiting' | 'idle'>('idle');
  const [pulsingPoolId, setPulsingPoolId] = useState<string | null>(null);
  const [recentlyAssignedPlayerId, setRecentlyAssignedPlayerId] = useState<string | null>(null);

  const prevDrawStateRef = useRef<string | undefined>(undefined);
  const centerStageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const loadTournamentPublic = useTournamentStore(state => state.loadTournamentPublic);

  // Compute draw status early (needed as polling dependency)
  const drawStateStatus = tournament?.drawState?.status || 'idle';

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Poll at 500ms during draw — 'picking' state only lasts ~2.5s, must not be missed.
  // Stop polling when draw is complete: parent LiveViewerPage polls at 3s which is sufficient.
  useEffect(() => {
    if (!isHydrated) return;
    if (drawStateStatus === 'complete') return;
    loadTournamentPublic(id);
    const interval = setInterval(() => loadTournamentPublic(id), 500);
    return () => clearInterval(interval);
  }, [id, isHydrated, drawStateStatus, loadTournamentPublic]);

  useEffect(() => {
    if (!tournament) return;
    const drawState = tournament.drawState;
    if (!drawState) return;

    const stateKey = `${drawState.status}-${drawState.currentPickedPlayerId}`;
    if (stateKey === prevDrawStateRef.current) return;
    prevDrawStateRef.current = stateKey;

    if (drawState.status === 'picking' && drawState.currentPickedPlayerId) {
      const player = tournament.players.find(p => p.id === drawState.currentPickedPlayerId);
      if (!player) return;

      const pool = drawState.currentPickedPoolId
        ? tournament.pools.find(p => p.id === drawState.currentPickedPoolId) ||
          { name: `Poule ${drawState.currentPickedPoolId}` }
        : { name: '...' };

      if (centerStageTimerRef.current) clearTimeout(centerStageTimerRef.current);
      setCenterStagePlayer({ name: player.name, poolName: pool.name });
      setCenterStagePhase('entering');
      centerStageTimerRef.current = setTimeout(() => {
        setCenterStagePhase('holding');
      }, 300);
    }

    if (drawState.status === 'assigned' && drawState.currentPickedPlayerId) {
      const poolId = drawState.currentPickedPoolId;
      if (poolId) {
        setPulsingPoolId(poolId);
        setRecentlyAssignedPlayerId(drawState.currentPickedPlayerId);
        setTimeout(() => setPulsingPoolId(null), 900);
        setTimeout(() => setRecentlyAssignedPlayerId(null), 2500);
      }
      setCenterStagePhase('exiting');
      if (centerStageTimerRef.current) clearTimeout(centerStageTimerRef.current);
      centerStageTimerRef.current = setTimeout(() => {
        setCenterStagePhase('idle');
        setCenterStagePlayer(null);
      }, 700);
    }

    if (drawState.status === 'idle' || drawState.status === 'complete') {
      if (centerStageTimerRef.current) clearTimeout(centerStageTimerRef.current);
      setCenterStagePhase('exiting');
      setTimeout(() => {
        setCenterStagePhase('idle');
        setCenterStagePlayer(null);
      }, 500);
    }
  }, [tournament?.drawState, tournament?.players, tournament?.pools]);

  useEffect(() => {
    return () => {
      if (centerStageTimerRef.current) clearTimeout(centerStageTimerRef.current);
    };
  }, []);

  if (!isHydrated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>
            Tournament Not Found
          </h1>
        </div>
      </div>
    );
  }

  const drawState = tournament.drawState;
  const drawStatus = drawState?.status || 'idle';

  const assignedPlayerIds = new Set<string>();
  tournament.pools.forEach(pool => pool.playerIds.forEach(pid => assignedPlayerIds.add(pid)));
  const waitingPlayers = tournament.players.filter(p => !assignedPlayerIds.has(p.id));

  const statusLabel = drawStatus === 'idle' ? 'WAITING' : drawStatus === 'complete' ? 'COMPLETE' : 'LIVE';
  const statusColor = drawStatus === 'complete' ? '#43a047' : drawStatus === 'idle' ? 'rgba(212, 175, 55, 0.5)' : '#d4af37';
  const isCenterStageVisible = centerStagePhase !== 'idle';

  return (
    <div className="min-h-screen py-6 px-4" style={{
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.88), rgba(5, 5, 5, 0.92)), url(/images/background-darts.png)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="max-w-7xl mx-auto">

        <div className="mb-6 flex justify-center">
          <div className="w-full px-6 py-3 rounded-lg flex items-center justify-between" style={{
            background: '#004d30',
            border: '2px solid #d4af37',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.3)'
          }}>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold tracking-wide" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
              }}>
                {tournament.settings.tournamentName}
              </h1>
              <span style={{ color: 'rgba(212,175,55,0.5)' }}>•</span>
              <span className="text-base" style={{
                fontFamily: 'Georgia, serif',
                color: '#fdf5e6',
                opacity: 0.85
              }}>
                THE DRAW
              </span>
            </div>
            <div className="px-4 py-2 rounded-lg" style={{
              background: 'rgba(0,0,0,0.5)',
              border: `2px solid ${statusColor}`,
              boxShadow: drawStatus === 'picking' || drawStatus === 'assigned' ? `0 0 12px ${statusColor}` : 'none'
            }}>
              <span className="text-sm font-bold tracking-widest" style={{
                fontFamily: 'Georgia, serif',
                color: statusColor
              }}>
                {statusLabel}
              </span>
            </div>
          </div>
        </div>

        {isCenterStageVisible && centerStagePlayer && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            style={{
              transition: 'opacity 0.3s ease',
              opacity: centerStagePhase === 'exiting' ? 0 : 1,
            }}
          >
            <div className="px-16 py-12 rounded-2xl text-center" style={{
              background: 'linear-gradient(135deg, #004d30 0%, #003d26 100%)',
              border: '3px solid #d4af37',
              boxShadow: '0 0 60px rgba(212, 175, 55, 0.6), 0 0 120px rgba(212, 175, 55, 0.3), 0 20px 60px rgba(0,0,0,0.9)',
              transform: centerStagePhase === 'entering' ? 'scale(0.85)' : 'scale(1)',
              transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}>
              <p className="text-lg mb-4 tracking-widest uppercase" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                opacity: 0.85
              }}>
                🎯 Drawn...
              </p>
              <h2 className="text-6xl font-bold mb-4" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                textShadow: '0 0 30px rgba(212, 175, 55, 0.8), 2px 2px 8px rgba(0,0,0,0.9)'
              }}>
                {centerStagePlayer.name}
              </h2>
              <p className="text-2xl" style={{
                fontFamily: 'Georgia, serif',
                color: '#fdf5e6',
                opacity: 0.9
              }}>
                joins {centerStagePlayer.poolName}
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4">
            <div className="rounded-lg p-6 h-full" style={{
              background: '#004d30',
              border: '3px solid #d4af37',
              boxShadow: '0 12px 32px rgba(0,0,0,0.8), 0 0 25px rgba(212,175,55,0.3)'
            }}>
              <div className="mb-4 pb-3" style={{ borderBottom: '2px solid rgba(212,175,55,0.4)' }}>
                <h3 className="text-2xl font-bold" style={{
                  fontFamily: 'Georgia, serif',
                  color: '#d4af37'
                }}>
                  Participants
                </h3>
                <p className="text-sm mt-1" style={{
                  fontFamily: 'Georgia, serif',
                  color: '#fdf5e6',
                  opacity: 0.7
                }}>
                  {waitingPlayers.length} player{waitingPlayers.length !== 1 ? 's' : ''} remaining
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2" style={{ overflow: 'hidden' }}>
                {waitingPlayers.map((player) => {
                  const isPicked = drawState?.currentPickedPlayerId === player.id &&
                    (drawState.status === 'picking');
                  return (
                    <div
                      key={player.id}
                      className="px-4 py-2 rounded-lg"
                      style={{
                        background: isPicked ? '#d4af37' : 'rgba(0, 0, 0, 0.4)',
                        border: isPicked ? '2px solid #d4af37' : '1px solid rgba(212, 175, 55, 0.3)',
                        transition: 'all 0.3s ease',
                        boxShadow: isPicked ? '0 0 20px rgba(212, 175, 55, 0.7)' : 'none',
                      }}
                    >
                      <span className="text-lg font-medium" style={{
                        fontFamily: 'Georgia, serif',
                        color: isPicked ? '#1a1a1a' : '#fdf5e6',
                        fontWeight: isPicked ? 'bold' : 'normal',
                      }}>
                        {player.name}
                      </span>
                    </div>
                  );
                })}
                {waitingPlayers.length === 0 && (
                  <div className="text-center py-8" style={{
                    fontFamily: 'Georgia, serif',
                    color: '#d4af37',
                    opacity: 0.6
                  }}>
                    {drawStatus === 'complete' ? 'All players assigned' : 'No players yet'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-4">
              {Array.from({ length: tournament.settings.numPools }).map((_, index) => {
                const poolLetter = 'ABCDEFGH'[index];
                const pool = tournament.pools.find(p => p.id === poolLetter);
                const isPulsing = pulsingPoolId === poolLetter;
                const poolPlayers = pool
                  ? pool.playerIds.map(pid => tournament.players.find(p => p.id === pid)).filter(Boolean) as Player[]
                  : [];

                return (
                  <div
                    key={poolLetter}
                    className="rounded-lg p-5"
                    style={{
                      background: '#004d30',
                      border: isPulsing ? '3px solid #d4af37' : '2px solid rgba(212, 175, 55, 0.5)',
                      boxShadow: isPulsing
                        ? '0 0 30px rgba(212, 175, 55, 0.8), 0 0 60px rgba(212, 175, 55, 0.4)'
                        : '0 4px 16px rgba(0, 0, 0, 0.6)',
                      transition: 'all 0.4s ease',
                    }}
                  >
                    <h4 className="text-xl font-bold mb-3 pb-2" style={{
                      fontFamily: 'Georgia, serif',
                      color: '#d4af37',
                      borderBottom: '1px solid rgba(212, 175, 55, 0.3)'
                    }}>
                      Poule {poolLetter}
                    </h4>
                    <div className="space-y-1">
                      {poolPlayers.map((player) => {
                        const isNew = recentlyAssignedPlayerId === player.id;
                        return (
                          <div
                            key={player.id}
                            className="px-3 py-1 rounded"
                            style={{
                              background: isNew ? 'rgba(212, 175, 55, 0.2)' : 'rgba(0, 0, 0, 0.3)',
                              border: isNew ? '1px solid rgba(212, 175, 55, 0.6)' : '1px solid transparent',
                              transition: 'all 0.4s ease',
                            }}
                          >
                            <span className="text-base" style={{
                              fontFamily: 'Georgia, serif',
                              color: isNew ? '#d4af37' : '#fdf5e6',
                              fontWeight: isNew ? 'bold' : 'normal',
                            }}>
                              {player.name}
                            </span>
                          </div>
                        );
                      })}
                      {poolPlayers.length === 0 && (
                        <p className="text-sm py-2" style={{
                          fontFamily: 'Georgia, serif',
                          color: '#d4af37',
                          opacity: 0.4
                        }}>
                          Awaiting draw...
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {drawStatus === 'complete' && (
          <div className="mt-6 flex justify-center">
            <div className="px-10 py-4 rounded-lg text-center" style={{
              background: '#004d30',
              border: '2px solid #d4af37',
              boxShadow: '0 0 20px rgba(212, 175, 55, 0.4)'
            }}>
              <p className="text-xl font-bold tracking-widest" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37'
              }}>
                ✓ Draw Complete
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
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
