/**
 * Tournament Advice
 * Works out which tournament setups suit the number of players and boards, and
 * lets the organiser take one over in a single click.
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { TournamentSettings, VALIDATION } from '@/types/tournament';
import {
  AdviceInput,
  AdviceOption,
  AdvicePriority,
  buildAdvice,
  optionLabel,
  optionSettings,
  optionSubLabel,
} from '@/lib/algorithms/advice';

const PRIORITIES: { value: AdvicePriority; label: string }[] = [
  { value: 'equal', label: 'Gelijke poules' },
  { value: 'matches', label: 'Veel wedstrijden per speler' },
  { value: 'short', label: 'Zo kort mogelijk' },
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const chipClass = (active: boolean) =>
  `px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
    active
      ? 'bg-blue-600 border-blue-600 text-white font-semibold'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
  }`;

interface TournamentAdviceProps {
  /** Players currently in the saved player list */
  playerCount: number;
  settings: TournamentSettings;
  onApply: (settings: Partial<TournamentSettings>) => void;
}

export const TournamentAdvice: React.FC<TournamentAdviceProps> = ({
  playerCount,
  settings,
  onApply,
}) => {
  const [playersText, setPlayersText] = useState(String(playerCount || VALIDATION.MIN_PLAYERS));
  const [boardsText, setBoardsText] = useState(String(settings.numBoards));
  const [losersFinal, setLosersFinal] = useState(settings.advanceToLosersFinal > 0);
  const [query, setQuery] = useState<AdviceInput | null>(null);
  const [priority, setPriority] = useState<AdvicePriority>('equal');
  const [selected, setSelected] = useState(0);
  const [applied, setApplied] = useState(false);

  // Follow the player list while the organiser has not asked for advice yet
  const [shownCount, setShownCount] = useState(playerCount);
  if (playerCount !== shownCount) {
    setShownCount(playerCount);
    if (!query && playerCount > 0) setPlayersText(String(playerCount));
  }

  const result = useMemo(() => (query ? buildAdvice(query, priority) : null), [query, priority]);
  const option: AdviceOption | undefined = result?.options[selected] ?? result?.options[0];

  const handleAdvise = () => {
    // Only the upper bound is clamped: too few players should be said out loud,
    // not quietly rounded up to a number the organiser does not have
    const players = Math.min(
      VALIDATION.MAX_PLAYERS,
      Math.max(0, Number.parseInt(playersText, 10) || playerCount)
    );
    const boards = clamp(
      Number.parseInt(boardsText, 10) || settings.numBoards,
      VALIDATION.MIN_BOARDS,
      VALIDATION.MAX_BOARDS
    );
    setPlayersText(String(players));
    setBoardsText(String(boards));
    setSelected(0);
    setApplied(false);
    setQuery({ players, boards, losersFinal });
  };

  const handleApply = () => {
    if (!option || !query) return;
    onApply({ ...optionSettings(option), numBoards: query.boards });
    setApplied(true);
  };

  return (
    <Card title="Advies" className="mb-6">
      <p className="text-sm text-gray-500 -mt-2 mb-4">
        Weet je niet hoeveel poules handig zijn? Vul in wat je hebt en laat de app meedenken.
      </p>

      {/* What the organiser has */}
      <div className="flex flex-wrap items-end gap-5 pb-4 border-b border-gray-200">
        <div>
          <label htmlFor="advice-players" className="block text-sm font-medium text-gray-700 mb-1.5">
            Aantal spelers
          </label>
          <input
            id="advice-players"
            type="number"
            min={VALIDATION.MIN_PLAYERS}
            max={VALIDATION.MAX_PLAYERS}
            value={playersText}
            onChange={(e) => setPlayersText(e.target.value)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label htmlFor="advice-boards" className="block text-sm font-medium text-gray-700 mb-1.5">
            Aantal borden
          </label>
          <input
            id="advice-boards"
            type="number"
            min={VALIDATION.MIN_BOARDS}
            max={VALIDATION.MAX_BOARDS}
            value={boardsText}
            onChange={(e) => setBoardsText(e.target.value)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <label
          htmlFor="advice-losers"
          className="flex items-center gap-2 text-sm text-gray-700 pb-2.5 cursor-pointer"
        >
          <input
            id="advice-losers"
            type="checkbox"
            checked={losersFinal}
            onChange={(e) => setLosersFinal(e.target.checked)}
            className="w-4 h-4 accent-blue-600"
          />
          Verliezersfinale spelen
        </label>
        <button
          type="button"
          onClick={handleAdvise}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors mb-0.5"
        >
          Geef advies
        </button>
      </div>

      {!query && (
        <p className="text-sm text-gray-500 mt-4">
          Het aantal spelers komt uit je spelerslijst. Pas het aan om vooruit te plannen,
          bijvoorbeeld als je nog mensen verwacht.
        </p>
      )}

      {result && result.problems.length > 0 && (
        <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3">
          {result.problems.map((problem) => (
            <p key={problem} className="text-sm text-yellow-900">
              {problem}
            </p>
          ))}
        </div>
      )}

      {result && option && (
        <div className="mt-4 space-y-4">
          {/* What to favour */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-sm text-gray-700">Waar let je op?</span>
            {PRIORITIES.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={priority === value}
                onClick={() => {
                  setPriority(value);
                  setSelected(0);
                  setApplied(false);
                }}
                className={chipClass(priority === value)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* The setups worth considering */}
          <div className="flex flex-wrap gap-2.5">
            {result.options.map((candidate, index) => (
              <button
                key={`${candidate.numPools}-${candidate.advanceToCrossFinals}`}
                type="button"
                aria-pressed={index === selected}
                onClick={() => {
                  setSelected(index);
                  setApplied(false);
                }}
                className={`px-4 py-2.5 text-left rounded-lg border transition-colors ${
                  index === selected
                    ? 'bg-blue-50 border-2 border-blue-600'
                    : 'bg-white border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="block text-sm font-bold text-gray-900">{optionLabel(candidate)}</span>
                <span className="block text-xs text-gray-600">{optionSubLabel(candidate)}</span>
              </button>
            ))}
          </div>

          <OptionPreview option={option} applied={applied} onApply={handleApply} />

          {option.cautions.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-300 rounded-lg px-4 py-3">
              <p className="text-sm text-yellow-900">
                {option.cautions.join('. ')}.
              </p>
            </div>
          )}

          {result.tip && (
            <div
              className={`border rounded-lg px-4 py-3 ${
                result.tip.kind === 'ok'
                  ? 'bg-green-50 border-green-300'
                  : 'bg-indigo-50 border-indigo-200'
              }`}
            >
              <p
                className={`text-sm ${
                  result.tip.kind === 'ok' ? 'text-green-800' : 'text-indigo-900'
                }`}
              >
                {result.tip.text}
              </p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

/** The chosen setup: the pools, the brackets they feed, and the numbers */
const OptionPreview: React.FC<{
  option: AdviceOption;
  applied: boolean;
  onApply: () => void;
}> = ({ option, applied, onApply }) => (
  <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-4">
    <div className="flex flex-wrap items-stretch gap-3.5">
      {/* Pools, small and vertical */}
      <div className="w-44 flex-none">
        <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Poulefase</p>
        <div className="border border-gray-200 bg-white rounded-lg overflow-hidden">
          {option.pools.map((pool, index) => (
            <div
              key={pool.name}
              className={`flex justify-between px-3 py-1.5 ${
                index < option.pools.length - 1 ? 'border-b border-gray-100' : ''
              } ${pool.size < option.largestPool ? 'bg-yellow-50' : ''}`}
            >
              <span
                className={`text-sm ${
                  pool.size < option.largestPool ? 'text-yellow-900' : 'text-gray-900'
                }`}
              >
                {pool.name}
              </span>
              <span
                className={`text-sm font-semibold ${
                  pool.size < option.largestPool ? 'text-yellow-800' : 'text-gray-700'
                }`}
              >
                {pool.size}
              </span>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-700 mt-2">
          {option.poolMatches} wedstrijden · {option.matchesPerBoard} per bord
        </p>
        <p className={`text-sm ${option.equalPools ? 'text-gray-700' : 'text-yellow-800'}`}>
          {option.equalPools
            ? `Iedereen speelt er ${option.minMatchesPerPlayer}`
            : `${option.minMatchesPerPlayer} tot ${option.maxMatchesPerPlayer} per speler`}
        </p>
      </div>

      <Chevron />

      {/* The brackets the pools feed */}
      <div className="flex-1 min-w-[300px] flex flex-col justify-center gap-2.5">
        <div className="border border-green-300 bg-green-50 rounded-lg px-3.5 py-2.5">
          <p className="text-sm font-bold text-green-900">
            Kruisfinale · {option.crossFinalists} spelers
          </p>
          <p className="text-sm text-green-800">
            De beste {option.advanceToCrossFinals} van elke poule · {option.crossMatches} wedstrijden
          </p>
          <p className={`text-xs mt-0.5 ${option.crossByes === 0 ? 'text-green-700' : 'text-yellow-800'}`}>
            {option.crossByes === 0
              ? 'Precies rond, iedereen begint in de eerste ronde'
              : `${option.crossByes} ${option.crossByes === 1 ? 'speler slaat' : 'spelers slaan'} de eerste ronde over`}
          </p>
        </div>

        {option.losersFinalists >= 2 ? (
          <div className="border border-orange-300 bg-orange-50 rounded-lg px-3.5 py-2.5">
            <p className="text-sm font-bold text-orange-900">
              Verliezersfinale · {option.losersFinalists} spelers
            </p>
            <p className="text-sm text-orange-800">
              De onderste {option.advanceToLosersFinal} van elke poule · {option.losersMatches} wedstrijden
            </p>
            <p className="text-xs text-orange-700 mt-0.5">De verliezer gaat steeds door</p>
          </div>
        ) : (
          <div className="border border-dashed border-gray-300 bg-white rounded-lg px-3.5 py-2.5">
            <p className="text-sm font-semibold text-gray-600">Geen verliezersfinale</p>
            <p className="text-sm text-gray-600">
              {option.eliminatedAfterPools} spelers stoppen na de poulefase.
            </p>
          </div>
        )}
      </div>

      <Chevron />

      {/* Where it ends */}
      <div className="flex-none flex flex-col justify-center gap-2">
        <div className="border border-yellow-300 bg-yellow-50 rounded-lg px-4 py-2.5 text-center">
          <span className="block text-xl" aria-hidden="true">
            🏆
          </span>
          <span className="block text-sm font-semibold text-yellow-900">Winnaar</span>
        </div>
        {option.losersFinalists >= 2 && (
          <div className="border border-gray-200 bg-white rounded-lg px-4 py-2.5 text-center">
            <span className="block text-sm text-gray-600">Laatste plaats</span>
          </div>
        )}
      </div>
    </div>

    <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-5 text-sm text-gray-700">
        {option.good.map((item) => (
          <span key={item}>✓ {item}</span>
        ))}
        <span>{option.totalMatches} wedstrijden in totaal</span>
      </div>
      <button
        type="button"
        onClick={onApply}
        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
      >
        {applied ? 'Overgenomen ✓' : 'Instellingen overnemen'}
      </button>
    </div>
  </div>
);

const Chevron: React.FC = () => (
  <div className="flex items-center">
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#94a3b8"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </div>
);
