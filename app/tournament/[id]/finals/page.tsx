/**
 * Finals Page
 * Cross-finals and losers brackets
 */

'use client';

import React, { use, useEffect, useRef } from 'react';
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
  const [resetTrigger, setResetTrigger] = useState(0);

  // Track last generated assignments to prevent infinite loops
  const lastGeneratedRef = useRef<string>('');

  const {
    loadTournament,
    setMatches,
    updateMatch,
    confirmMatch,
    unconfirmMatch,
    saveRound,
    updateStatus,
    updateDrawState,
    archiveTournament,
    deleteTournament,
    isLoading,
    error,
  } = useTournamentStore();

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const getStandings = useTournamentStore(state => state.getStandings);

  // Extract assignment hash to prevent infinite loops
  const assignmentsHash = tournament?.drawState?.finalsAssignments
    ? JSON.stringify(tournament.drawState.finalsAssignments)
    : '{}';

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
      // Check if we've already generated with these exact assignments
      if (lastGeneratedRef.current === assignmentsHash) {
        return; // Already generated with these assignments, skip
      }

      // Generate finals matches if not already done
      const finalsMatches = tournament.matches.filter(
        (m) => m.stage === 'CROSS' || m.stage === 'LOSERS'
      );

      // Only generate if no finals exist yet
      if (finalsMatches.length === 0) {
        try {
          // Get standings for all pools
          const allStandings: { [poolId: string]: any[] } = {};
          tournament.pools.forEach((pool) => {
            allStandings[pool.id] = getStandings(id, pool.id);
          });

          // Get manual finals assignments from drawState
          const manualAssignments = tournament.drawState?.finalsAssignments || {};

          // Select finalists (respects manual assignments if present)
          const { crossFinalists, losersFinalists } = selectFinalists(
            tournament.pools,
            allStandings,
            tournament.settings.advanceToCrossFinals,
            tournament.settings.advanceToLosersFinal,
            manualAssignments
          );

          // Generate brackets
          const crossMatches = generateCrossFinalsMatches(crossFinalists);

          // Only generate losers bracket if the setting is enabled (> 0)
          const losersMatches = tournament.settings.advanceToLosersFinal > 0
            ? generateLosersBracketMatches(losersFinalists)
            : [];

          // Save to store
          const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
          const allMatches = [
            ...poolMatches,
            ...crossMatches,
            ...losersMatches,
          ];
          await setMatches(id, allMatches);

          // Update ref to prevent regenerating with same assignments
          lastGeneratedRef.current = assignmentsHash;

          console.log('Finals generated with assignments:', manualAssignments);
        } catch (error) {
          console.error('Failed to generate finals matches:', error);
        }
      }
    };

    generateFinalsMatches();
  }, [id, assignmentsHash, getStandings, setMatches, isHydrated, resetTrigger]);

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
    } catch (error) {
      console.error('Failed to confirm match:', error);
      return;
    }
  };

  const handleSaveRound = async (roundIndex: number, stage: 'CROSS' | 'LOSERS') => {
    try {
      // Filter matches by BOTH roundIndex AND stage to avoid mixing Cross and Losers brackets
      const roundMatches = tournament.matches.filter(
        (m) => m.roundIndex === roundIndex && m.stage === stage
      );

      if (roundMatches.length === 0) {
        console.error('No matches found for this round');
        return;
      }

      // Validate all matches are confirmed
      const allConfirmed = roundMatches.every((m) => m.confirmed);
      if (!allConfirmed) {
        alert('Please confirm all matches in this round before saving');
        return;
      }

      // Save the round to mark it as complete in database
      await saveRound(id, roundIndex);

      console.log(`Round ${roundIndex} (${stage}) saved with ${roundMatches.length} matches`);

      if (stage === 'CROSS') {
        // Check if this was the Final match (only 1 match in the round)
        if (roundMatches.length === 1) {
          // Tournament is complete - we just saved the Final
          console.log('🏆 Final round saved - Tournament complete!');
          await updateStatus(id, 'completed');
          return;
        }

        // Generate next round with winners
        console.log(`Generating next round (${roundIndex + 1}) from ${roundMatches.length} matches`);

        const nextRoundMatches = generateNextCrossRound(roundMatches, roundIndex + 1);

        if (nextRoundMatches.length > 0) {
          console.log(`✓ Generated ${nextRoundMatches.length} matches for round ${roundIndex + 1}`);

          // Check if next round already exists to prevent duplicates
          const existingNextRound = tournament.matches.filter(
            (m) => m.stage === 'CROSS' && m.roundIndex === roundIndex + 1
          );

          if (existingNextRound.length === 0) {
            // Add new round matches
            const allMatches = [...tournament.matches, ...nextRoundMatches];
            await setMatches(id, allMatches);
            console.log(`✓ Added next round. Total matches: ${allMatches.length}`);
          } else {
            console.log('⚠ Next round already exists, skipping generation');
          }
        } else {
          console.warn('⚠ No next round matches generated');
        }
      } else if (stage === 'LOSERS') {
        // Losers bracket logic
        if (roundMatches.length === 1) {
          console.log('Losers bracket Final complete');
          return;
        }

        // Generate next round with losers
        const nextRoundMatches = generateNextLosersRound(roundMatches, roundIndex + 1);

        if (nextRoundMatches.length > 0) {
          const existingNextRound = tournament.matches.filter(
            (m) => m.stage === 'LOSERS' && m.roundIndex === roundIndex + 1
          );

          if (existingNextRound.length === 0) {
            await setMatches(id, [...tournament.matches, ...nextRoundMatches]);
            console.log(`✓ Generated losers round ${roundIndex + 1}`);
          }
        }
      }
    } catch (error) {
      console.error('Failed to save round:', error);
      alert('Failed to save round. Please try again.');
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

  const handleReset = async () => {
    // Remove all CROSS and LOSERS matches from DB
    const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
    await setMatches(id, poolMatches);

    // Reset tournament status to pool-play if it was completed
    if (tournament.status === 'completed') {
      await updateStatus(id, 'pool-play');
    }

    // Clear the ref and bump the trigger so the generation effect re-runs
    lastGeneratedRef.current = '';
    setResetTrigger(c => c + 1);

    setResetModal(false);
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
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

            <div className="flex items-center gap-2">
              {/* Live View Icon */}
              <a
                href={`/tournament/${id}/live-viewer`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Live View"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </a>

              {/* Settings Icon */}
              <button
                onClick={() => router.push(`/tournament/${id}/setup`)}
                className="p-2 rounded-lg hover:bg-gray-200 transition-colors"
                aria-label="Settings"
              >
                <svg
                  className="w-6 h-6 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {tournament.settings.tournamentName}
          </h1>
          <p className="text-gray-500 mt-1">Finals Phase</p>
        </div>

        {/* Info message for manual assignments */}
        {tournament.drawState?.finalsAssignments && Object.keys(tournament.drawState.finalsAssignments).length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 text-blue-600 text-xl">ℹ️</div>
              <div>
                <h3 className="font-semibold text-blue-900 mb-1">
                  Manual Finals Assignments Active
                </h3>
                <p className="text-sm text-blue-800">
                  You have manually assigned players to Cross Finals or Losers Bracket from the Pool Play page.
                  The brackets have been generated according to your manual selections.
                </p>
                <p className="text-sm text-blue-800 mt-2">
                  If you change the assignments, use the <strong>Reset Finals</strong> button below to regenerate the brackets.
                </p>
              </div>
            </div>
          </div>
        )}

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
                tournamentId={id}
                onMatchUpdate={handleMatchUpdate}
                onMatchConfirm={handleMatchConfirm}
                onMatchEdit={handleMatchEdit}
                onSaveRound={handleSaveRound}
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
              tournamentId={id}
              onMatchUpdate={handleMatchUpdate}
              onMatchConfirm={handleMatchConfirm}
              onMatchEdit={handleMatchEdit}
              onSaveRound={handleSaveRound}
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
