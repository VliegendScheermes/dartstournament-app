/**
 * Viewer Bracket View Component
 * Read-only bracket display with Black & Gold pub aesthetic
 * Newest rounds (Finals) displayed at TOP
 */

'use client';

import React from 'react';
import { Player } from '@/types/tournament';
import { BracketPair, BracketRound } from '@/lib/algorithms/finals';

interface ViewerBracketViewProps {
  title: string;
  subtitle?: string;
  /** Rounds from buildBracket (round 1 first) */
  rounds: BracketRound[];
  players: Player[];
  isLosers: boolean;
}

export const ViewerBracketView: React.FC<ViewerBracketViewProps> = ({
  title,
  subtitle,
  rounds,
  players,
  isLosers,
}) => {
  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  // null = bye (the other player moves on without playing), undefined = not known yet
  const getParticipantLabel = (playerId: string | null | undefined): string => {
    if (playerId === null) return 'Bye';
    if (playerId === undefined) return 'TBD';
    return getPlayerName(playerId);
  };

  // Rounds that have started (at least one player known), newest round at the top
  const visibleRounds = rounds
    .filter((round) =>
      round.pairs.some((pair) => typeof pair.player1Id === 'string' || typeof pair.player2Id === 'string')
    )
    .reverse();

  // Color scheme: Forest Green for Cross Finals, Deep Bordeaux Red for Losers Bracket
  const containerBg = isLosers ? '#4a0404' : '#004d30';
  const matchCardBg = isLosers ? 'rgba(74, 4, 4, 0.4)' : 'rgba(0, 77, 48, 0.4)';

  const renderParticipant = (playerId: string | null | undefined, advances: boolean, alignEnd: boolean) => (
    <div className={`flex-1 flex items-center ${alignEnd ? 'justify-end' : ''}`}>
      <span className={`text-base font-medium ${advances ? 'font-bold' : ''} ${typeof playerId === 'string' ? '' : 'italic'}`} style={{
        fontFamily: 'Georgia, serif',
        color: advances ? '#d4af37' : '#fdf5e6',
        opacity: typeof playerId === 'string' ? 1 : 0.5
      }}>
        {getParticipantLabel(playerId)}
      </span>
    </div>
  );

  const renderPair = (pair: BracketPair, key: string) => {
    // In Losers Bracket the LOSER advances, in Cross Finals the WINNER; byes advance too
    const player1Advances = typeof pair.player1Id === 'string' && pair.advancingId === pair.player1Id;
    const player2Advances = typeof pair.player2Id === 'string' && pair.advancingId === pair.player2Id;

    const match = pair.match;
    const isComplete = !!match && match.confirmed && match.legsP1 !== null && match.legsP2 !== null;
    // The match may list the players the other way around than the bracket
    const swapped = !!match && match.player1Id !== pair.player1Id;
    const legsPlayer1 = match ? (swapped ? match.legsP2 : match.legsP1) : null;
    const legsPlayer2 = match ? (swapped ? match.legsP1 : match.legsP2) : null;

    return (
      <div
        key={key}
        className="flex items-center gap-3 p-4 rounded-lg"
        style={{
          background: matchCardBg,
          border: '1px solid rgba(212, 175, 55, 0.3)'
        }}
      >
        {/* Player Names - Horizontal Layout */}
        <div className="flex-1 flex items-center justify-between gap-3">
          {renderParticipant(pair.player1Id, player1Advances, false)}

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

          {renderParticipant(pair.player2Id, player2Advances, true)}
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
              {legsPlayer1}
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
              {legsPlayer2}
            </span>
          </div>
        )}
      </div>
    );
  };

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
        {visibleRounds.map((round, index) => (
          <div key={`round-${round.roundIndex}`} className="pb-4" style={{
            borderBottom: index < visibleRounds.length - 1 ? '1px solid rgba(212, 175, 55, 0.2)' : 'none'
          }}>
            {/* Round Title */}
            <h4 className="text-lg font-bold mb-3" style={{
              fontFamily: 'Georgia, serif',
              color: '#d4af37'
            }}>
              {round.name}
            </h4>

            {/* Matches (a pair of two byes only pads the bracket) */}
            <div className="space-y-3">
              {round.pairs.map((pair, pairIndex) =>
                pair.player1Id === null && pair.player2Id === null
                  ? null
                  : renderPair(pair, `${round.roundIndex}-${pairIndex}`)
              )}
            </div>
          </div>
        ))}

        {visibleRounds.length === 0 && (
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
