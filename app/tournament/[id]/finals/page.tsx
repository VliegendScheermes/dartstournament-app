/**
 * Finals Page
 * Cross-finals and losers brackets
 */

'use client';

import React, { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { errorMessage } from '@/lib/errorMessage';
import { BracketView } from '@/components/tournament/BracketView';
import { WinnerDisplay } from '@/components/tournament/WinnerDisplay';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  BracketState,
  buildBracket,
  FinalsStage,
  generateFinals,
  getBracketSlots,
  syncBracketMatches,
} from '@/lib/algorithms/finals';
import { Match } from '@/types/tournament';

// Matches of a bracket in bracket order, plus round names and byes for display
function bracketDisplay(state: BracketState, stageMatches: Match[]) {
  const ordered: Match[] = [];
  const roundNames: { [roundIndex: number]: string } = {};
  const byes: { roundIndex: number; playerId: string }[] = [];

  for (const round of state.rounds) {
    roundNames[round.roundIndex] = round.name;
    for (const pair of round.pairs) {
      if (pair.match) ordered.push(pair.match);
      if (pair.player1Id === null && pair.player2Id) byes.push({ roundIndex: round.roundIndex, playerId: pair.player2Id });
      if (pair.player2Id === null && pair.player1Id) byes.push({ roundIndex: round.roundIndex, playerId: pair.player1Id });
    }
  }
  // Matches that no longer fit the bracket are kept visible until the round is saved again
  stageMatches.forEach((match) => {
    if (!ordered.includes(match)) ordered.push(match);
  });

  return {
    matches: ordered,
    roundNames,
    byes,
    finalRoundIndex: state.rounds.length > 0 ? state.rounds[state.rounds.length - 1].roundIndex : undefined,
  };
}

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
    updateDrawState,
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

  // Later rounds are derived from the stored round-1 slots and the results
  const matches = tournament?.matches ?? [];
  const crossSlots = getBracketSlots(tournament?.drawState?.finalsBracket, matches, 'CROSS');
  const losersSlots = getBracketSlots(tournament?.drawState?.finalsBracket, matches, 'LOSERS');
  const crossBracket = buildBracket(crossSlots, matches, 'CROSS');
  const losersBracket = buildBracket(losersSlots, matches, 'LOSERS');

  // The tournament is completed as soon as the final is decided
  const hasChampion = !!crossBracket.resultId;
  const status = tournament?.status;
  useEffect(() => {
    if (hasChampion && status === 'finals') {
      updateStatus(id, 'completed').catch((error) => console.error('Failed to complete tournament:', error));
    }
  }, [hasChampion, status, id, updateStatus]);

  // Only block the page on the first load; reloads after a failed save must not
  // unmount the brackets (typed scores would be lost)
  if (!isHydrated || (isLoading && !tournament)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading tournament...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
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

  const handleSaveRound = async (roundIndex: number, stage: FinalsStage) => {
    try {
      // Filter matches by BOTH roundIndex AND stage to avoid mixing Cross and Losers brackets
      const roundMatches = tournament.matches.filter(
        (m) => m.roundIndex === roundIndex && m.stage === stage
      );

      // Validate all matches are confirmed
      if (roundMatches.length === 0 || !roundMatches.every((m) => m.confirmed)) {
        alert('Please confirm all matches in this round before saving');
        return;
      }

      // Create the next round once all its players are known (byes advance
      // automatically) and drop matches that no longer fit after an edited result
      const slots = stage === 'CROSS' ? crossSlots : losersSlots;
      const stageMatches = tournament.matches.filter((m) => m.stage === stage);
      const synced = syncBracketMatches(slots, tournament.matches, stage);
      const changed =
        synced.length !== stageMatches.length || synced.some((m) => !stageMatches.includes(m));

      if (changed) {
        await setMatches(id, [...tournament.matches.filter((m) => m.stage !== stage), ...synced]);
      }
    } catch (error) {
      console.error('Failed to save round:', error);
      alert('Failed to save round. Please try again.');
    }
  };

  // (Re)generate both brackets from the current pool standings
  const regenerateFinals = async () => {
    const standings = Object.fromEntries(
      tournament.pools.map((pool) => [pool.id, getStandings(id, pool.id)])
    );
    const { matches: finalsMatches, bracket } = generateFinals(
      tournament.pools,
      standings,
      tournament.settings.advanceToCrossFinals,
      tournament.settings.advanceToLosersFinal,
      tournament.drawState?.finalsAssignments
    );

    const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
    await setMatches(id, [...poolMatches, ...finalsMatches]);
    await updateDrawState(id, { ...(tournament.drawState ?? { status: 'complete' }), finalsBracket: bracket });
    if (tournament.status !== 'finals') {
      await updateStatus(id, 'finals');
    }
  };

  const handleMatchEdit = async (matchId: string) => {
    try {
      await unconfirmMatch(id, matchId);
      // Reopening a cross finals result means the champion isn't decided anymore
      const match = tournament.matches.find((m) => m.id === matchId);
      if (match?.stage === 'CROSS' && tournament.status === 'completed') {
        await updateStatus(id, 'finals');
      }
    } catch (error) {
      console.error('Failed to edit match:', error);
    }
  };

  // Wait for the save so the tournament list shows the new state
  const handleArchive = async () => {
    setArchiveModal(false);
    try {
      await archiveTournament(id);
      router.push('/');
    } catch (error) {
      alert(`Archiveren mislukt: ${errorMessage(error)}`);
    }
  };

  const handleDelete = async () => {
    setDeleteModal(false);
    try {
      await deleteTournament(id);
      router.push('/');
    } catch (error) {
      alert(`Verwijderen mislukt: ${errorMessage(error)}`);
    }
  };

  const handleReset = async () => {
    setResetModal(false);
    try {
      await regenerateFinals();
    } catch (error) {
      console.error('Failed to reset finals:', error);
      alert(`Reset finals mislukt: ${errorMessage(error)}`);
    }
  };

  // Champion and loser are only known once the last round of their bracket is decided
  const championId = crossBracket.resultId;
  const loserId = losersBracket.resultId;

  const crossDisplay = bracketDisplay(crossBracket, crossMatches);
  const losersDisplay = bracketDisplay(losersBracket, losersMatches);
  const showLosersBracket = tournament.settings.advanceToLosersFinal > 0 || losersSlots.length > 0;
  const hasFinals = crossMatches.length > 0 || losersMatches.length > 0;

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

        {/* No finals yet (e.g. opened before they were generated) */}
        {!hasFinals && (
          <div className="mb-6 p-6 bg-white border border-gray-200 rounded-lg text-center">
            <p className="text-gray-700 mb-4">Er zijn nog geen finales gegenereerd.</p>
            <Button variant="success" onClick={handleReset}>
              Finales genereren
            </Button>
          </div>
        )}

        {/* Brackets Container - Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Losers Bracket - Left Column (Only show if enabled) */}
          {showLosersBracket && (
            <div className="flex-1">
              <BracketView
                title="Losers Bracket (Loser Advances)"
                matches={losersDisplay.matches}
                roundNames={losersDisplay.roundNames}
                byes={losersDisplay.byes}
                finalRoundIndex={losersDisplay.finalRoundIndex}
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
              matches={crossDisplay.matches}
              roundNames={crossDisplay.roundNames}
              byes={crossDisplay.byes}
              finalRoundIndex={crossDisplay.finalRoundIndex}
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
