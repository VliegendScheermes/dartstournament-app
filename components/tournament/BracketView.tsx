/**
 * Bracket View Component
 * Displays tournament brackets with match input
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Match, Player } from '@/types/tournament';

interface BracketViewProps {
  title: string;
  matches: Match[];
  players: Player[];
  isLosers?: boolean;
  onMatchUpdate: (matchId: string, legsP1: number, legsP2: number) => void;
  onMatchConfirm: (matchId: string, legsP1?: number, legsP2?: number) => void;
  onMatchEdit: (matchId: string) => void;
  onSaveRound?: (roundIndex: number) => void;
}

export const BracketView: React.FC<BracketViewProps> = ({
  title,
  matches,
  players,
  isLosers = false,
  onMatchUpdate,
  onMatchConfirm,
  onMatchEdit,
  onSaveRound,
}) => {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [localScores, setLocalScores] = useState<{
    [matchId: string]: { p1: string; p2: string };
  }>({});

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
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

    if (p1 === p2) {
      alert('Scores cannot be equal - there must be a winner');
      return;
    }

    // Update match scores and confirm in one call
    onMatchUpdate(match.id, p1, p2);
    // Pass scores directly to avoid state timing issues
    onMatchConfirm(match.id, p1, p2);
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

  // Group matches by round
  const matchesByRound: { [round: number]: Match[] } = {};
  matches.forEach((match) => {
    if (!matchesByRound[match.roundIndex]) {
      matchesByRound[match.roundIndex] = [];
    }
    matchesByRound[match.roundIndex].push(match);
  });

  const rounds = Object.keys(matchesByRound)
    .map((r) => parseInt(r))
    .sort((a, b) => b - a);

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    const matchesInRound = matchesByRound[roundIndex].length;

    // Name rounds based on number of matches in that round
    if (matchesInRound === 1) {
      return 'Final';
    } else if (matchesInRound === 2) {
      return 'Semi Finals';
    } else if (matchesInRound === 4) {
      return 'Quarter Finals';
    } else if (matchesInRound === 8) {
      return 'Round of 16';
    } else if (matchesInRound === 16) {
      return 'Round of 32';
    }

    return `Round ${roundIndex}`;
  };

  return (
    <Card title={title} className="mb-6">
      {isLosers && (
        <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-sm text-orange-800 font-medium">
            ⚠️ Losers Bracket: The <strong>loser</strong> of each match advances to the next round
          </p>
        </div>
      )}

      <div className="space-y-6">
        {rounds.map((roundIndex) => {
          const roundMatches = matchesByRound[roundIndex];
          const roundName = getRoundName(roundIndex, rounds.length);

          return (
            <div key={roundIndex} className="border-b border-gray-200 pb-4 last:border-b-0">
              <h4 className="font-semibold text-gray-900 mb-3">{roundName}</h4>

              <div className="space-y-3">
                {roundMatches.map((match) => {
                  const isEditing = editingMatch === match.id;
                  const scores = localScores[match.id];

                  return (
                    <div
                      key={match.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border ${
                        match.confirmed
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {/* Player Names */}
                      <div className="flex-1 flex items-center justify-between max-w-md">
                        <span className="text-sm font-medium text-gray-900">
                          {getPlayerName(match.player1Id)}
                        </span>
                        <span className="text-xs text-gray-500 mx-1">vs</span>
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
            </div>
          );
        })}

        {matches.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No matches in this bracket
          </div>
        )}
      </div>
    </Card>
  );
};
