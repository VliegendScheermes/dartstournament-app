/**
 * Player Manager Component
 * Add, edit, and remove players
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Player, PlayerClass, VALIDATION } from '@/types/tournament';
import { v4 as uuidv4 } from 'uuid';

interface PlayerManagerProps {
  players: Player[];
  useClasses: boolean;
  onSave: (players: Player[]) => void;
}

// Names are compared without surrounding spaces and case: "Jan", "jan" and " Jan" are the same
const normalizeName = (name: string) => name.trim().toLowerCase();

export const PlayerManager: React.FC<PlayerManagerProps> = ({ players, useClasses, onSave }) => {
  const [playerList, setPlayerList] = useState<Player[]>(players);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [resetModal, setResetModal] = useState(false);

  useEffect(() => {
    setPlayerList(players);
  }, [players]);

  // Names used more than once (shown once each, as typed first)
  const nameCounts = new Map<string, number>();
  playerList.forEach((p) => {
    const key = normalizeName(p.name);
    if (key) nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  });
  const isDuplicateName = (name: string) => (nameCounts.get(normalizeName(name)) ?? 0) > 1;
  const duplicateNames = Array.from(nameCounts)
    .filter(([, count]) => count > 1)
    .map(([key]) => playerList.find((p) => normalizeName(p.name) === key)?.name.trim() ?? key);

  // The draw only uses saved players, so point out edits that are not saved yet
  const savedPlayers = new Map(players.map((p) => [p.id, p]));
  const hasUnsavedChanges =
    playerList.length !== players.length ||
    playerList.some((p) => {
      const saved = savedPlayers.get(p.id);
      return !saved || saved.name !== p.name.trim() || (saved.class ?? null) !== (p.class ?? null);
    });

  const handleAddPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;

    if (playerList.length >= VALIDATION.MAX_PLAYERS) {
      alert(`Maximum ${VALIDATION.MAX_PLAYERS} players allowed`);
      return;
    }

    // Check for duplicate names
    const isDuplicate = playerList.some((p) => normalizeName(p.name) === normalizeName(name));

    if (isDuplicate) {
      alert('A player with this name already exists');
      return;
    }

    const newPlayer: Player = {
      id: uuidv4(),
      name,
      class: null,
    };

    setPlayerList([...playerList, newPlayer]);
    setNewPlayerName('');
  };

  const handleRemovePlayer = (id: string) => {
    setPlayerList(playerList.filter((p) => p.id !== id));
  };

  const handleUpdatePlayerName = (id: string, name: string) => {
    setPlayerList(
      playerList.map((p) => (p.id === id ? { ...p, name } : p))
    );
  };

  const handleUpdatePlayerClass = (id: string, playerClass: PlayerClass) => {
    setPlayerList(
      playerList.map((p) => (p.id === id ? { ...p, class: playerClass } : p))
    );
  };

  const handleSave = () => {
    if (playerList.length < VALIDATION.MIN_PLAYERS) {
      alert(`Minimum ${VALIDATION.MIN_PLAYERS} players required`);
      return;
    }

    // Validate no empty names
    const hasEmptyNames = playerList.some((p) => !p.name.trim());
    if (hasEmptyNames) {
      alert('All players must have names');
      return;
    }

    // Validate unique names (also after renaming)
    if (duplicateNames.length > 0) {
      alert(`Player names must be unique: ${duplicateNames.join(', ')}`);
      return;
    }

    onSave(playerList.map((p) => ({ ...p, name: p.name.trim() })));
  };

  const handleReset = () => {
    setPlayerList([]);
    onSave([]);
    setResetModal(false);
  };

  return (
    <Card title="Add Players">
      <div className="space-y-4">
        {/* Player List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {playerList.map((player, index) => (
            <div key={player.id} className="flex items-center gap-2">
              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
              <input
                type="text"
                value={player.name}
                onChange={(e) => handleUpdatePlayerName(player.id, e.target.value)}
                className={`flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  isDuplicateName(player.name) ? 'border-red-400 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Player name"
                title={isDuplicateName(player.name) ? 'Another player has this name' : undefined}
              />
              {useClasses && (
                <select
                  value={player.class || ''}
                  onChange={(e) =>
                    handleUpdatePlayerClass(
                      player.id,
                      (e.target.value as PlayerClass) || null
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">No Class</option>
                  <option value="A">Class A</option>
                  <option value="B">Class B</option>
                  <option value="C">Class C</option>
                </select>
              )}
              <button
                onClick={() => handleRemovePlayer(player.id)}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Remove player"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>

        {/* Add New Player */}
        {playerList.length < VALIDATION.MAX_PLAYERS && (
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="New player name"
            />
            <button
              onClick={handleAddPlayer}
              className="px-3 py-2 text-green-600 hover:bg-green-50 rounded-lg font-bold text-xl"
              title="Add player"
            >
              ➕
            </button>
          </div>
        )}

        {duplicateNames.length > 0 && (
          <p className="text-sm text-red-600">
            Duplicate names: {duplicateNames.join(', ')} — every player needs a unique name.
          </p>
        )}

        {/* Info */}
        <div className="text-sm text-gray-500">
          Players: {playerList.length} / {VALIDATION.MAX_PLAYERS}
          {playerList.length < VALIDATION.MIN_PLAYERS && (
            <span className="text-red-600 ml-2">
              (Minimum {VALIDATION.MIN_PLAYERS} required)
            </span>
          )}
        </div>

        {hasUnsavedChanges && (
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Unsaved changes — click Opslaan. The draw only uses saved players.
          </p>
        )}

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          <Button
            variant="primary"
            onClick={handleSave}
            className="flex-1"
            disabled={playerList.length < VALIDATION.MIN_PLAYERS}
          >
            Opslaan
          </Button>
          <Button
            variant="danger"
            onClick={() => setResetModal(true)}
            className="flex-1"
            disabled={playerList.length === 0}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Reset Modal */}
      <Modal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleReset}
        title="Reset Spelers"
        confirmText="Ja, Verwijder Alles"
        cancelText="Annuleer"
        confirmVariant="danger"
      >
        <p>Weet je zeker dat je alle spelers wilt verwijderen?</p>
        <p className="text-sm text-red-600 mt-2 font-semibold">
          ⚠️ Dit verwijdert {playerList.length} speler(s) permanent!
        </p>
      </Modal>
    </Card>
  );
};
