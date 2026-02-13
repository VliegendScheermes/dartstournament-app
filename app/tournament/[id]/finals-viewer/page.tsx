'use client';

import { use } from 'react';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';

interface FinalsViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function FinalsViewerPage({ params }: FinalsViewerPageProps) {
  const { id } = use(params);
  return <FinalsViewerScreen id={id} />;
}
