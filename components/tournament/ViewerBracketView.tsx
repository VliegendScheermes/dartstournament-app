/**
 * Viewer Bracket View Component
 * Read-only bracket display with Black & Gold pub aesthetic
 * Newest rounds (Finals) displayed at TOP
 */

'use client';

import React from 'react';
import { Match, Player } from '@/types/tournament';

interface ViewerBracketViewProps {
  title: string;
  subtitle?: string;
  matches: Match[];
  players: Player[];
  isLosers: boolean;
}

export const ViewerBracketView: React.FC<ViewerBracketViewProps> = ({
  title,
  subtitle,
  matches,
  players,
  isLosers,
}) => {
  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  const getRoundName = (roundIndex: number, totalRounds: number): string => {
    const roundsFromEnd = totalRounds - roundIndex;
    if (roundsFromEnd === 0) return 'Final';
    if (roundsFromEnd === 1) return 'Semi-Finals';
    if (roundsFromEnd === 2) return 'Quarter-Finals';
    return `Round ${roundIndex}`;
  };

  // Group matches by round and REVERSE order (highest round first)
  const matchesByRound: { [key: number]: Match[] } = {};
  matches.forEach((match) => {
    if (!matchesByRound[match.roundIndex]) {
      matchesByRound[match.roundIndex] = [];
    }
    matchesByRound[match.roundIndex].push(match);
  });

  const rounds = Object.keys(matchesByRound)
    .map((r) => parseInt(r))
    .sort((a, b) => b - a); // REVERSED: Highest round first

  const totalRounds = matches.length > 0 ? Math.max(...matches.map((m) => m.roundIndex)) : 0;

  // Color scheme: Forest Green for Cross Finals, Deep Bordeaux Red for Losers Bracket
  const containerBg = isLosers ? '#4a0404' : '#004d30';
  const matchCardBg = isLosers ? 'rgba(74, 4, 4, 0.4)' : 'rgba(0, 77, 48, 0.4)';

  return (
    <div className="rounded-lg shadow-2xl p-6 h-full flex flex-col" style={{
      background: containerBg,
      border: '3px solid #d4af37',
      boxShadow: '0 12px 32px rgba(0, 0, 0, 0.8), 0 0 25px rgba(212, 175, 55, 0.4)'
    }}>
      {/* Header */}
      <div className="mb-4 pb-3 flex-shrink-0" style={{
        borderBottom: '2px solid rgba(212, 175, 55, 0.4)'
      }}>
        <h3 className="text-2xl font-bold" style={{
          fontFamily: 'Georgia, serif',
          color: '#d4af37',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
        }}>
          {title}
        </h3>
        {subtitle && (
          <p className="text-sm mt-1" style={{
            fontFamily: 'Georgia, serif',
            color: '#d4af37',
            opacity: 0.8
          }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Rounds - Newest (Finals) at TOP */}
      <div className="space-y-6 flex-1 overflow-y-auto">
        {rounds.map((roundIndex) => {
          const roundMatches = matchesByRound[roundIndex];
          const roundName = getRoundName(roundIndex, totalRounds);

          return (
            <div key={`round-${roundIndex}`} className="pb-4" style={{
              borderBottom: rounds[rounds.length - 1] !== roundIndex ? '1px solid rgba(212, 175, 55, 0.2)' : 'none'
            }}>
              {/* Round Title */}
              <h4 className="text-lg font-bold mb-3" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37'
              }}>
                {roundName}
              </h4>

              {/* Matches */}
              <div className="space-y-3">
                {roundMatches.map((match) => {
                  const isComplete = match.confirmed && match.legsP1 !== null && match.legsP2 !== null;

                  // In Losers Bracket: highlight the LOSER (who advances)
                  // In Cross Finals: highlight the WINNER (who advances)
                  let player1Advances, player2Advances;
                  if (isLosers) {
                    // Losers bracket: player with fewer legs advances
                    player1Advances = isComplete && match.legsP1! < match.legsP2!;
                    player2Advances = isComplete && match.legsP2! < match.legsP1!;
                  } else {
                    // Cross finals: player with more legs advances
                    player1Advances = isComplete && match.legsP1! > match.legsP2!;
                    player2Advances = isComplete && match.legsP2! > match.legsP1!;
                  }

                  const player1Name = getPlayerName(match.player1Id);
                  const player2Name = getPlayerName(match.player2Id);

                  return (
                    <div
                      key={match.id}
                      className="flex items-center gap-3 p-4 rounded-lg"
                      style={{
                        background: matchCardBg,
                        border: '1px solid rgba(212, 175, 55, 0.3)'
                      }}
                    >
                      {/* Player Names - Horizontal Layout */}
                      <div className="flex-1 flex items-center justify-between gap-3">
                        {/* Player 1 */}
                        <div className="flex-1 flex items-center">
                          <span className={`text-base font-medium ${player1Advances ? 'font-bold' : ''}`} style={{
                            fontFamily: 'Georgia, serif',
                            color: player1Advances ? '#d4af37' : '#fdf5e6'
                          }}>
                            {player1Name}
                          </span>
                        </div>

                        {/* VS Badge */}
                        <div className="flex-shrink-0 px-3 py-1 rounded" style={{
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

                        {/* Player 2 */}
                        <div className="flex-1 flex items-center justify-end">
                          <span className={`text-base font-medium ${player2Advances ? 'font-bold' : ''}`} style={{
                            fontFamily: 'Georgia, serif',
                            color: player2Advances ? '#d4af37' : '#fdf5e6'
                          }}>
                            {player2Name}
                          </span>
                        </div>
                      </div>

                      {/* Scores - Brass Plaque Boxes */}
                      {isComplete && (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-lg font-bold px-3 py-1 rounded" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#1a1a1a',
                            background: player1Advances ? '#d4af37' : 'rgba(212, 175, 55, 0.4)',
                            border: '1px solid #000000'
                          }}>
                            {match.legsP1}
                          </span>
                          <span className="text-sm font-semibold" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#d4af37'
                          }}>
                            -
                          </span>
                          <span className="text-lg font-bold px-3 py-1 rounded" style={{
                            fontFamily: 'Georgia, serif',
                            color: '#1a1a1a',
                            background: player2Advances ? '#d4af37' : 'rgba(212, 175, 55, 0.4)',
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

        {rounds.length === 0 && (
          <div className="text-center py-12" style={{
            fontFamily: 'Georgia, serif',
            color: '#d4af37',
            opacity: 0.7
          }}>
            No finals matches yet
          </div>
        )}
      </div>
    </div>
  );
};
