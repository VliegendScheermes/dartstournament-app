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
  boardNumber?: number | null;
  onBoardNumberChange?: (poolId: string, boardNumber: number | null) => void;
}

export const StandingsTable: React.FC<StandingsTableProps> = ({
  poolId,
  poolName,
  standings,
  topPlayers,
  bottomPlayers,
  boardNumber,
  onBoardNumberChange,
}) => {
  const handleBoardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (onBoardNumberChange) {
      onBoardNumberChange(poolId, value === '' ? null : parseInt(value));
    }
  };

  return (
    <div className="border-b border-gray-200 pb-4 last:border-b-0">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg text-gray-900">{poolName}</h3>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Board</label>
          <input
            type="number"
            min="0"
            value={boardNumber ?? ''}
            onChange={handleBoardNumberChange}
            className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
            placeholder="0"
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

              return (
                <tr
                  key={row.playerId}
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    isTopPlayer ? 'bg-green-50' : isBottomPlayer ? 'bg-orange-50' : ''
                  }`}
                >
                  <td className="py-2 px-2 text-gray-600">{index + 1}</td>
                  <td className="py-2 px-2 font-medium text-gray-900">
                    {row.playerName}
                    {isTopPlayer && (
                      <span className="ml-2 text-xs bg-green-600 text-white px-1.5 py-0.5 rounded">
                        Cross
                      </span>
                    )}
                    {isBottomPlayer && (
                      <span className="ml-2 text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded">
                        Losers
                      </span>
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
