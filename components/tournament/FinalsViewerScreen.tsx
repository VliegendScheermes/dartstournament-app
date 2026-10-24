'use client';

import { useTournamentStore } from '@/lib/store/tournamentStore';
import { ViewerBracketView } from '@/components/tournament/ViewerBracketView';
import { buildBracket, getBracketSlots } from '@/lib/algorithms/finals';

export function FinalsViewerScreen({ id }: { id: string }) {
  const tournament = useTournamentStore(state => state.tournaments.find(t => t.id === id));

  // Data is loaded and refreshed by the page (usePublicTournamentPolling), which
  // shows its own loading state until the first load has finished

  if (!tournament) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4" style={{ color: '#d4af37' }}>Tournament Not Found</h1>
          <p style={{ color: '#fdf5e6' }}>The tournament you&apos;re looking for doesn&apos;t exist.</p>
        </div>
      </div>
    );
  }

  // Both brackets are derived from their round-1 slots and the confirmed results
  const finalsBracket = tournament.drawState?.finalsBracket;
  const crossBracket = buildBracket(
    getBracketSlots(finalsBracket, tournament.matches, 'CROSS'),
    tournament.matches,
    'CROSS'
  );
  const losersBracket = buildBracket(
    getBracketSlots(finalsBracket, tournament.matches, 'LOSERS'),
    tournament.matches,
    'LOSERS'
  );
  const showLosers = tournament.settings.advanceToLosersFinal > 0 && losersBracket.rounds.length > 0;

  const getPlayerName = (playerId: string | null | undefined): string =>
    (playerId && tournament.players.find((p) => p.id === playerId)?.name) || '';

  // Only known once the final of each bracket has been decided
  const championName = getPlayerName(crossBracket.resultId);
  const loserName = showLosers ? getPlayerName(losersBracket.resultId) : '';

  return (
    <div className="min-h-screen py-8 px-4" style={{
      backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.85), rgba(10, 10, 10, 0.9)), url(/images/background-darts.webp)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      <div className="max-w-7xl mx-auto p-6 rounded-lg" style={{
        background: '#0A0A0A',
        border: '1px solid #1a1a1a'
      }}>
        <div className="mb-6 flex justify-center">
          <div className="w-full max-w-4xl px-8 py-3 rounded-lg" style={{
            background: '#004d30',
            border: '2px solid #d4af37',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.8), 0 0 20px rgba(212, 175, 55, 0.3)'
          }}>
            <h1 className="text-3xl font-bold tracking-wide text-center" style={{
              fontFamily: 'Georgia, serif',
              color: '#d4af37',
              textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8), 0 0 10px rgba(212, 175, 55, 0.3)'
            }}>
              {tournament.settings.tournamentName}
            </h1>
          </div>
        </div>

        {championName && (
          <div className="mb-4 flex justify-center">
            <div className="w-full max-w-4xl px-12 py-8 rounded-lg" style={{
              background: '#004d30',
              border: '2px solid #d4af37',
              boxShadow: '0 12px 40px rgba(212, 175, 55, 0.6), 0 0 30px rgba(212, 175, 55, 0.5), inset 0 2px 8px rgba(212, 175, 55, 0.2)'
            }}>
              <p className="text-sm mb-3 text-center" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                letterSpacing: '3px',
                textTransform: 'uppercase'
              }}>
                🏆 Champion 🏆
              </p>
              <h2 className="text-5xl font-bold text-center" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                textShadow: '2px 2px 6px rgba(0, 0, 0, 0.9), 0 0 25px rgba(212, 175, 55, 0.6)'
              }}>
                {championName}
              </h2>
            </div>
          </div>
        )}

        {loserName && (
          <div className="mb-8 flex justify-center">
            <div className="w-full max-w-4xl px-8 py-4 rounded-lg" style={{
              background: '#4a0404',
              border: '2px solid #d4af37',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7)'
            }}>
              <p className="text-xs mb-2 text-center" style={{
                fontFamily: 'Georgia, serif',
                color: '#d4af37',
                letterSpacing: '2px',
                opacity: 0.9
              }}>
                Loser
              </p>
              <h3 className="text-3xl font-semibold text-center" style={{
                fontFamily: 'Georgia, serif',
                color: '#fdf5e6'
              }}>
                {loserName}
              </h3>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {showLosers && (
            <div className="lg:col-span-6 h-full p-4 rounded-lg" style={{
              background: '#000000',
              border: '2px solid #1a1a1a'
            }}>
              <ViewerBracketView
                title="Losers Bracket"
                subtitle="Loser Advances"
                rounds={losersBracket.rounds}
                players={tournament.players}
                isLosers={true}
              />
            </div>
          )}

          <div className={`${showLosers ? 'lg:col-span-6' : 'lg:col-span-12'} h-full p-4 rounded-lg`} style={{
            background: '#000000',
            border: '2px solid #1a1a1a'
          }}>
            <ViewerBracketView
              title="Cross Finals"
              subtitle="Winner Advances"
              rounds={crossBracket.rounds}
              players={tournament.players}
              isLosers={false}
            />
          </div>
        </div>

        <div className="mt-8 text-center">
          {tournament.settings.youtubeStreamUrl ? (
            <a href={tournament.settings.youtubeStreamUrl} target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ background: '#000000', border: '2px solid #d4af37', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)' }}
            >
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#d4af37' }}>🎯 Watch Tournament Live</p>
            </a>
          ) : (
            <a href="https://sportsplugins.com/" target="_blank" rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-lg cursor-pointer hover:scale-105 transition-transform"
              style={{ background: '#000000', border: '2px solid #d4af37', boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)' }}
            >
              <p className="text-sm" style={{ fontFamily: 'Georgia, serif', color: '#d4af37' }}>Powered by SportsPlugins</p>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
