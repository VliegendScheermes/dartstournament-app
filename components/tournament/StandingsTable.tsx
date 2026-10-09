/**
 * Standings Table Component
 * Displays pool standings with wins, losses, and legs differential
 */

'use client';

import React, { useState } from 'react';
import { StandingsRow } from '@/types/tournament';

type FinalsAssignment = 'CROSS' | 'LOSERS' | 'ELIMINATED' | null;

interface StandingsTableProps {
  poolId: string;
  poolName: string;
  standings: StandingsRow[];
  topPlayers: number;
  bottomPlayers: number;
  boardNumber?: string | null;
  onBoardNumberChange?: (poolId: string, boardNumber: string | null) => void;
  /** Not used; kept so existing callers keep compiling */
  tournamentId?: string;
  onFinalsAssignmentChange?: (playerId: string, assignment: 'CROSS' | 'LOSERS' | 'ELIMINATED' | null) => void;
  getFinalsAssignment?: (playerId: string) => 'CROSS' | 'LOSERS' | 'ELIMINATED' | null;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  poolId,
  poolName,
  standings,
  topPlayers,
  bottomPlayers,
  boardNumber,
  onBoardNumberChange,
  onFinalsAssignmentChange,
  getFinalsAssignment,
}) => {
  // Board number being typed; saved on blur or Enter (not on every keystroke)
  const [boardDraft, setBoardDraft] = useState<string | null>(null);

  const commitBoardNumber = () => {
    if (boardDraft === null) return;
    const value = boardDraft.trim();
    setBoardDraft(null);
    if (onBoardNumberChange && value !== (boardNumber ?? '')) {
      onBoardNumberChange(poolId, value === '' ? null : value);
    }
  };

  // Clicking a bracket button puts the player in that bracket; clicking the active one
  // takes them out again. A manual choice is only stored where it differs from the
  // automatic placement, so the other players keep following the standings.
  const toggleBracket = (
    playerId: string,
    bracket: 'CROSS' | 'LOSERS',
    automatic: FinalsAssignment,
    manual: FinalsAssignment
  ) => {
    if (!onFinalsAssignmentChange) return;
    if ((manual ?? automatic) !== bracket) {
      onFinalsAssignmentChange(playerId, automatic === bracket ? null : bracket);
    } else if (manual === bracket && automatic !== bracket) {
      onFinalsAssignmentChange(playerId, null); // back to the automatic placement
    } else {
      onFinalsAssignmentChange(playerId, 'ELIMINATED'); // placed there automatically: override
    }
  };

  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-900">{poolName}</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Board</label>
          <input
            type="text"
            maxLength={3}
            value={boardDraft ?? boardNumber ?? ''}
            onChange={(e) => setBoardDraft(e.target.value)}
            onBlur={commitBoardNumber}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur();
              if (e.key === 'Escape') setBoardDraft(null);
            }}
            className="w-14 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="-"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 px-2 font-semibold text-gray-700">#</th>
              <th className="text-left py-2 px-2 font-semibold text-gray-700">Name</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Wins</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Losses</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-700">Legs</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row, index) => {
              const isTopPlayer = index < topPlayers;
              const isBottomPlayer = index >= standings.length - bottomPlayers;

              // Placement by the standings (top players take precedence, as in the finals draw)
              const automatic: FinalsAssignment = isTopPlayer ? 'CROSS' : isBottomPlayer ? 'LOSERS' : null;

              // Get manual assignment if available
              const manual = getFinalsAssignment ? getFinalsAssignment(row.playerId) : null;

              // Determine final assignment (manual override or auto)
              const assignment = manual ?? automatic;

              return (
                <tr
                  key={row.playerId}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    assignment === 'CROSS' ? 'bg-green-50' : assignment === 'LOSERS' ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-gray-600">{index + 1}</td>
                  <td className="py-2 px-2 font-medium text-gray-900">
                    {row.playerName}
                    {onFinalsAssignmentChange ? (
                      <div className="inline-flex ml-2 gap-1">
                        <button
                          onClick={() => toggleBracket(row.playerId, 'CROSS', automatic, manual)}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            assignment === 'CROSS'
                              ? 'bg-green-600 text-white border-green-700'
                              : 'bg-white text-green-600 border-green-300 hover:bg-green-50'
                          }`}
                          title="Toggle Cross Finals"
                        >
                          Cross
                        </button>
                        <button
                          onClick={() => toggleBracket(row.playerId, 'LOSERS', automatic, manual)}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            assignment === 'LOSERS'
                              ? 'bg-orange-600 text-white border-orange-700'
                              : 'bg-white text-orange-600 border-orange-300 hover:bg-orange-50'
                          }`}
                          title="Toggle Losers Bracket"
                        >
                          Losers
                        </button>
                        <button
                          onClick={() =>
                            onFinalsAssignmentChange(row.playerId, manual === 'ELIMINATED' ? null : 'ELIMINATED')
                          }
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            manual === 'ELIMINATED'
                              ? 'bg-gray-600 text-white border-gray-700'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                          title={manual === 'ELIMINATED' ? 'Undo: place by standings again' : 'Eliminate from finals'}
                        >
                          -
                        </button>
                      </div>
                    ) : (
                      <>
                        {assignment === 'CROSS' && (
                          <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                            Cross
                          </span>
                        )}
                        {assignment === 'LOSERS' && (
                          <span className="ml-2 text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded">
                            Losers
                          </span>
                        )}
                      </>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900 font-medium">
                    {row.wins}
                  </td>
                  <td className="py-2 px-2 text-center text-gray-900">
                    {row.losses}
                  </td>
                  <td className={`py-2 px-2 text-center font-medium ${
                    row.legsDiff > 0 ? 'text-green-600' : row.legsDiff < 0 ? 'text-red-600' : 'text-gray-900'
                  }`}>
                    {row.legsDiff > 0 ? '+' : ''}{row.legsDiff}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {standings.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No matches confirmed yet
          </div>
        )}
      </div>
    </div>
  );
};
