'use client';

import { useState, useEffect } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { Player, Pool, VALIDATION } from '@/types/tournament';

/*
 * Public tournament polling, shared by every viewer page and screen.
 * Requests for one tournament never overlap, so a slow (stale) response can't
 * overwrite a newer one. A tick is also skipped when the tournament was requested
 * less than an interval ago, so a page and the draw screen inside it share their
 * requests instead of both polling.
 */
const publicLoads = new Map<string, { inFlight: Promise<void> | null; startedAt: number }>();

// On mount, a load started this recently (e.g. by the page that just mounted a screen) is fresh enough
const RECENT_LOAD_MS = 1000;

function loadPublicTournament(id: string, minIntervalMs: number): Promise<void> {
  let entry = publicLoads.get(id);
  if (!entry) {
    entry = { inFlight: null, startedAt: 0 };
    publicLoads.set(id, entry);
  }
  if (entry.inFlight) return entry.inFlight;
  if (Date.now() - entry.startedAt < minIntervalMs) return Promise.resolve();

  const load = entry;
  load.startedAt = Date.now();
  load.inFlight = useTournamentStore
    .getState()
    .loadTournamentPublic(id)
    .catch(() => {}) // the store records the error
    .finally(() => {
      load.inFlight = null;
    });
  return load.inFlight;
}

/**
 * Loads a tournament from the public API (no login needed) on mount and then
 * every `intervalMs` (null = only on mount). Returns true once the first load
 * has finished, so a page can tell "loading" apart from "not found".
 */
