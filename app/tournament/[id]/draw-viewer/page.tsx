'use client';

import { use } from 'react';
import { DrawViewerScreen, usePublicTournamentPolling } from '@/components/tournament/DrawViewerScreen';

interface DrawViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function DrawViewerPage({ params }: DrawViewerPageProps) {
  const { id } = use(params);

  // Poll public API every 3s (no auth required — works for a beamer and OBS).
  // DrawViewerScreen polls faster itself while a draw is running.
  const loaded = usePublicTournamentPolling(id, 3000);

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
      </div>
    );
  }

  return <DrawViewerScreen id={id} />;
}
