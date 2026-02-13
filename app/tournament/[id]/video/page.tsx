/**
 * Video Settings Page
 * Configure YouTube livestream integration and OBS settings
 */

'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface VideoPageProps {
  params: Promise<{ id: string }>;
}

export default function VideoPage({ params }: VideoPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [isHydrated, setIsHydrated] = React.useState(false);
  const [youtubeUrl, setYoutubeUrl] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveMessage, setSaveMessage] = React.useState('');

  const { getTournament, updateSettings } = useTournamentStore();
  const tournament = getTournament(id);

  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  React.useEffect(() => {
    if (tournament?.settings.youtubeStreamUrl) {
      setYoutubeUrl(tournament.settings.youtubeStreamUrl);
    }
  }, [tournament]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Tournament Not Found</h1>
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

  const handleSave = () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      updateSettings(id, {
        youtubeStreamUrl: youtubeUrl.trim() || undefined,
      });

      setSaveMessage('YouTube livestream URL saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      setSaveMessage('Error saving settings. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/tournament/${id}/setup`)}
            className="text-blue-600 hover:underline flex items-center gap-2 mb-4"
          >
            ← Back to Setup
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Video Settings</h1>
          <p className="text-gray-500 mt-1">{tournament.settings.tournamentName}</p>
        </div>

        {/* YouTube Livestream Section */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">YouTube Livestream</h2>
          <p className="text-sm text-gray-600 mb-4">
            Add your YouTube livestream URL to enable the "Watch Tournament Live" button on viewer pages.
          </p>

          <div className="space-y-4">
            <div>
              <label
                htmlFor="youtube-url"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                YouTube Livestream URL
              </label>
              <input
                id="youtube-url"
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter the full URL of your YouTube livestream (e.g., https://www.youtube.com/watch?v=xxxxx)
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </Button>

              {saveMessage && (
                <p
                  className={`text-sm ${
                    saveMessage.includes('Error')
                      ? 'text-red-600'
                      : 'text-green-600'
                  }`}
                >
                  {saveMessage}
                </p>
              )}
            </div>
          </div>

          {/* Preview */}
          {youtubeUrl.trim() && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">Preview</h3>
              <p className="text-sm text-blue-800">
                When saved, viewer pages will display:
                <br />
                <span className="font-semibold">🎯 Watch Tournament Live</span>
                <br />
                Clicking will open: {youtubeUrl}
              </p>
            </div>
          )}

          {!youtubeUrl.trim() && (
            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <p className="text-sm text-gray-600">
                When no URL is provided, viewer pages will display:
                <br />
                <span className="font-semibold">Powered by SportsPlugins</span>
                <br />
                Linking to: https://sportsplugins.com/
              </p>
            </div>
          )}
        </Card>

        {/* OBS Integration Section - Reserved for future */}
        <Card className="bg-gray-50 border-2 border-dashed border-gray-300">
          <div className="text-center py-8">
            <h2 className="text-xl font-bold text-gray-500 mb-2">OBS Integration</h2>
            <p className="text-sm text-gray-400">
              OBS Import Views for livestream overlays
            </p>
            <p className="text-xs text-gray-400 mt-2">Coming soon...</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
