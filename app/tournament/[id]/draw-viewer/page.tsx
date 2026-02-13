'use client';

import { use } from 'react';
import { DrawViewerScreen } from '@/components/tournament/DrawViewerScreen';

interface DrawViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function DrawViewerPage({ params }: DrawViewerPageProps) {
  const { id } = use(params);
  return <DrawViewerScreen id={id} />;
}
