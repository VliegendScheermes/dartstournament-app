/**
 * Winner Display Component
 * Shows the tournament winners
 */

'use client';

import React from 'react';
import { Card } from '@/components/ui/Card';

interface WinnerDisplayProps {
  championName: string | null;
  loserName: string | null;
}

export const WinnerDisplay: React.FC<WinnerDisplayProps> = ({
  championName,
  loserName,
}) => {
  if (!championName && !loserName) {
    return null;
  }

  return (
    <div className="space-y-4">
      {championName && (
        <Card className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-400">
          <div className="text-center py-6">
            <div className="text-6xl mb-4">🏆</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Champion!</h2>
            <p className="text-2xl font-semibold text-yellow-700">{championName}</p>
          </div>
        </Card>
      )}

      {loserName && (
        <Card className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-400">
          <div className="text-center py-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-1">
              Losers Bracket Final Position
            </h3>
            <p className="text-xl font-medium text-gray-600">{loserName}</p>
          </div>
        </Card>
      )}
    </div>
  );
};
