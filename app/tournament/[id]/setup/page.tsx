/**
 * Setup Page
 * Tournament configuration, player management, and pool drawing
 */

'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { SettingsForm } from '@/components/tournament/SettingsForm';
import { PlayerManager } from '@/components/tournament/PlayerManager';
import { PoolDisplay } from '@/components/tournament/PoolDisplay';
import { TournamentSettings, Player, Pool } from '@/types/tournament';
import { generateAllPoolSchedules } from '@/lib/algorithms/roundRobin';

interface SetupPageProps {
  params: Promise<{ id: string }>;
}

export default function SetupPage({ params }: SetupPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = React.useState(false);

  const {
    loadTournament,
    updateSettings,
    setPlayers,
    setPools,
    setMatches,
    setRounds,
    updateStatus,
    isLoading,
    error,
  } = useTournamentStore();

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load tournament from API
  React.useEffect(() => {
    if (isHydrated) {
      loadTournament(id);
    }
  }, [id, isHydrated, loadTournament]);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showSettingsDropdown && !target.closest('.settings-dropdown-container')) {
        setShowSettingsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettingsDropdown]);

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

  const handleSettingsSave = async (settings: TournamentSettings) => {
    try {
      await updateSettings(id, settings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handlePlayersSave = async (players: Player[]) => {
    try {
      await setPlayers(id, players);
    } catch (error) {
      console.error('Failed to save players:', error);
    }
  };

  const handlePoolsUpdate = async (pools: Pool[]) => {
    try {
      await setPools(id, pools);
    } catch (error) {
      console.error('Failed to update pools:', error);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;

    try {
      // Generate round-robin schedules for all pools
      const { matches, rounds } = generateAllPoolSchedules(
        tournament.pools,
        tournament.players
      );

      // Save matches and rounds to store
      await setMatches(id, matches);
      await setRounds(id, rounds);

      // Update status and navigate
      await updateStatus(id, 'pool-play');
      router.push(`/tournament/${id}/pool-play`);
    } catch (error) {
      console.error('Failed to start tournament:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/')}
                className="text-blue-600 hover:underline flex items-center gap-2"
              >
                ← Back to Tournaments
              </button>
{(tournament.status === 'finals' || tournament.status === 'completed') && (
                <button
                  onClick={() => router.push(`/tournament/${id}/finals`)}
                  className="text-green-600 hover:underline flex items-center gap-2 font-semibold"
                >
                  Go to Finals →
                </button>
              )}
              {tournament.status === 'pool-play' && (
                <button
                  onClick={() => router.push(`/tournament/${id}/pool-play`)}
                  className="text-green-600 hover:underline flex items-center gap-2 font-semibold"
                >
                  Go to Pool Play →
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Live View Icon */}
              <a
                href={`/tournament/${id}/live-viewer`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

              {/* Settings Icon Dropdown */}
              <div className="relative settings-dropdown-container">
                <button
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

              {/* Dropdown Menu */}
              {showSettingsDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowSettingsDropdown(false);
                      // TODO: Navigate to Profile page
                      console.log('Navigate to Profile');
                    }}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    Profile
                  </button>
                  <a
                    href={`/tournament/${id}/scoreboard`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowSettingsDropdown(false)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    Scoreboard
                  </a>
                  <a
                    href={`/tournament/${id}/video`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setShowSettingsDropdown(false)}
                    className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 transition-colors"
                  >
                    Video
                  </a>
                </div>
              )}
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            {tournament.settings.tournamentName}
          </h1>
          <p className="text-gray-500 mt-1">Setup Phase</p>
        </div>

        {/* Settings and Players */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <SettingsForm
            settings={tournament.settings}
            onSave={handleSettingsSave}
          />
          <PlayerManager
            players={tournament.players}
            useClasses={tournament.settings.useClasses}
            onSave={handlePlayersSave}
          />
        </div>

        {/* Pools and Drawing */}
        <PoolDisplay
          pools={tournament.pools}
          players={tournament.players}
          settings={tournament.settings}
          tournamentId={id}
          onPoolsUpdate={handlePoolsUpdate}
          onStartTournament={handleStartTournament}
        />
      </div>
    </div>
  );
}
