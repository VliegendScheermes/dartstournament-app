/**
 * Match Schedule Component
 * Displays matches by round with input and confirmation
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Match, Player, Round } from '@/types/tournament';

interface MatchScheduleProps {
  poolId: string;
  poolName: string;
  matches: Match[];
  rounds: Round[];
  players: Player[];
  onMatchUpdate: (matchId: string, legsP1: number, legsP2: number) => void;
  onMatchConfirm: (matchId: string) => void;
  onMatchEdit: (matchId: string) => void;
  onSaveRound: (roundIndex: number) => void;
}

export const MatchSchedule: React.FC<MatchScheduleProps> = ({
  poolId,
  poolName,
  matches,
  rounds,
  players,
  onMatchUpdate,
  onMatchConfirm,
  onMatchEdit,
  onSaveRound,
}) => {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [localScores, setLocalScores] = useState<{
    [matchId: string]: { p1: string; p2: string };
  }>({});

  // Handle "ALL" pools or specific pool
  const poolMatches = poolId === 'ALL'
    ? matches.filter((m) => m.stage === 'POOL')
    : matches.filter((m) => m.poolId === poolId);

  // Get unique round indices
  const roundIndices = Array.from(
    new Set(poolMatches.map((m) => m.roundIndex))
  ).sort((a, b) => a - b);

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  const getPoolName = (match: Match): string => {
    const poolLetter = match.poolId;
    return `Poule ${poolLetter}`;
  };

  const handleScoreChange = (matchId: string, player: 'p1' | 'p2', value: string) => {
    setLocalScores((prev) => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || { p1: '', p2: '' }),
        [player]: value,
      },
    }));
  };

  const handleConfirmClick = (match: Match) => {
    const scores = localScores[match.id];
    const p1 = scores?.p1 ? parseInt(scores.p1) : match.legsP1;
    const p2 = scores?.p2 ? parseInt(scores.p2) : match.legsP2;

    if (p1 === null || p2 === null || isNaN(p1) || isNaN(p2)) {
      alert('Please enter valid scores for both players');
      return;
    }

    if (p1 < 0 || p2 < 0) {
      alert('Scores must be positive numbers');
      return;
    }

    onMatchUpdate(match.id, p1, p2);
    onMatchConfirm(match.id);
    setEditingMatch(null);
    setLocalScores((prev) => {
      const newScores = { ...prev };
      delete newScores[match.id];
      return newScores;
    });
  };

  const handleEditClick = (match: Match) => {
    setEditingMatch(match.id);
    setLocalScores((prev) => ({
      ...prev,
      [match.id]: {
        p1: match.legsP1?.toString() || '',
        p2: match.legsP2?.toString() || '',
      },
    }));
    onMatchEdit(match.id);
  };

  const handleSaveRoundClick = (roundIndex: number) => {
    const roundMatches = poolMatches.filter((m) => m.roundIndex === roundIndex);

    // Check if all matches have scores (either confirmed or in localScores)
    const allFilled = roundMatches.every((match) => {
      // Check if match already has confirmed scores
      if (match.legsP1 !== null && match.legsP2 !== null) {
        return true;
      }

      // Check if match has valid local scores entered
      const scores = localScores[match.id];
      if (scores &&
          scores.p1 !== undefined && scores.p1 !== '' &&
          scores.p2 !== undefined && scores.p2 !== '') {
        return true;
      }

      return false;
    });

    if (!allFilled) {
      alert('Please enter scores for all matches in this round');
      return;
    }

    // Update and confirm all matches in the round
    roundMatches.forEach((match) => {
      if (!match.confirmed) {
        // If scores are in localScores, update the match first
        const scores = localScores[match.id];
        if (scores &&
            scores.p1 !== undefined && scores.p1 !== '' &&
            scores.p2 !== undefined && scores.p2 !== '') {
          const p1 = parseInt(scores.p1);
          const p2 = parseInt(scores.p2);
          if (!isNaN(p1) && !isNaN(p2) && p1 >= 0 && p2 >= 0) {
            onMatchUpdate(match.id, p1, p2);
          }
        }
        onMatchConfirm(match.id);
      }
    });

    // Clear local scores for this round
    setLocalScores((prev) => {
      const newScores = { ...prev };
      roundMatches.forEach((match) => {
        delete newScores[match.id];
      });
      return newScores;
    });

    onSaveRound(roundIndex);
  };

  return (
    <Card title="Match Schedule" className="h-full flex flex-col">
      <div className="space-y-6 flex-1 overflow-y-auto">
        {roundIndices.map((roundIndex) => {
          const roundMatches = poolMatches.filter((m) => m.roundIndex === roundIndex);
          const allConfirmed = roundMatches.every((m) => m.confirmed);

          return (
            <div key={`round-${roundIndex}`} className="border-b border-gray-200 pb-4 last:border-b-0">
              <div className="mb-3">
                <h4 className="font-semibold text-gray-900">Round {roundIndex}</h4>
              </div>

              <div className="space-y-2">
                {roundMatches.map((match) => {
                  const isEditing = editingMatch === match.id;
                  const scores = localScores[match.id];
                  const showPoolName = poolId === 'ALL';

                  return (
                    <div
                      key={match.id}
                      className={`flex items-center gap-2 p-3 rounded-lg border ${
                        match.confirmed
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {/* Pool Name (if showing all pools) */}
                      {showPoolName && (
                        <div className="flex-shrink-0 w-16">
                          <span className="text-xs font-semibold text-gray-600">
                            {getPoolName(match)}
                          </span>
                        </div>
                      )}

                      {/* Player Names */}
                      <div className="flex-1 flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-900">
                          {getPlayerName(match.player1Id)}
                        </span>
                        <span className="text-xs text-gray-500 mx-2">vs</span>
                        <span className="text-sm font-medium text-gray-900">
                          {getPlayerName(match.player2Id)}
                        </span>
                      </div>

                      {/* Score Inputs */}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={
                            localScores[match.id]?.p1 !== undefined
                              ? localScores[match.id].p1
                              : match.legsP1?.toString() || ''
                          }
                          onChange={(e) =>
                            handleScoreChange(match.id, 'p1', e.target.value)
                          }
                          disabled={match.confirmed && !isEditing}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          placeholder="-"
                        />
                        <span className="text-gray-500">-</span>
                        <input
                          type="number"
                          min="0"
                          value={
                            localScores[match.id]?.p2 !== undefined
                              ? localScores[match.id].p2
                              : match.legsP2?.toString() || ''
                          }
                          onChange={(e) =>
                            handleScoreChange(match.id, 'p2', e.target.value)
                          }
                          disabled={match.confirmed && !isEditing}
                          className="w-16 px-2 py-1 text-center border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                          placeholder="-"
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1">
                        {!match.confirmed || isEditing ? (
                          <button
                            onClick={() => handleConfirmClick(match)}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title="Confirm match"
                          >
                            ✅
                          </button>
                        ) : (
                          <button
                            onClick={() => handleEditClick(match)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title="Edit match"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Save Round Button / Saved Badge */}
              <div className="mt-3 flex justify-end">
                {allConfirmed ? (
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">
                    Saved
                  </span>
                ) : (
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleSaveRoundClick(roundIndex)}
                  >
                    Save Round
                  </Button>
                )}
              </div>
            </div>
          );
        })}

        {roundIndices.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No matches scheduled
          </div>
        )}
      </div>
    </Card>
  );
};
