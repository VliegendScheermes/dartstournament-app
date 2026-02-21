/**
 * Viewer Match Schedule Component
 * Read-only match display with pub aesthetic
 */

'use client';

import React from 'react';
import { Match, Player, Pool, Round } from '@/types/tournament';

interface ViewerMatchScheduleProps {
  matches: Match[];
  rounds: Round[];
  players: Player[];
  pools?: Pool[];
}

export const ViewerMatchSchedule: React.FC<ViewerMatchScheduleProps> = ({
  matches,
  players,
  pools = [],
}) => {
  const poolMatches = matches.filter((m) => m.stage === 'POOL');

  // Get unique round indices
  const roundIndices = Array.from(
    new Set(poolMatches.map((m) => m.roundIndex))
  ).sort((a, b) => a - b);

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  const getPoolName = (match: Match): string => {
    if (!match.poolId) return 'Pool match';
    const pool = pools.find((p) => p.id === match.poolId);
    return pool?.name ?? `Poule ${match.poolId}`;
  };

  return (
    <div className="rounded-lg shadow-2xl p-6 h-full flex flex-col" style={{
      background: '#004d30',
      border: '3px solid #d4af37',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 25px rgba(212, 175, 55, 0.4)'
    }}>
      <h3 className="text-2xl font-bold mb-4 pb-2 flex-shrink-0" style={{
        fontFamily: 'Georgia, serif',
        color: '#d4af37',
        borderBottom: '2px solid rgba(212, 175, 55, 0.4)',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
      }}>
        Match Schedule
      </h3>

      <div className="space-y-6 flex-1 overflow-y-auto">
        {roundIndices.map((roundIndex) => {
          const roundMatches = poolMatches.filter((m) => m.roundIndex === roundIndex);
          const allConfirmed = roundMatches.every((m) => m.confirmed);

          return (
            <div key={`round-${roundIndex}`} className="pb-4 last:border-b-0" style={{
              borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
            }}>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-lg font-bold" style={{
                  fontFamily: 'Georgia, serif',
                  color: '#d4af37'
                }}>
                  Round {roundIndex}
                </h4>
                {allConfirmed && (
                  <span className="text-xs px-3 py-1 rounded shadow-md" style={{
                    fontFamily: 'Georgia, serif',
                    background: 'rgba(67, 160, 71, 0.6)',
                    color: '#fdf5e6',
                    border: '1px solid #d4af37'
                  }}>
                    Complete
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {roundMatches.map((match) => {
                  const isComplete = match.confirmed && match.legsP1 !== null && match.legsP2 !== null;
                  const player1Won = isComplete && match.legsP1! > match.legsP2!;
                  const player2Won = isComplete && match.legsP2! > match.legsP1!;

                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-2 p-3 rounded-lg shadow-md"
                      style={{
                        background: 'rgba(0, 77, 48, 0.4)',
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}
                    >
                      {/* Pool Name */}
                      <div className="flex-shrink-0 w-16">
                        <span className="text-xs font-bold" style={{
                          fontFamily: 'Georgia, serif',
                          color: '#d4af37'
                        }}>
                          {getPoolName(match)}
                        </span>
                      </div>

                      {/* Player Names & Scores */}
                      <div className="flex-1 flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className={`text-sm font-medium ${player1Won ? 'font-bold' : ''}`} style={{
                            fontFamily: 'Georgia, serif',
                            color: player1Won ? '#d4af37' : '#fdf5e6'
                          }}>
                            {getPlayerName(match.player1Id)}
                          </span>
                        </div>

                        <div className="flex items-center justify-center px-2 py-1 rounded" style={{
                          background: '#000000',
                          border: '1px solid #d4af37'
                        }}>
                          <span className="text-xs font-semibold" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#d4af37'
                          }}>
                            vs
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 justify-end">
                          <span className={`text-sm font-medium ${player2Won ? 'font-bold' : ''}`} style={{
                            fontFamily: 'Georgia, serif',
                            color: player2Won ? '#d4af37' : '#fdf5e6'
                          }}>
                            {getPlayerName(match.player2Id)}
                          </span>
                        </div>
                      </div>

                      {/* Scores */}
                      {isComplete && (
                        <div className="flex items-center gap-1">
                          <span className="text-lg font-bold px-3 py-1 rounded" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#1a1a1a',
                            background: '#d4af37',
                            border: '1px solid #000000'
                          }}>
                            {match.legsP1}
                          </span>
                          <span className="text-xs font-bold" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#d4af37'
                          }}>
                            -
                          </span>
                          <span className="text-lg font-bold px-3 py-1 rounded" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#1a1a1a',
                            background: '#d4af37',
                            border: '1px solid #000000'
                          }}>
                            {match.legsP2}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {roundIndices.length === 0 && (
          <div className="text-center py-8" style={{
            fontFamily: 'Georgia, serif',
            color: '#d4af37',
            opacity: 0.7
          }}>
            No matches scheduled
          </div>
        )}
      </div>
    </div>
  );
};
