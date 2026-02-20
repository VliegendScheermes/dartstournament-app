/**
 * Standings Table Component
 * Displays pool standings with wins, losses, and legs differential
 */

'use client';

import React from 'react';
import { StandingsRow } from '@/types/tournament';

interface StandingsTableProps {
  poolId: string;
  poolName: string;
  standings: StandingsRow[];
  topPlayers: number;
  bottomPlayers: number;
  boardNumber?: string | null;
  onBoardNumberChange?: (poolId: string, boardNumber: string | null) => void;
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
  tournamentId,
  onFinalsAssignmentChange,
  getFinalsAssignment,
}) => {
  const handleBoardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onBoardNumberChange) {
      onBoardNumberChange(poolId, value === '' ? null : value);
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
            value={boardNumber ?? ''}
            onChange={handleBoardNumberChange}
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

              // Get manual assignment if available
              const manualAssignment = getFinalsAssignment ? getFinalsAssignment(row.playerId) : null;

              // Determine final assignment (manual override or auto)
              const assignment = manualAssignment || (isTopPlayer ? 'CROSS' : isBottomPlayer ? 'LOSERS' : null);

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
                          onClick={() => onFinalsAssignmentChange(row.playerId, assignment === 'CROSS' ? null : 'CROSS')}
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
                          onClick={() => onFinalsAssignmentChange(row.playerId, assignment === 'LOSERS' ? null : 'LOSERS')}
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
                          onClick={() => onFinalsAssignmentChange(row.playerId, 'ELIMINATED')}
                          className={`text-xs px-1.5 py-0.5 rounded border ${
                            assignment === 'ELIMINATED'
                              ? 'bg-gray-600 text-white border-gray-700'
                              : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                          }`}
                          title="Eliminate from finals"
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
