'use client';

import { use } from 'react';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';
import { usePublicTournamentPolling } from '@/components/tournament/DrawViewerScreen';

interface FinalsViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function FinalsViewerPage({ params }: FinalsViewerPageProps) {
  const { id } = use(params);

  // Poll public API every 3s (no auth required — works for a beamer and OBS)
  const loaded = usePublicTournamentPolling(id, 3000);

  if (!loaded) {
    return (
      <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#d4af37', fontFamily: 'Georgia, serif' }}>Loading...</p>
      </div>
    );
  }

  return <FinalsViewerScreen id={id} />;
}
