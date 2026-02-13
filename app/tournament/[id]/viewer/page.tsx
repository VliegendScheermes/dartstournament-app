'use client';

import { use } from 'react';
import { PoolViewerScreen } from '@/components/tournament/PoolViewerScreen';

interface ViewerPageProps {
  params: Promise<{ id: string }>;
}

export default function ViewerPage({ params }: ViewerPageProps) {
  const { id } = use(params);
  return <PoolViewerScreen id={id} />;
}
