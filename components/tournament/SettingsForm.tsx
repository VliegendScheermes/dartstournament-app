/**
 * Settings Form Component
 * Tournament configuration form
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TournamentSettings, VALIDATION, DEFAULT_TOURNAMENT_SETTINGS } from '@/types/tournament';

interface SettingsFormProps {
  settings: TournamentSettings;
  onSave: (settings: TournamentSettings) => void;
}

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<TournamentSettings>(settings);
  const [resetModal, setResetModal] = useState(false);

  useEffect(() => {
    setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof TournamentSettings, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    onSave(formData);
  };

  const handleReset = () => {
    const resetSettings = {
      ...DEFAULT_TOURNAMENT_SETTINGS,
      tournamentName: formData.tournamentName, // Keep tournament name
    };
    setFormData(resetSettings);
    onSave(resetSettings);
    setResetModal(false);
  };

  return (
    <Card title="Tournament Settings">
      <div className="space-y-4">
        {/* Tournament Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tournament Name
          </label>
          <input
            type="text"
            value={formData.tournamentName}
            onChange={(e) => handleChange('tournamentName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter tournament name"
          />
        </div>

        {/* Number of Pools */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Pools
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                handleChange(
                  'numPools',
                  Math.max(VALIDATION.MIN_POOLS, formData.numPools - 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={formData.numPools}
              onChange={(e) => handleChange('numPools', parseInt(e.target.value) || VALIDATION.MIN_POOLS)}
              min={VALIDATION.MIN_POOLS}
              max={VALIDATION.MAX_POOLS}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() =>
                handleChange(
                  'numPools',
                  Math.min(VALIDATION.MAX_POOLS, formData.numPools + 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Number of Boards */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Number of Boards
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                handleChange(
                  'numBoards',
                  Math.max(VALIDATION.MIN_BOARDS, formData.numBoards - 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={formData.numBoards}
              onChange={(e) => handleChange('numBoards', parseInt(e.target.value) || VALIDATION.MIN_BOARDS)}
              min={VALIDATION.MIN_BOARDS}
              max={VALIDATION.MAX_BOARDS}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() =>
                handleChange(
                  'numBoards',
                  Math.min(VALIDATION.MAX_BOARDS, formData.numBoards + 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Advance to Cross Finals */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance to Cross Finals (per pool)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                handleChange(
                  'advanceToCrossFinals',
                  Math.max(1, formData.advanceToCrossFinals - 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={formData.advanceToCrossFinals}
              onChange={(e) => handleChange('advanceToCrossFinals', parseInt(e.target.value) || 1)}
              min={1}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() =>
                handleChange('advanceToCrossFinals', formData.advanceToCrossFinals + 1)
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Advance to Losers Final */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Advance to Losers Final (per pool)
          </label>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                handleChange(
                  'advanceToLosersFinal',
                  Math.max(0, formData.advanceToLosersFinal - 1)
                )
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              -
            </button>
            <input
              type="number"
              value={formData.advanceToLosersFinal}
              onChange={(e) => handleChange('advanceToLosersFinal', parseInt(e.target.value) || 0)}
              min={0}
              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={() =>
                handleChange('advanceToLosersFinal', formData.advanceToLosersFinal + 1)
              }
              className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
            >
              +
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {formData.advanceToLosersFinal === 0
              ? 'Losers bracket disabled'
              : `${formData.advanceToLosersFinal} player(s) from each pool`}
          </p>
        </div>

        {/* Use Classes */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="useClasses"
            checked={formData.useClasses}
            onChange={(e) => handleChange('useClasses', e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="useClasses" className="text-sm font-medium text-gray-700">
            Use Player Classes (A/B/C)
          </label>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          <Button variant="primary" onClick={handleSave} className="flex-1">
            Opslaan
          </Button>
          <Button variant="danger" onClick={() => setResetModal(true)} className="flex-1">
            Reset
          </Button>
        </div>
      </div>

      {/* Reset Modal */}
      <Modal
        isOpen={resetModal}
        onClose={() => setResetModal(false)}
        onConfirm={handleReset}
        title="Reset Instellingen"
        confirmText="Ja, Reset"
        cancelText="Annuleer"
        confirmVariant="danger"
      >
        <p>Weet je zeker dat je de instellingen wilt resetten naar standaard?</p>
        <p className="text-sm text-gray-500 mt-2">
          De toernooienaam blijft behouden.
        </p>
      </Modal>
    </Card>
  );
};
