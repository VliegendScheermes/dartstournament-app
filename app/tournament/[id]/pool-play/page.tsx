/**
 * Pool Play Page
 * Displays standings and match schedules for all pools
 */

'use client';

import React, { use, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { StandingsTable } from '@/components/tournament/StandingsTable';
import { MatchSchedule } from '@/components/tournament/MatchSchedule';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { generateAllPoolSchedules } from '@/lib/algorithms/roundRobin';

interface PoolPlayPageProps {
  params: Promise<{ id: string }>;
}

export default function PoolPlayPage({ params }: PoolPlayPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);

  const {
    loadTournament,
    updateMatch,
    confirmMatch,
    unconfirmMatch,
    saveRound,
    updateStatus,
    updatePool,
    setMatches,
    setRounds,
    setFinalsAssignment,
    getFinalsAssignment,
    isLoading,
    error,
  } = useTournamentStore();

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));
  const getStandings = useTournamentStore(state => state.getStandings);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load tournament from API
  React.useEffect(() => {
    if (isHydrated) {
      loadTournament(id);
    }
  }, [id, isHydrated, loadTournament]);

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

  const handleMatchUpdate = async (matchId: string, legsP1: number, legsP2: number) => {
    try {
      await updateMatch(id, matchId, { legsP1, legsP2 });
    } catch (error) {
      console.error('Failed to update match:', error);
    }
  };

  const handleMatchConfirm = async (matchId: string) => {
    try {
      await confirmMatch(id, matchId);
    } catch (error) {
      console.error('Failed to confirm match:', error);
    }
  };

  const handleMatchEdit = async (matchId: string) => {
    try {
      await unconfirmMatch(id, matchId);
    } catch (error) {
      console.error('Failed to unconfirm match:', error);
    }
  };

  const handleSaveRound = async (roundIndex: number) => {
    try {
      const success = await saveRound(id, roundIndex);
      if (!success) {
        alert('Cannot save round: Not all matches have scores entered');
      }
    } catch (error) {
      console.error('Failed to save round:', error);
    }
  };

  const handleBoardNumberChange = async (poolId: string, boardNumber: string | null) => {
    try {
      await updatePool(id, poolId, { boardNumber });
    } catch (error) {
      console.error('Failed to update board number:', error);
    }
  };

  const handleResetPoolPhase = async () => {
    if (!confirm('Reset pool phase? This will clear all match scores and results. This cannot be undone.')) return;

    try {
      const existingPoolMatches = tournament.matches.filter((m) => m.stage === 'POOL');

      if (existingPoolMatches.length === 0) {
        // No pool matches exist — regenerate them from the pools
        const { matches: generated, rounds: generatedRounds } = generateAllPoolSchedules(
          tournament.pools,
          tournament.players
        );
        const nonPoolMatches = tournament.matches.filter((m) => m.stage !== 'POOL');
        await setMatches(id, [...nonPoolMatches, ...generated]);
        await setRounds(id, generatedRounds);
      } else {
        // Pool matches exist — just reset their scores
        const resetMatches = tournament.matches.map((m) =>
          m.stage === 'POOL' ? { ...m, legsP1: null, legsP2: null, confirmed: false } : m
        );
        await setMatches(id, resetMatches);
        const resetRounds = tournament.rounds.map((r) => ({ ...r, savedAll: false }));
        await setRounds(id, resetRounds);
      }

      // Revert status to pool-play if it advanced further
      if (tournament.status === 'finals' || tournament.status === 'completed') {
        await updateStatus(id, 'pool-play');
      }
    } catch (error) {
      console.error('Failed to reset pool phase:', error);
    }
  };

  const handleStartFinals = async () => {
    // Check if all pool matches are confirmed
    const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
    const allConfirmed = poolMatches.every((m) => m.confirmed);

    if (!allConfirmed) {
      alert('Please complete all pool matches before starting finals');
      return;
    }

    try {
      await updateStatus(id, 'finals');
      router.push(`/tournament/${id}/finals`);
    } catch (error) {
      console.error('Failed to start finals:', error);
    }
  };

  const handleFinalsAssignmentChange = async (playerId: string, assignment: 'CROSS' | 'LOSERS' | 'ELIMINATED' | null) => {
    try {
      await setFinalsAssignment(id, playerId, assignment);
    } catch (error) {
      console.error('Failed to set finals assignment:', error);
    }
  };

  // Guard: no pools drawn yet
  if (tournament.pools.length === 0 || tournament.pools.every((p) => p.playerIds.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Pools Drawn Yet</h1>
          <p className="text-gray-600 mb-6">Please complete the draw before starting pool play.</p>
          <button
            onClick={() => router.push(`/tournament/${id}/setup`)}
            className="text-blue-600 hover:underline"
          >
            ← Back to Setup
          </button>
        </div>
      </div>
    );
  }

  // Check if all pool matches are confirmed
  const poolMatches = tournament.matches.filter((m) => m.stage === 'POOL');
  const allPoolMatchesConfirmed = poolMatches.length > 0 && poolMatches.every((m) => m.confirmed);

  // Get all rounds (unique round indices)
  const allRoundIndices = Array.from(
    new Set(tournament.rounds.map((r) => r.index))
  ).sort((a, b) => a - b);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
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
  {(tournament.status === 'finals' || tournament.status === 'completed') && (
                <button
                  onClick={() => router.push(`/tournament/${id}/finals`)}
                  className="text-green-600 hover:underline flex items-center gap-2 font-semibold"
                >
                  Go to Finals →
                </button>
              )}
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
          <p className="text-gray-500 mt-1">Pool Play Phase</p>
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: All Pool Standings */}
          <div className="lg:col-span-5 h-full">
            <Card className="h-full flex flex-col">
              <div className="space-y-6 flex-1 overflow-y-auto">
                {tournament.pools.map((pool) => {
                  const standings = getStandings(id, pool.id);
                  return (
                    <StandingsTable
                      key={pool.id}
                      poolId={pool.id}
                      poolName={pool.name}
                      standings={standings}
                      topPlayers={tournament.settings.advanceToCrossFinals}
                      bottomPlayers={tournament.settings.advanceToLosersFinal}
                      boardNumber={pool.boardNumber}
                      onBoardNumberChange={handleBoardNumberChange}
                      tournamentId={id}
                      onFinalsAssignmentChange={handleFinalsAssignmentChange}
                      getFinalsAssignment={(playerId) => getFinalsAssignment(id, playerId)}
                    />
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Right: Rounds with matches from all pools */}
          <div className="lg:col-span-7">
            <MatchSchedule
              poolId="ALL"
              poolName="All Pools"
              matches={tournament.matches}
              rounds={tournament.rounds}
              players={tournament.players}
              tournamentId={id}
              onMatchUpdate={handleMatchUpdate}
              onMatchConfirm={handleMatchConfirm}
              onMatchEdit={handleMatchEdit}
              onSaveRound={handleSaveRound}
            />
          </div>
        </div>

        {/* Start Finals / Go to Finals Button */}
        {allPoolMatchesConfirmed && (
          <div className="mt-8 flex justify-center">
            {tournament.status === 'finals' || tournament.status === 'completed' ? (
              <Button
                variant="primary"
                onClick={() => router.push(`/tournament/${id}/finals`)}
                className="text-lg px-8 py-3"
              >
                Go to Finals →
              </Button>
            ) : (
              <Button
                variant="success"
                onClick={handleStartFinals}
                className="text-lg px-8 py-3"
              >
                Start Finals
              </Button>
            )}
          </div>
        )}

        {!allPoolMatchesConfirmed && poolMatches.length > 0 && (
          <div className="mt-8 text-center text-gray-500">
            Complete all pool matches to start finals
          </div>
        )}

        {/* Reset Pool Phase */}
        <div className="mt-12 flex justify-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetPoolPhase}
            className="text-red-600 border-red-300 hover:bg-red-50"
          >
            ↩ Reset Pool Phase
          </Button>
        </div>
      </div>
    </div>
  );
}
