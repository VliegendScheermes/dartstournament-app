/**
 * Viewer Standings Table Component
 * Read-only standings display with pub aesthetic
 */

'use client';

import React from 'react';
import { StandingsRow } from '@/types/tournament';

interface ViewerStandingsTableProps {
  poolName: string;
  standings: StandingsRow[];
  topPlayers: number;
  bottomPlayers: number;
  boardNumber?: string | null;
  manualAssignments?: { [playerId: string]: 'CROSS' | 'LOSERS' | 'ELIMINATED' | null };
}

export const ViewerStandingsTable: React.FC<ViewerStandingsTableProps> = ({
  poolName,
  standings,
  topPlayers,
  bottomPlayers,
  boardNumber,
  manualAssignments = {},
}) => {
  return (
    <div className="rounded-lg p-4" style={{
      background: '#004d30',
      border: '2px solid #d4af37',
      boxShadow: '0 0 12px rgba(212, 175, 55, 0.3)'
    }}>
      {/* Pool Name Header */}
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-xl font-bold" style={{
          fontFamily: 'Georgia, serif',
          color: '#d4af37'
        }}>
          {poolName}
        </h4>
        <span className="text-xs px-2 py-1 rounded font-semibold" style={{
          background: 'rgba(212, 175, 55, 0.3)',
          color: '#d4af37',
          border: '1px solid #d4af37',
          fontFamily: 'Georgia, serif'
        }}>
          Board {boardNumber ?? '-'}
        </span>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '2px solid rgba(212, 175, 55, 0.4)' }}>
              <th className="text-left py-2 px-2 font-bold" style={{
                color: '#d4af37',
                fontFamily: 'Georgia, serif'
              }}>#</th>
              <th className="text-left py-2 px-2 font-bold" style={{
                color: '#d4af37',
                fontFamily: 'Georgia, serif'
              }}>Name</th>
              <th className="text-center py-2 px-1 font-bold" style={{
                color: '#d4af37',
                fontFamily: 'Georgia, serif'
              }}>Wins</th>
              <th className="text-center py-2 px-1 font-bold" style={{
                color: '#d4af37',
                fontFamily: 'Georgia, serif'
              }}>Losses</th>
              <th className="text-center py-2 px-1 font-bold" style={{
                color: '#d4af37',
                fontFamily: 'Georgia, serif'
              }}>Legs</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const position = index + 1;
              const manualAssignment = manualAssignments[row.playerId];

              // Determine badge based on manual assignment or automatic logic
              let badge = null;
              if (manualAssignment === 'CROSS') {
                badge = 'Winners';
              } else if (manualAssignment === 'LOSERS') {
                badge = 'Losers';
              } else if (manualAssignment === 'ELIMINATED') {
                badge = null;
              } else {
                // No manual assignment - use automatic logic
                const isTopPlayer = position <= topPlayers;
                const isBottomPlayer = position > standings.length - bottomPlayers;
                if (isTopPlayer) {
                  badge = 'Winners';
                } else if (isBottomPlayer) {
                  badge = 'Losers';
                }
              }

              return (
                <tr key={row.playerId} style={{
                  borderBottom: '1px solid rgba(212, 175, 55, 0.2)'
                }}>
                  <td className="py-2 px-2 font-medium" style={{
                    color: '#fdf5e6',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {position}
                  </td>
                  <td className="py-2 px-2 font-medium" style={{
                    color: '#fdf5e6',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {row.playerName}
                    {badge === 'Winners' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded font-semibold" style={{
                        background: 'rgba(67, 160, 71, 0.6)',
                        color: '#fdf5e6',
                        border: '1px solid #d4af37',
                        fontFamily: 'Georgia, serif'
                      }}>
                        Winners
                      </span>
                    )}
                    {badge === 'Losers' && (
                      <span className="ml-2 text-xs px-2 py-0.5 rounded font-semibold" style={{
                        background: 'rgba(255, 111, 0, 0.6)',
                        color: '#fdf5e6',
                        border: '1px solid #d4af37',
                        fontFamily: 'Georgia, serif'
                      }}>
                        Losers
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-1 text-center" style={{
                    color: '#fdf5e6',
                    fontFamily: 'Georgia, serif'
                  }}>{row.wins}</td>
                  <td className="py-2 px-1 text-center" style={{
                    color: '#fdf5e6',
                    fontFamily: 'Georgia, serif'
                  }}>{row.losses}</td>
                  <td className={`py-2 px-1 text-center font-semibold`} style={{
                    color: row.legsDiff > 0 ? '#90ee90' : row.legsDiff < 0 ? '#ff8080' : '#fdf5e6',
                    fontFamily: 'Georgia, serif'
                  }}>
                    {row.legsDiff > 0 ? '+' : ''}{row.legsDiff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend - Hidden as badges are inline */}
      <div className="mt-2 text-xs" style={{
        color: '#d4af37',
        fontFamily: 'Georgia, serif',
        opacity: 0.8
      }}>
        {topPlayers > 0 && bottomPlayers > 0 && (
          <span>Top {topPlayers} to Winners • Bottom {bottomPlayers} to Losers</span>
        )}
        {topPlayers > 0 && bottomPlayers === 0 && (
          <span>Top {topPlayers} to Winners</span>
        )}
      </div>
    </div>
  );
};
