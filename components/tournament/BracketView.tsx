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
  tournamentId: string;
  onMatchUpdate: (matchId: string, legsP1: number, legsP2: number) => void;
  onMatchConfirm: (matchId: string, legsP1?: number, legsP2?: number) => void;
  onMatchEdit: (matchId: string) => void;
  onSaveRound?: (roundIndex: number, stage: 'CROSS' | 'LOSERS') => void;
}

export const BracketView: React.FC<BracketViewProps> = ({
  title,
  matches,
  players,
  isLosers = false,
  tournamentId,
  onMatchUpdate,
  onMatchConfirm,
  onMatchEdit,
  onSaveRound,
}) => {
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [recordedMatchId, setRecordedMatchId] = useState<string | null>(null);
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

  const handleRecordClick = (match: Match) => {
    setRecordedMatchId(prev => prev === match.id ? null : match.id);
  };

  const handleRecordDoubleClick = (match: Match) => {
    const p1 = players.find(p => p.id === match.player1Id)?.name || '';
    const p2 = players.find(p => p.id === match.player2Id)?.name || '';
    const url = `/tournament/${tournamentId}/scoreboard?p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}`;
    window.open(url, '_blank');
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

    let baseName = '';

    // Name rounds based on number of matches in that round
    if (matchesInRound === 1) {
      baseName = 'Final';
    } else if (matchesInRound === 2) {
      baseName = 'Semi Finals';
    } else if (matchesInRound === 4) {
      baseName = 'Quarter Finals';
    } else if (matchesInRound === 8) {
      baseName = 'Round of 16';
    } else if (matchesInRound === 16) {
      baseName = 'Round of 32';
    } else {
      baseName = `Round ${roundIndex}`;
    }

    // Add "Losers" prefix for losers bracket
    return isLosers ? `Losers ${baseName}` : baseName;
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

                      {/* Record Button */}
                      <button
                        onClick={() => handleRecordClick(match)}
                        onDoubleClick={() => handleRecordDoubleClick(match)}
                        title={recordedMatchId === match.id ? "On air — dubbelklik om scorebord te openen" : "Zet op scorebord"}
                        className="flex-shrink-0 w-8 h-8 rounded-full border-2 transition-colors"
                        style={{
                          backgroundColor: recordedMatchId === match.id ? '#ef4444' : 'transparent',
                          borderColor: recordedMatchId === match.id ? '#ef4444' : '#9ca3af',
                        }}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Save Round Button */}
              {onSaveRound && roundMatches.every((m) => m.confirmed) && (
                <div className="mt-3">
                  <button
                    onClick={() => onSaveRound(roundIndex, isLosers ? 'LOSERS' : 'CROSS')}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    Save {roundName} & Generate Next Round
                  </button>
                </div>
              )}
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
