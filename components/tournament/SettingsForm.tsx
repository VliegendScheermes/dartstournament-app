/**
 * Settings Form Component
 * Tournament configuration form
 */

'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TournamentSettings, VALIDATION, DEFAULT_TOURNAMENT_SETTINGS } from '@/types/tournament';

interface SettingsFormProps {
  settings: TournamentSettings;
  onSave: (settings: TournamentSettings) => void;
}

type NumberField =
  | 'numPools'
  | 'numBoards'
  | 'advanceToCrossFinals'
  | 'advanceToLosersFinal'
  | 'liveDrawDelaySeconds';

// Allowed range per number field; typed values are clamped to it on blur and on save
const NUMBER_LIMITS: Record<NumberField, { min: number; max: number }> = {
  numPools: { min: VALIDATION.MIN_POOLS, max: VALIDATION.MAX_POOLS },
  numBoards: { min: VALIDATION.MIN_BOARDS, max: VALIDATION.MAX_BOARDS },
  advanceToCrossFinals: { min: 1, max: VALIDATION.MAX_PLAYERS },
  advanceToLosersFinal: { min: 0, max: VALIDATION.MAX_PLAYERS },
  liveDrawDelaySeconds: { min: 0, max: 10 },
};

const NUMBER_FIELDS = Object.keys(NUMBER_LIMITS) as NumberField[];

const clampNumber = (field: NumberField, value: number): number => {
  const { min, max } = NUMBER_LIMITS[field];
  return Math.min(max, Math.max(min, Math.round(value)));
};

export const SettingsForm: React.FC<SettingsFormProps> = ({ settings, onSave }) => {
  const [formData, setFormData] = useState<TournamentSettings>(settings);
  // Text being typed in a number field; it may be empty or out of range until blur/save
  const [drafts, setDrafts] = useState<Partial<Record<NumberField, string>>>({});
  const [resetModal, setResetModal] = useState(false);

  // Show the saved settings again whenever they change (e.g. after saving)
  const [shownSettings, setShownSettings] = useState(settings);
  if (settings !== shownSettings) {
    setShownSettings(settings);
    setFormData(settings);
    setDrafts({});
  }

  const handleChange = (field: keyof TournamentSettings, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // The typed number, or the last valid value while the field is empty or invalid
  const getNumber = (field: NumberField): number => {
    const typed = Number.parseInt(drafts[field] ?? '', 10);
    return Number.isNaN(typed) ? formData[field] : typed;
  };

  const setNumber = (field: NumberField, value: number) => {
    setFormData((prev) => ({ ...prev, [field]: clampNumber(field, value) }));
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const commitNumber = (field: NumberField) => {
    if (drafts[field] !== undefined) setNumber(field, getNumber(field));
  };

  const handleSave = () => {
    const saved: TournamentSettings = {
      ...formData,
      // An empty name would not be saved
      tournamentName: formData.tournamentName.trim() || settings.tournamentName,
      // Set on the Video page, not in this form
      youtubeStreamUrl: settings.youtubeStreamUrl,
    };
    NUMBER_FIELDS.forEach((field) => {
      saved[field] = clampNumber(field, getNumber(field));
    });
    setFormData(saved);
    setDrafts({});
    onSave(saved);
  };

  const handleReset = () => {
    const resetSettings: TournamentSettings = {
      ...DEFAULT_TOURNAMENT_SETTINGS,
      tournamentName: formData.tournamentName.trim() || settings.tournamentName, // Keep tournament name
      youtubeStreamUrl: settings.youtubeStreamUrl, // Set on the Video page, not reset here
    };
    setFormData(resetSettings);
    setDrafts({});
    onSave(resetSettings);
    setResetModal(false);
  };

  const renderNumberField = (field: NumberField, label: string, hint?: string) => {
    const { min, max } = NUMBER_LIMITS[field];
    return (
      <div>
        <label htmlFor={`settings-${field}`} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setNumber(field, getNumber(field) - 1)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
          >
            -
          </button>
          <input
            id={`settings-${field}`}
            type="number"
            value={drafts[field] ?? formData[field]}
            onChange={(e) => {
              const value = e.target.value;
              setDrafts((prev) => ({ ...prev, [field]: value }));
            }}
            onBlur={() => commitNumber(field)}
            min={min}
            max={max}
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={() => setNumber(field, getNumber(field) + 1)}
            className="w-10 h-10 rounded-lg bg-gray-200 hover:bg-gray-300 font-bold"
          >
            +
          </button>
        </div>
        {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      </div>
    );
  };

  const losersPerPool = clampNumber('advanceToLosersFinal', getNumber('advanceToLosersFinal'));

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

        {renderNumberField(
          'numPools',
          'Number of Pools',
          `${VALIDATION.MIN_POOLS}–${VALIDATION.MAX_POOLS} pools`
        )}

        {renderNumberField(
          'numBoards',
          'Number of Boards',
          `${VALIDATION.MIN_BOARDS}–${VALIDATION.MAX_BOARDS} boards`
        )}

        {renderNumberField('advanceToCrossFinals', 'Advance to Cross Finals (per pool)')}

        {renderNumberField(
          'advanceToLosersFinal',
          'Advance to Losers Final (per pool)',
          losersPerPool === 0 ? 'Losers bracket disabled' : `${losersPerPool} player(s) from each pool`
        )}

        {renderNumberField(
          'liveDrawDelaySeconds',
          'Live Loting Delay (seconds)',
          'Time between two players during Live Loting (0–10 s)'
        )}

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
