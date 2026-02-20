/**
 * Pool Display Component
 * Shows pools and handles drawing/loting
 */

'use client';

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Pool, Player, TournamentSettings } from '@/types/tournament';
import { distributePlayers, liveDistributePlayers } from '@/lib/algorithms/drawing';
import { useTournamentStore } from '@/lib/store/tournamentStore';

interface PoolDisplayProps {
  pools: Pool[];
  players: Player[];
  settings: TournamentSettings;
  tournamentId: string;
  onPoolsUpdate: (pools: Pool[]) => void;
  onStartTournament: () => void;
}

export const PoolDisplay: React.FC<PoolDisplayProps> = ({
  pools,
  players,
  settings,
  tournamentId,
  onPoolsUpdate,
  onStartTournament,
}) => {
  const router = useRouter();
  const { updateDrawState, setMatches, setRounds, updateStatus } = useTournamentStore();
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentDrawing, setCurrentDrawing] = useState<{
    player: Player;
    poolName: string;
    poolIndex: number;
  } | null>(null);
  const [shuffleModal, setShuffleModal] = useState(false);
  const [resetPoolsModal, setResetPoolsModal] = useState(false);
  const [showAnimation, setShowAnimation] = useState(false);

  const handleFastLoting = () => {
    if (players.length === 0) {
      alert('Please add players first');
      return;
    }

    const newPools = distributePlayers(players, settings.numPools, settings.useClasses);
    onPoolsUpdate(newPools);
    // Clear any previously generated matches/rounds — pool assignments changed
    setMatches(tournamentId, []);
    setRounds(tournamentId, []);
    updateStatus(tournamentId, 'setup');
    updateDrawState(tournamentId, { status: 'complete' });
  };

  const handleLiveLoting = async () => {
    if (players.length === 0) {
      alert('Please add players first');
      return;
    }

    setIsDrawing(true);
    setCurrentDrawing(null);
    // Clear any previously generated matches/rounds — pool assignments about to change
    setMatches(tournamentId, []);
    setRounds(tournamentId, []);
    updateStatus(tournamentId, 'setup');
    updateDrawState(tournamentId, { status: 'idle' });

    // Initialize pools structure and track it during drawing
    const initialPools = Array.from({ length: settings.numPools }, (_, i) => ({
      id: 'ABCDEFGH'[i],
      name: `Poule ${'ABCDEFGH'[i]}`,
      playerIds: [] as string[],
      boardNumber: null,
      boardNumbersText: null,
    }));

    let currentPools = initialPools;

    try {
      const newPools = await liveDistributePlayers(
        players,
        settings.numPools,
        settings.useClasses,
        settings.liveDrawDelaySeconds,
        (player, poolIndex, poolName) => {
          setShowAnimation(true);
          setCurrentDrawing({ player, poolName, poolIndex });

          // Signal "picking" to draw viewer
          updateDrawState(tournamentId, {
            status: 'picking',
            currentPickedPlayerId: player.id,
            currentPickedPoolId: initialPools[poolIndex].id,
          });

          // Hold "picking" for 2500ms so draw viewer (polling at 500ms) reliably catches it
          setTimeout(() => {
            // Add player to the accumulating pools
            const updatedPools = currentPools.map((pool, idx) => {
              if (idx === poolIndex) {
                return {
                  ...pool,
                  playerIds: [...pool.playerIds, player.id],
                };
              }
              return pool;
            });

            currentPools = updatedPools; // Update the reference
            onPoolsUpdate(updatedPools);

            // Signal "assigned" to draw viewer
            updateDrawState(tournamentId, {
              status: 'assigned',
              currentPickedPlayerId: player.id,
              currentPickedPoolId: initialPools[poolIndex].id,
            });
          }, 2500);

          // Hide big animation after a moment
          setTimeout(() => {
            setShowAnimation(false);
          }, 2000);
        }
      );

      // Final update (already done step by step)
      setCurrentDrawing(null);
      updateDrawState(tournamentId, { status: 'complete' });
    } finally {
      setIsDrawing(false);
    }
  };

  const handleShuffle = () => {
    handleFastLoting();
    setShuffleModal(false);
  };

  const handleResetPools = () => {
    onPoolsUpdate([]);
    setMatches(tournamentId, []);
    setRounds(tournamentId, []);
    updateStatus(tournamentId, 'setup');
    updateDrawState(tournamentId, { status: 'idle' });
    setResetPoolsModal(false);
  };

  const handleStartTournament = () => {
    if (pools.length === 0 || pools.some((p) => p.playerIds.length === 0)) {
      alert('Please perform loting first');
      return;
    }

    if (players.length < 4) {
      alert('Minimum 4 players required to start tournament');
      return;
    }

    onStartTournament();
  };

  const getPlayerName = (playerId: string): string => {
    return players.find((p) => p.id === playerId)?.name || 'Unknown';
  };

  const hasPoolsBeenDrawn = pools.length > 0 && pools.some((p) => p.playerIds.length > 0);

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <Card>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Button
              variant="primary"
              onClick={handleLiveLoting}
              disabled={isDrawing || players.length === 0}
            >
              {isDrawing ? 'Drawing...' : 'Live Loting'}
            </Button>
            <Button
              variant="secondary"
              onClick={handleFastLoting}
              disabled={isDrawing || players.length === 0}
            >
              Fast Loting
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShuffleModal(true)}
              disabled={isDrawing || !hasPoolsBeenDrawn}
            >
              Shuffle
            </Button>
            <Button
              variant="danger"
              onClick={() => setResetPoolsModal(true)}
              disabled={isDrawing || !hasPoolsBeenDrawn}
            >
              Reset Poules
            </Button>
          </div>

          <Button
            variant="success"
            onClick={handleStartTournament}
            disabled={isDrawing || !hasPoolsBeenDrawn}
            className="w-full text-lg py-3"
          >
            Start Tournament
          </Button>
        </div>
      </Card>

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
        {Array.from({ length: settings.numPools }).map((_, index) => {
          const poolLetter = 'ABCDEFGH'[index];
          const pool = pools.find((p) => p.id === poolLetter);
          const isCurrentPool = currentDrawing && currentDrawing.poolIndex === index;

          return (
            <Card
              key={poolLetter}
              title={`Poule ${poolLetter}`}
              className={`transition-all duration-500 ${
                isCurrentPool && isDrawing ? 'ring-4 ring-blue-500 shadow-xl scale-105' : ''
              }`}
            >
              <div className="space-y-2">
                {pool && pool.playerIds.length > 0 ? (
                  pool.playerIds.map((playerId, pIndex) => {
                    const isNewPlayer =
                      currentDrawing &&
                      pool.playerIds[pool.playerIds.length - 1] === playerId &&
                      isCurrentPool;

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

      {/* Shuffle Confirmation Modal */}
      <Modal
        isOpen={shuffleModal}
        onClose={() => setShuffleModal(false)}
        onConfirm={handleShuffle}
        title="Shuffle Pools"
        confirmText="Shuffle"
        confirmVariant="primary"
      >
        <p>Are you sure you want to redraw all pools?</p>
        <p className="text-sm text-gray-500 mt-2">
          This will randomly redistribute all players.
        </p>
      </Modal>

      {/* Reset Pools Modal */}
      <Modal
        isOpen={resetPoolsModal}
        onClose={() => setResetPoolsModal(false)}
        onConfirm={handleResetPools}
        title="Reset Poules"
        confirmText="Ja, Reset Poules"
        cancelText="Annuleer"
        confirmVariant="danger"
      >
        <p>Weet je zeker dat je alle poule-indelingen wilt verwijderen?</p>
        <p className="text-sm text-gray-700 mt-2">
          Alle spelers worden uit de poules gehaald. Je kunt daarna opnieuw loten.
        </p>
        <p className="text-sm text-red-600 mt-2 font-semibold">
          ⚠️ Deze actie kan niet ongedaan worden gemaakt!
        </p>
      </Modal>
    </div>
  );
};