export function usePublicTournamentPolling(id: string, intervalMs: number | null): boolean {
  const [loadedId, setLoadedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadPublicTournament(id, RECENT_LOAD_MS).then(() => {
      if (!cancelled) setLoadedId(id);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (intervalMs === null) return;
    // 80% so a timer that fires a little early doesn't skip its own tick
    const timer = setInterval(() => loadPublicTournament(id, intervalMs * 0.8), intervalMs);
    return () => clearInterval(timer);
  }, [id, intervalMs]);

  return loadedId === id;
}

// Placeholder names before the first draw (the draw names its pools the same way)
const POOL_LETTERS = 'ABCDEFGH';

interface Announcement {
  key: string;
  playerName: string;
  poolName: string;
}

interface Assignment {
  key: string;
  playerId: string;
  poolId?: string;
}

// Entrance of a center stage announcement. Stable callback ref: the announcement
// box is keyed per pick, so it runs once for every new pick.
function animateEntrance(element: HTMLDivElement | null) {
  element?.animate(
    [
      { transform: 'scale(0.85)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    { duration: 300, easing: 'ease' }
  );
}

export function DrawViewerScreen({ id }: { id: string }) {
  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  const drawState = tournament?.drawState;
  const drawStatus = drawState?.status || 'idle';
  const isDrawing = drawStatus === 'picking' || drawStatus === 'assigned';

  // Poll fast while players are drawn (a pick is only on screen for ~2.5 s), every
  // second while a setup-phase tournament waits for its draw, and every 3 s otherwise
  // so a redraw still shows up. Works on its own; a polling parent page shares requests.
  const waitingForDraw = drawStatus === 'idle' && tournament?.status === 'setup';
  const loaded = usePublicTournamentPolling(id, isDrawing ? 500 : waitingForDraw ? 1000 : 3000);

  // Pool ids are new for every draw, so the key also tells a redraw of the same player apart
  const pickedPlayerId = drawState?.currentPickedPlayerId;
  const pickedPoolId = drawState?.currentPickedPoolId;
  const pickKey = pickedPlayerId ? `${pickedPlayerId}-${pickedPoolId ?? ''}` : null;
  const pickedPlayer = pickedPlayerId ? tournament?.players.find(p => p.id === pickedPlayerId) : undefined;

  // Center stage announcement while a player is being drawn. The last one is kept
  // after its pick has ended so it can fade out.
  const currentAnnouncement: Announcement | null =
    drawStatus === 'picking' && pickKey && pickedPlayer
      ? {
          key: pickKey,
          playerName: pickedPlayer.name,
          poolName:
            tournament?.pools.find(p => p.id === pickedPoolId)?.name ||
            drawState?.currentPickedPoolName ||
            '...',
        }
      : null;
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  if (currentAnnouncement && currentAnnouncement.key !== announcement?.key) {
    setAnnouncement(currentAnnouncement);
  }
  const isAnnouncing = announcement !== null && announcement.key === currentAnnouncement?.key;
  const fadingOutKey = announcement && !isAnnouncing ? announcement.key : null;
  const [fadedOutKey, setFadedOutKey] = useState<string | null>(null);
  useEffect(() => {
    if (!fadingOutKey) return;
    const timer = setTimeout(() => setFadedOutKey(fadingOutKey), 700);
    return () => clearTimeout(timer);
  }, [fadingOutKey]);

  // The pool that just received a player pulses briefly; the player stays highlighted a bit longer
  const currentAssignment: Assignment | null =
    drawStatus === 'assigned' && pickKey && pickedPlayerId
      ? { key: pickKey, playerId: pickedPlayerId, poolId: pickedPoolId }
      : null;
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  if (currentAssignment && currentAssignment.key !== assignment?.key) {
    setAssignment(currentAssignment);
  }
  const [pulseEndedKey, setPulseEndedKey] = useState<string | null>(null);
  const [highlightEndedKey, setHighlightEndedKey] = useState<string | null>(null);
  useEffect(() => {
    if (!assignment) return;
    const { key } = assignment;
    const pulseTimer = setTimeout(() => setPulseEndedKey(key), 900);
    const highlightTimer = setTimeout(() => setHighlightEndedKey(key), 2500);
    return () => {
      clearTimeout(pulseTimer);
      clearTimeout(highlightTimer);
    };
  }, [assignment]);

  if (!tournament) {
    if (!loaded) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: '#000000' }}>
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
          </div>
        </div>
      );
    }
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

  const showAnnouncement = announcement !== null && announcement.key !== fadedOutKey;
  const pulsingPoolId = assignment && assignment.key !== pulseEndedKey ? assignment.poolId : undefined;
  const recentlyAssignedPlayerId =
    assignment && assignment.key !== highlightEndedKey ? assignment.playerId : undefined;

  const playersById = new Map(tournament.players.map(p => [p.id, p]));
  const assignedPlayerIds = new Set(tournament.pools.flatMap(pool => pool.playerIds));
  const waitingPlayers = tournament.players.filter(p => !assignedPlayerIds.has(p.id));

  // The drawn pools by name (their number can differ from the current setting);
  // before the first draw, empty placeholders for the configured number of pools
  const pools: Pool[] = tournament.pools.length > 0
    ? [...tournament.pools].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    : Array.from(
        { length: Math.min(Math.max(tournament.settings.numPools, VALIDATION.MIN_POOLS), VALIDATION.MAX_POOLS) },
        (_, index) => ({ id: `placeholder-${index}`, name: `Poule ${POOL_LETTERS[index]}`, playerIds: [] })
      );

  const statusLabel = drawStatus === 'idle' ? 'WAITING' : drawStatus === 'complete' ? 'COMPLETE' : 'LIVE';
  const statusColor = drawStatus === 'complete' ? '#43a047' : drawStatus === 'idle' ? 'rgba(212, 175, 55, 0.5)' : '#d4af37';

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
              boxShadow: isDrawing ? `0 0 12px ${statusColor}` : 'none'
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

        {/* Fixed to the viewport; the split view confines it to its right half */}
        {showAnnouncement && announcement && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
            style={{
              transition: 'opacity 0.3s ease',
              opacity: isAnnouncing ? 1 : 0,
            }}
          >
            <div key={announcement.key} ref={animateEntrance} className="px-16 py-12 rounded-2xl text-center" style={{
              background: 'linear-gradient(135deg, #004d30 0%, #003d26 100%)',
              border: '3px solid #d4af37',
              boxShadow: '0 0 60px rgba(212, 175, 55, 0.6), 0 0 120px rgba(212, 175, 55, 0.3), 0 20px 60px rgba(0,0,0,0.9)',
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
                {announcement.playerName}
              </h2>
              <p className="text-2xl" style={{
                fontFamily: 'Georgia, serif',
                color: '#fdf5e6',
                opacity: 0.9
              }}>
                joins {announcement.poolName}
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
                  const isPicked = drawStatus === 'picking' && pickedPlayerId === player.id;
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
                    {tournament.players.length > 0 ? 'All players assigned' : 'No players yet'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 gap-4">
              {pools.map((pool) => {
                const isPulsing = pulsingPoolId === pool.id;
                const poolPlayers = pool.playerIds
                  .map(pid => playersById.get(pid))
                  .filter((player): player is Player => player !== undefined);

                return (
                  <div
                    key={pool.id}
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
                      {pool.name}
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
