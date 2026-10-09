/**
 * Pool Display Component
 * Shows pools and handles drawing/loting
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pool, Player, TournamentSettings, TournamentStatus } from '@/types/tournament';
import { drawPools, POOL_LETTERS } from '@/lib/algorithms/drawing';
import { validateDraw, validateStart } from '@/lib/algorithms/validation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { errorMessage } from '@/lib/errorMessage';

// How long a live pick is shown before the player is placed in the pool.
// The draw viewer polls every 500 ms, so this must be well above that.
const REVEAL_MS = 2500;

type PendingAction = 'live' | 'fast' | 'reset';

interface PoolDisplayProps {
  pools: Pool[];
  players: Player[];
  settings: TournamentSettings;
  status: TournamentStatus;
  tournamentId: string;
  onStartTournament: () => void;
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const PoolDisplay: React.FC<PoolDisplayProps> = ({
  pools,
  players,
  settings,
  status,
  tournamentId,
  onStartTournament,
}) => {
  const router = useRouter();
  const { setPools, updateDrawState, setMatches, setRounds, updateStatus } = useTournamentStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{
    player: Player;
    poolId: string;
    poolName: string;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  // Stops a running live draw when the page is left
  const cancelledRef = useRef(false);
  useEffect(() => {
    cancelledRef.current = false;
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  const tournamentStarted = status !== 'setup';
  const hasPoolsBeenDrawn = pools.length > 0 && pools.some((p) => p.playerIds.length > 0);

  // Matches, rounds and finals belong to the old pools; clear them before a new draw
  const clearSchedule = async () => {
    await setMatches(tournamentId, []);
    await setRounds(tournamentId, []);
    if (status !== 'setup') await updateStatus(tournamentId, 'setup');
  };

  const handleFastLoting = async () => {
    const { pools: newPools } = drawPools(players, settings.numPools, settings.useClasses);
    try {
      await clearSchedule();
      await setPools(tournamentId, newPools);
      await updateDrawState(tournamentId, { status: 'complete' });
    } catch (error) {
      alert(`Loting mislukt: ${errorMessage(error)}`);
    }
  };

  const handleLiveLoting = async () => {
    const { pools: drawnPools, steps } = drawPools(players, settings.numPools, settings.useClasses);
    const delayMs = Math.max(0, settings.liveDrawDelaySeconds * 1000);
    const revealMs = Math.min(REVEAL_MS, delayMs);
    let currentPools = drawnPools.map((pool) => ({ ...pool, playerIds: [] as string[] }));

    cancelledRef.current = false;
    setIsDrawing(true);
    setCurrentDrawing(null);

    try {
      // Start from empty pools so the old draw disappears from all screens
      await clearSchedule();
      await setPools(tournamentId, currentPools);
      await updateDrawState(tournamentId, { status: 'idle' });

      // Each step runs to completion before the next one starts, so the saved
      // pools and the draw viewer always follow the draw order
      for (let i = 0; i < steps.length; i++) {
        if (cancelledRef.current) return;
        const { player, poolIndex } = steps[i];
        const pool = currentPools[poolIndex];
        const pick = {
          currentPickedPlayerId: player.id,
          currentPickedPoolId: pool.id,
          currentPickedPoolName: pool.name,
        };

        setCurrentDrawing({ player, poolId: pool.id, poolName: pool.name });
        setShowAnimation(true);
        await updateDrawState(tournamentId, { status: 'picking', ...pick });
        await wait(revealMs);
        if (cancelledRef.current) return;

        setShowAnimation(false);
        currentPools = currentPools.map((p, idx) =>
          idx === poolIndex ? { ...p, playerIds: [...p.playerIds, player.id] } : p
        );
        await setPools(tournamentId, currentPools);
        await updateDrawState(tournamentId, { status: 'assigned', ...pick });

        if (i < steps.length - 1) await wait(delayMs - revealMs);
      }

      if (cancelledRef.current) return;
      await updateDrawState(tournamentId, { status: 'complete' });
    } catch (error) {
      if (!cancelledRef.current) alert(`Loting mislukt: ${errorMessage(error)}`);
    } finally {
      if (!cancelledRef.current) {
        setIsDrawing(false);
        setCurrentDrawing(null);
        setShowAnimation(false);
      }
    }
  };

  const handleResetPools = async () => {
    try {
      await clearSchedule();
      await setPools(tournamentId, []);
      await updateDrawState(tournamentId, { status: 'idle' });
    } catch (error) {
      alert(`Reset mislukt: ${errorMessage(error)}`);
    }
  };

  const runAction = (action: PendingAction) => {
    if (action === 'live') handleLiveLoting();
    else if (action === 'fast') handleFastLoting();
    else handleResetPools();
  };

  // Ask for confirmation whenever an action replaces an existing draw or results
  const requestAction = (action: PendingAction) => {
    if (action !== 'reset') {
      const errors = validateDraw(players, settings);
      if (errors.length > 0) {
        alert(errors.join('\n\n'));
        return;
      }
    }
    if (action === 'reset' || hasPoolsBeenDrawn || tournamentStarted) {
      setPendingAction(action);
    } else {
      runAction(action);
    }
  };

  const confirmPendingAction = () => {
    if (pendingAction) runAction(pendingAction);
    setPendingAction(null);
  };

  const handleStartTournament = () => {
    const errors = validateStart(players, pools, settings);
    if (errors.length > 0) {
      alert(errors.join('\n\n'));
      return;
    }

    onStartTournament();
  };

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  // Show the drawn pools by name; before a draw show empty placeholders
  const displayedPools: Pool[] = hasPoolsBeenDrawn || isDrawing
    ? [...pools].sort((a, b) => a.name.localeCompare(b.name))
    : Array.from({ length: settings.numPools }, (_, i) => ({
        id: `placeholder-${i}`,
        name: `Poule ${POOL_LETTERS[i]}`,
        playerIds: [],
      }));

  const assignedIds = new Set(pools.flatMap((pool) => pool.playerIds));
  const unassignedPlayers = players.filter((player) => !assignedIds.has(player.id));
  const poolCountChanged = hasPoolsBeenDrawn && pools.length !== settings.numPools;

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button
              variant="primary"
              onClick={() => requestAction('live')}
              disabled={isDrawing || players.length === 0}
            >
              {isDrawing ? 'Drawing...' : 'Live Loting'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => requestAction('fast')}
              disabled={isDrawing || players.length === 0}
            >
              Fast Loting
            </Button>
            <Button
              variant="secondary"
              onClick={() => requestAction('fast')}
              disabled={isDrawing || !hasPoolsBeenDrawn}
            >
              Shuffle
            </Button>
            <Button
              variant="danger"
              onClick={() => requestAction('reset')}
              disabled={isDrawing || !hasPoolsBeenDrawn}
            >
              Reset Poules
            </Button>
          </div>

          {tournamentStarted ? (
            <Button
              variant="success"
              onClick={() =>
                router.push(`/tournament/${tournamentId}/${status === 'pool-play' ? 'pool-play' : 'finals'}`)
              }
              disabled={isDrawing}
              className="w-full text-lg py-3"
            >
              Toernooi is gestart — ga naar {status === 'pool-play' ? 'de poulefase' : 'de finales'} →
            </Button>
          ) : (
            <Button
              variant="success"
              onClick={handleStartTournament}
              disabled={isDrawing || !hasPoolsBeenDrawn}
              className="w-full text-lg py-3"
            >
              Start Tournament
            </Button>
          )}
        </div>
      </Card>

      {/* Warnings about a draw that no longer matches the players or settings */}
      {!isDrawing && hasPoolsBeenDrawn && (unassignedPlayers.length > 0 || poolCountChanged) && (
        <Card className="bg-yellow-50 border border-yellow-300">
          <div className="text-sm text-yellow-900 space-y-1">
            {unassignedPlayers.length > 0 && (
              <p>
                ⚠️ {unassignedPlayers.map((p) => p.name).join(', ')}{' '}
                {unassignedPlayers.length === 1 ? 'zit' : 'zitten'} nog niet in een poule. Loot opnieuw om{' '}
                {unassignedPlayers.length === 1 ? 'deze speler' : 'deze spelers'} mee te nemen.
              </p>
            )}
            {poolCountChanged && (
              <p>
                ⚠️ Er zijn {pools.length} poules geloot, maar de instellingen zeggen {settings.numPools}. Loot opnieuw.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Live Drawing Animation */}
      {isDrawing && currentDrawing && showAnimation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-bounce">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-12 py-8 rounded-2xl shadow-2xl transform scale-150">
              <p className="text-5xl font-bold text-center">
                {currentDrawing.player.name}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Drawing Indicator */}
      {isDrawing && currentDrawing && (
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 shadow-lg">
          <div className="text-center py-6">
            <p className="text-xl font-semibold text-blue-900 mb-3 animate-pulse">
              🎲 Nu aan het trekken...
            </p>
            <p className="text-3xl font-bold text-blue-700 mb-3">
              {currentDrawing.player.name}
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">→</span>
              <p className="text-2xl font-semibold text-purple-700">
                {currentDrawing.poolName}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Pools Display - ONDERAAN */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {displayedPools.map((pool) => {
          const isCurrentPool = currentDrawing?.poolId === pool.id;

          return (
            <Card
              key={pool.id}
              title={pool.name}
              className={`transition-all duration-500 ${
                isCurrentPool && isDrawing ? 'ring-4 ring-blue-500 shadow-xl scale-105' : ''
              }`}
            >
              <div className="space-y-2">
                {pool.playerIds.length > 0 ? (
                  pool.playerIds.map((playerId, pIndex) => {
                    const isNewPlayer =
                      isCurrentPool && pool.playerIds[pool.playerIds.length - 1] === playerId;

                    return (
                      <div
                        key={playerId}
                        className={`flex items-center gap-2 text-sm py-1 transition-all duration-500 ${
                          isNewPlayer ? 'bg-green-100 scale-110 font-bold' : ''
                        }`}
                      >
                        <span className="text-gray-500 w-6">{pIndex + 1}.</span>
                        <span className="text-gray-900">{getPlayerName(playerId)}</span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-400 text-sm py-4 text-center italic">
                    Nog geen spelers
                  </p>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Confirmation for actions that replace the draw */}
      <Modal
        isOpen={pendingAction !== null}
        onClose={() => setPendingAction(null)}
        onConfirm={confirmPendingAction}
        title={pendingAction === 'reset' ? 'Reset Poules' : 'Opnieuw loten'}
        confirmText={pendingAction === 'reset' ? 'Ja, reset poules' : 'Ja, opnieuw loten'}
        cancelText="Annuleer"
        confirmVariant="danger"
      >
        <p>
          {pendingAction === 'reset'
            ? 'Weet je zeker dat je alle poule-indelingen wilt verwijderen?'
            : 'De huidige poule-indeling wordt vervangen door een nieuwe loting.'}
        </p>
        {tournamentStarted && (
          <p className="text-sm text-red-600 mt-2 font-semibold">
            ⚠️ Het toernooi is al gestart: alle uitslagen en finales worden gewist!
          </p>
        )}
        <p className="text-sm text-gray-700 mt-2">Dit kan niet ongedaan worden gemaakt.</p>
      </Modal>
    </div>
  );
};
