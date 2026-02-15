/**
 * Finals Page
 * Cross-finals and losers brackets
 */

'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { BracketView } from '@/components/tournament/BracketView';
import { WinnerDisplay } from '@/components/tournament/WinnerDisplay';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  selectFinalists,
  generateCrossFinalsMatches,
  generateLosersBracketMatches,
  getMatchWinner,
  getMatchLoser,
  generateNextCrossRound,
  generateNextLosersRound,
} from '@/lib/algorithms/finals';
import { Match } from '@/types/tournament';
import { useState } from 'react';

interface FinalsPageProps {
  params: Promise<{ id: string }>;
}

export default function FinalsPage({ params }: FinalsPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);

  const [archiveModal, setArchiveModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [resetModal, setResetModal] = useState(false);

  const {
    loadTournament,
    setMatches,
    updateMatch,
    confirmMatch,
    unconfirmMatch,
    updateStatus,
    archiveTournament,
    deleteTournament,
    isLoading,
    error,
  } = useTournamentStore();

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const getStandings = useTournamentStore(state => state.getStandings);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load tournament from API
  useEffect(() => {
    if (isHydrated) {
      loadTournament(id);
    }
  }, [id, isHydrated, loadTournament]);

  useEffect(() => {
    if (!tournament || !isHydrated) return;

    const generateFinalsMatches = async () => {
      // Generate finals matches if not already done
      const finalsMatches = tournament.matches.filter(
        (m) => m.stage === 'CROSS' || m.stage === 'LOSERS'
      );

      if (finalsMatches.length === 0) {
        try {
          // Get standings for all pools
          const allStandings: { [poolId: string]: any[] } = {};
          tournament.pools.forEach((pool) => {
            allStandings[pool.id] = getStandings(id, pool.id);
          });

          // Select finalists
          const { crossFinalists, losersFinalists } = selectFinalists(
            tournament.pools,
            allStandings,
            tournament.settings.advanceToCrossFinals,
            tournament.settings.advanceToLosersFinal
          );

          // Generate brackets
          const crossMatches = generateCrossFinalsMatches(crossFinalists);

          // Only generate losers bracket if the setting is enabled (> 0)
          const losersMatches = tournament.settings.advanceToLosersFinal > 0
            ? generateLosersBracketMatches(losersFinalists)
            : [];

          // Save to store
          const allMatches = [
            ...tournament.matches,
            ...crossMatches,
            ...losersMatches,
          ];
          await setMatches(id, allMatches);
        } catch (error) {
          console.error('Failed to generate finals matches:', error);
        }
      }
    };

    generateFinalsMatches();
  }, [id, tournament, getStandings, setMatches, isHydrated]);

  if (!isHydrated || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            {error ? 'Failed to Load Tournament' : 'Tournament Not Found'}
          </h1>
          {error && <p className="text-red-600 mb-4">{error}</p>}
          <button
            onClick={() => router.push('/')}
            className="text-blue-600 hover:underline"
          >
            Go back to home
          </button>
        </div>
      </div>
    );
  }

  const crossMatches = tournament.matches.filter((m) => m.stage === 'CROSS');
  const losersMatches = tournament.matches.filter((m) => m.stage === 'LOSERS');

  const handleMatchUpdate = async (matchId: string, legsP1: number, legsP2: number) => {
    try {
      await updateMatch(id, matchId, { legsP1, legsP2 });
    } catch (error) {
      console.error('Failed to update match:', error);
    }
  };

  const handleMatchConfirm = async (matchId: string, legsP1?: number, legsP2?: number) => {
    // First, validate the match has valid scores
    const match = tournament.matches.find((m) => m.id === matchId);
    if (!match) {
      console.error('Match not found');
      return;
    }

    // Use provided scores or existing scores
    const p1 = legsP1 !== undefined ? legsP1 : match.legsP1;
    const p2 = legsP2 !== undefined ? legsP2 : match.legsP2;

    if (p1 === null || p2 === null) {
      console.error('Cannot confirm match without valid scores');
      return;
    }

    try {
      // Confirm the match in the store
      await confirmMatch(id, matchId);

      // Get all matches in the same round and stage
      const currentRoundMatches = tournament.matches.filter(
        (m) => m.stage === match.stage && m.roundIndex === match.roundIndex
      );

      // Check if all matches in this round are now confirmed (including the one we just confirmed)
      const allConfirmed = currentRoundMatches.every(
        (m) => m.confirmed || m.id === matchId
      );

      if (!allConfirmed) {
        // Still waiting for other matches in this round to be confirmed
        console.log(`Round ${match.roundIndex}: Waiting for ${currentRoundMatches.filter(m => !m.confirmed && m.id !== matchId).length} more matches`);
        return;
      }

      // All matches in the round are confirmed - time to progress to next round
      console.log(`Round ${match.roundIndex} complete with ${currentRoundMatches.length} matches`);

      if (match.stage === 'CROSS') {
        // Check if this was the Final match (only 1 match in the round)
        if (currentRoundMatches.length === 1) {
          // Tournament is complete - we just confirmed the Final
          console.log('🏆 Final match confirmed - Tournament complete!');
          await updateStatus(id, 'completed');
          return;
        }

        // Generate next round with winners
      console.log(`Generating next round (${match.roundIndex + 1}) from ${currentRoundMatches.length} matches`);

      // Create updated matches array with scores and confirmation
      const updatedCurrentMatches = currentRoundMatches.map((m) =>
        m.id === matchId ? { ...m, confirmed: true, legsP1: p1, legsP2: p2 } : m
      );

      const nextRoundMatches = generateNextCrossRound(
        updatedCurrentMatches,
        match.roundIndex + 1
      );

      if (nextRoundMatches.length > 0) {
        console.log(`✓ Generated ${nextRoundMatches.length} matches for round ${match.roundIndex + 1}`);

        // Check if next round already exists to prevent duplicates
        const existingNextRound = tournament.matches.filter(
          (m) => m.stage === 'CROSS' && m.roundIndex === match.roundIndex + 1
        );

        if (existingNextRound.length === 0) {
          // First update the current match with scores and confirmation
          const updatedMatches = tournament.matches.map((m) =>
            m.id === matchId ? { ...m, legsP1: p1, legsP2: p2, confirmed: true } : m
          );

          // Then add new round matches
          const allMatches = [...updatedMatches, ...nextRoundMatches];
          setMatches(id, allMatches);
          console.log(`✓ Added next round. Total matches: ${allMatches.length}`);
        } else {
          console.log('⚠ Next round already exists, skipping generation');
        }
      } else {
        console.warn('⚠ No next round matches generated');
      }

    } else if (match.stage === 'LOSERS') {
      // Losers bracket logic
      if (currentRoundMatches.length === 1) {
        console.log('Losers bracket Final complete');
        return;
      }

      // Generate next round with losers (include scores for winner determination)
      const updatedCurrentMatches = currentRoundMatches.map((m) =>
        m.id === matchId ? { ...m, confirmed: true, legsP1: p1, legsP2: p2 } : m
      );

      const nextRoundMatches = generateNextLosersRound(
        updatedCurrentMatches,
        match.roundIndex + 1
      );

      if (nextRoundMatches.length > 0) {
        const existingNextRound = tournament.matches.filter(
          (m) => m.stage === 'LOSERS' && m.roundIndex === match.roundIndex + 1
        );

        if (existingNextRound.length === 0) {
          // First update the current match with scores and confirmation
          const updatedMatches = tournament.matches.map((m) =>
            m.id === matchId ? { ...m, legsP1: p1, legsP2: p2, confirmed: true } : m
          );

          // Then add new round matches
          setMatches(id, [...updatedMatches, ...nextRoundMatches]);
        }
      }
    }
    } catch (error) {
      console.error('Failed to confirm match:', error);
      return;
    }
  };

  const handleMatchEdit = (matchId: string) => {
    unconfirmMatch(id, matchId);
  };

  const handleArchive = () => {
    archiveTournament(id);
    setArchiveModal(false);
    router.push('/');
  };

  const handleDelete = () => {
    deleteTournament(id);
    setDeleteModal(false);
    router.push('/');
  };

  const handleReset = () => {
    // Remove all CROSS and LOSERS matches to regenerate finals
    const poolMatches = tournament.matches.filter(
      (m) => m.stage === 'POOL'
    );
    setMatches(id, poolMatches);
    setResetModal(false);

    // Reset tournament status to pool-play if it was completed
    if (tournament.status === 'completed') {
      updateStatus(id, 'pool-play');
    }
  };

  // Find champion and loser
  // Champion: Only from the Final round (a round with exactly 1 match in CROSS bracket)
  const crossMatchesByRound: { [round: number]: Match[] } = {};
  crossMatches.forEach((match) => {
    if (!crossMatchesByRound[match.roundIndex]) {
      crossMatchesByRound[match.roundIndex] = [];
    }
    crossMatchesByRound[match.roundIndex].push(match);
  });

  // Find the Final match (round with exactly 1 match that is confirmed)
  // Important: A player is ONLY the champion if they win the very last match (where matchesInRound == 1)
  let finalCrossMatch: Match | null = null;
  let hasPendingRounds = false;

  Object.entries(crossMatchesByRound).forEach(([roundIndex, roundMatches]) => {
    // Check if this is the Final round (only 1 match)
    if (roundMatches.length === 1) {
      const match = roundMatches[0];
      if (match.confirmed) {
        // This is the Final and it's confirmed - we have a champion!
        finalCrossMatch = match;
      } else {
        // Final exists but not confirmed yet
        hasPendingRounds = true;
      }
    } else {
      // Check if there are unconfirmed matches in non-final rounds
      const hasUnconfirmed = roundMatches.some(m => !m.confirmed);
      if (hasUnconfirmed) {
        hasPendingRounds = true;
      }
    }
  });

  // Loser: From the final round of losers bracket
  const losersMatchesByRound: { [round: number]: Match[] } = {};
  losersMatches.forEach((match) => {
    if (!losersMatchesByRound[match.roundIndex]) {
      losersMatchesByRound[match.roundIndex] = [];
    }
    losersMatchesByRound[match.roundIndex].push(match);
  });

  let finalLosersMatch: Match | null = null;
  Object.entries(losersMatchesByRound).forEach(([roundIndex, roundMatches]) => {
    if (roundMatches.length === 1 && roundMatches[0].confirmed) {
      finalLosersMatch = roundMatches[0];
    }
  });

  // Only show champion if the Final match (1 match in round) has been confirmed
  const championId = finalCrossMatch ? getMatchWinner(finalCrossMatch) : null;
  const loserId = finalLosersMatch ? getMatchLoser(finalLosersMatch) : null;

  const championName = championId
    ? tournament.players.find((p) => p.id === championId)?.name || null
    : null;

  const loserName = loserId
    ? tournament.players.find((p) => p.id === loserId)?.name || null
    : null;

  // Check if there are unconfirmed pool matches
  const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
  const unconfirmedPoolMatches = poolMatches.filter((m) => !m.confirmed);
  const hasUnconfirmedPoolMatches = unconfirmedPoolMatches.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/')}
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              ← Back to Tournaments
            </button>
            <button
              onClick={() => router.push(`/tournament/${id}/setup`)}
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              ← Back to Setup
            </button>
            <button
              onClick={() => router.push(`/tournament/${id}/pool-play`)}
              className="text-blue-600 hover:underline flex items-center gap-2"
            >
              ← Back to Pool Play
            </button>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {tournament.settings.tournamentName}
          </h1>
          <p className="text-gray-500 mt-1">Finals Phase</p>
        </div>

        {/* Warning for unconfirmed pool matches */}
        {hasUnconfirmedPoolMatches && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-yellow-600 text-xl">⚠️</div>
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Pool Play Not Complete
                </h3>
                <p className="text-sm text-yellow-800">
                  You have {unconfirmedPoolMatches.length} unconfirmed pool match{unconfirmedPoolMatches.length !== 1 ? 'es' : ''}.
                  The finals bracket is based on current standings, but may change if you update pool play results.
                </p>
                <p className="text-sm text-yellow-800 mt-2">
                  Use the <strong>Reset Finals</strong> button below to regenerate the bracket after making changes to pool play.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Winner Display */}
        {(championName || loserName) && (
          <div className="mb-8">
            <WinnerDisplay championName={championName} loserName={loserName} />
          </div>
        )}

        {/* Brackets Container - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Losers Bracket - Left Column (Only show if enabled) */}
          {tournament.settings.advanceToLosersFinal > 0 && (
            <div className="flex-1">
              <BracketView
                title="Losers Bracket (Loser Advances)"
                matches={losersMatches}
                players={tournament.players}
                isLosers={true}
                onMatchUpdate={handleMatchUpdate}
                onMatchConfirm={handleMatchConfirm}
                onMatchEdit={handleMatchEdit}
              />
            </div>
          )}

          {/* Cross-Finals Bracket - Right Column */}
          <div className="flex-1">
            <BracketView
              title="Cross Finals (Winner Advances)"
              matches={crossMatches}
              players={tournament.players}
              isLosers={false}
              onMatchUpdate={handleMatchUpdate}
              onMatchConfirm={handleMatchConfirm}
              onMatchEdit={handleMatchEdit}
            />
          </div>
        </div>

        {/* Tournament Actions */}
        <div className="mt-8 flex gap-4 justify-center">
          <Button
            variant="primary"
            onClick={() => setResetModal(true)}
          >
            Reset Finals
          </Button>
          <Button
            variant="secondary"
            onClick={() => setArchiveModal(true)}
          >
            Archive Tournament
          </Button>
          <Button
            variant="danger"
            onClick={() => setDeleteModal(true)}
          >
            Delete Tournament
          </Button>
        </div>

        {/* Archive Modal */}
        <Modal
          isOpen={archiveModal}
          onClose={() => setArchiveModal(false)}
          onConfirm={handleArchive}
          title="Archive Tournament"
          confirmText="Archive"
          confirmVariant="primary"
        >
          <p>
            Are you sure you want to archive{' '}
            <strong>{tournament.settings.tournamentName}</strong>?
          </p>
          <p className="text-sm text-gray-500 mt-2">
            You can unarchive it later from the tournament list.
          </p>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          title="Delete Tournament"
          confirmText="Delete"
          confirmVariant="danger"
        >
          <p>
            Are you sure you want to delete{' '}
            <strong>{tournament.settings.tournamentName}</strong>?
          </p>
          <p className="text-sm text-red-600 mt-2 font-medium">
            This action cannot be undone!
          </p>
        </Modal>

        {/* Reset Finals Modal */}
        <Modal
          isOpen={resetModal}
          onClose={() => setResetModal(false)}
          onConfirm={handleReset}
          title="Reset Finals Bracket"
          confirmText="Reset"
          confirmVariant="danger"
        >
          <p>
            Are you sure you want to reset the finals bracket?
          </p>
          <p className="text-sm text-gray-600 mt-2">
            This will remove all finals matches and regenerate them based on the current pool play standings.
          </p>
          <p className="text-sm text-red-600 mt-2 font-medium">
            All finals match scores will be lost!
          </p>
        </Modal>
      </div>
    </div>
  );
}
