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

        {/* OBS Integration Section */}
        <Card>
          <h2 className="text-xl font-bold text-gray-900 mb-2">OBS Browser Sources</h2>
          <p className="text-sm text-gray-600 mb-6">
            Voeg deze URLs toe als Browser Source in OBS. Zet <strong>Allow transparency</strong> aan.
            Gebruik resolutie <strong>1920×1080</strong>.
          </p>

          <div className="space-y-4">
            <OBSLinkRow
              label="Live View (volledig scherm)"
              description="Toont automatisch de juiste view op basis van toernooistatus (loting → poule → finale)."
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/tournament/${id}/live-viewer`}
            />

            <OBSLinkRow
              label="Split Screen — Camera links / Live View rechts"
              description="1920×1080 overlay. Linkerhelft transparant (zet hier je camera). Rechterhelft toont de live tournament view."
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/tournament/${id}/split-view`}
              highlight
            />

            <OBSLinkRow
              label="Scoreboard Overlay (darts match)"
              description="Transparant scorebord rechtsonder — voor gebruik tijdens een actieve dartspartij."
              url={`${typeof window !== 'undefined' ? window.location.origin : ''}/tournament/${id}/obs-overlay`}
            />
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">Split Screen setup in OBS</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Voeg een <strong>Browser Source</strong> toe → gebruik de Split Screen URL → 1920×1080, Allow transparency AAN</li>
              <li>Voeg je <strong>Camera Source</strong> toe en positioneer die op de <strong>linkerhelft</strong></li>
              <li>De tournament view vult automatisch de <strong>rechterhelft</strong></li>
            </ol>
          </div>
        </Card>
      </div>
    </div>
  );
}

interface OBSLinkRowProps {
  label: string;
  description: string;
  url: string;
  highlight?: boolean;
}

function OBSLinkRow({ label, description, url, highlight }: OBSLinkRowProps) {
  const [copied, setCopied] = React.useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className={`rounded-lg border p-4 ${highlight ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold mb-0.5 ${highlight ? 'text-blue-900' : 'text-gray-800'}`}>
            {label}
          </p>
          <p className="text-xs text-gray-500 mb-2">{description}</p>
          <p className="text-xs font-mono text-gray-600 truncate">{url}</p>
        </div>
        <button
          onClick={copy}
          className={`shrink-0 px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
            copied
              ? 'bg-green-500 text-white'
              : highlight
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-gray-700 hover:bg-gray-800 text-white'
          }`}
        >
          {copied ? '✓ Gekopieerd' : 'Kopieer'}
        </button>
      </div>
    </div>
  );
}
