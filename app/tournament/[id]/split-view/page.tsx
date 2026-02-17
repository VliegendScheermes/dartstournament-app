'use client';

/**
 * OBS Split-Screen View
 * 1920×1080 browser source for OBS.
 * Left half (0–960px): transparent → place your camera source here in OBS.
 * Right half (960–1920px): live tournament view (auto-switches per tournament status).
 *
 * OBS setup:
 * 1. Add a Browser Source → this URL → 1920×1080, "Allow transparency" ON
 * 2. Add your Camera source, position it on the left half
 * 3. The tournament view fills the right half automatically
 */

import { use, useState, useEffect, useRef } from 'react';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { DrawViewerScreen } from '@/components/tournament/DrawViewerScreen';
import { PoolViewerScreen } from '@/components/tournament/PoolViewerScreen';
import { FinalsViewerScreen } from '@/components/tournament/FinalsViewerScreen';

interface SplitViewPageProps {
  params: Promise<{ id: string }>;
}

export default function SplitViewPage({ params }: SplitViewPageProps) {
  const { id } = use(params);
  const [isHydrated, setIsHydrated] = useState(false);
  const isFirstStatusChange = useRef(true);
  const [opacity, setOpacity] = useState(1);

  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Fade transition on status change (skip initial render)
  useEffect(() => {
    if (isFirstStatusChange.current) {
      isFirstStatusChange.current = false;
      return;
    }
    setOpacity(0);
    const timer = setTimeout(() => setOpacity(1), 350);
    return () => clearTimeout(timer);
  }, [tournament?.status]);

  if (!isHydrated) return null;

  const status = tournament?.status ?? 'setup';

  const renderScreen = () => {
    switch (status) {
      case 'pool-play':
        return <PoolViewerScreen id={id} />;
      case 'finals':
      case 'completed':
        return <FinalsViewerScreen id={id} />;
      default:
        return <DrawViewerScreen id={id} />;
    }
  };

  return (
    // Fixed 1920×1080 canvas — transparent background for OBS
    <div style={{
      width: 1920,
      height: 1080,
      position: 'relative',
      background: 'transparent',
      overflow: 'hidden',
    }}>
      {/* Left half — transparent (camera goes here in OBS) */}
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 960,
        height: 1080,
        background: 'transparent',
        pointerEvents: 'none',
      }} />

      {/* Right half — live tournament content */}
      <div style={{
        position: 'absolute',
        right: 0,
        top: 0,
        width: 960,
        height: 1080,
        overflow: 'hidden',
        transition: 'opacity 0.35s ease',
        opacity,
      }}>
        {/* Scale the viewer content to fit 960px wide */}
        <div style={{
          width: 1920,
          height: 1080,
          transformOrigin: 'top left',
          transform: 'scale(0.5)',
        }}>
          {renderScreen()}
        </div>
      </div>
    </div>
  );
}
