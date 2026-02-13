/**
 * Tournament List Component
 * Displays active and archived tournaments
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTournamentStore } from '@/lib/store/tournamentStore';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Tournament } from '@/types/tournament';

export const TournamentList: React.FC = () => {
  const router = useRouter();
  const {
    loadTournaments,
    createTournament,
    deleteTournament,
    archiveTournament,
    setCurrentTournament,
    getActiveTournaments,
    getArchivedTournaments,
    updateStatus,
    isLoading,
    error,
  } = useTournamentStore();

  const activeTournaments = getActiveTournaments();
  const archivedTournaments = getArchivedTournaments();

  // Load tournaments on mount
  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  const [showArchived, setShowArchived] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    show: boolean;
    tournament: Tournament | null;
  }>({ show: false, tournament: null });

  const handleNewTournament = async () => {
    try {
      const id = await createTournament();
      router.push(`/tournament/${id}/setup`);
    } catch (error) {
      console.error('Failed to create tournament:', error);
    }
  };

  const handleOpenTournament = (tournament: Tournament) => {
    setCurrentTournament(tournament.id);

    // Navigate based on tournament status
    if (tournament.status === 'setup') {
      router.push(`/tournament/${tournament.id}/setup`);
    } else if (tournament.status === 'pool-play') {
      router.push(`/tournament/${tournament.id}/pool-play`);
    } else if (tournament.status === 'finals' || tournament.status === 'completed') {
      router.push(`/tournament/${tournament.id}/finals`);
    }
  };

  const handleArchive = async (tournament: Tournament) => {
    try {
      await archiveTournament(tournament.id);
    } catch (error) {
      console.error('Failed to archive tournament:', error);
    }
  };

  const handleUnarchive = async (tournament: Tournament) => {
    try {
      await updateStatus(tournament.id, tournament.status === 'completed' ? 'completed' : 'setup');
    } catch (error) {
      console.error('Failed to unarchive tournament:', error);
    }
  };

  const handleDeleteClick = (tournament: Tournament) => {
    setDeleteModal({ show: true, tournament });
  };

  const handleDeleteConfirm = async () => {
    if (deleteModal.tournament) {
      try {
        await deleteTournament(deleteModal.tournament.id);
        setDeleteModal({ show: false, tournament: null });
      } catch (error) {
        console.error('Failed to delete tournament:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status: Tournament['status']) => {
    const badges = {
      setup: 'bg-gray-200 text-gray-800',
      'pool-play': 'bg-blue-200 text-blue-800',
      finals: 'bg-purple-200 text-purple-800',
      completed: 'bg-green-200 text-green-800',
      archived: 'bg-yellow-200 text-yellow-800',
    };

    const labels = {
      setup: 'Setup',
      'pool-play': 'Pool Play',
      finals: 'Finals',
      completed: 'Completed',
      archived: 'Archived',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${badges[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const TournamentCard = ({ tournament, isArchived = false }: { tournament: Tournament; isArchived?: boolean }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-gray-900">{tournament.settings.tournamentName}</h4>
          <p className="text-sm text-gray-500 mt-1">
            Created: {formatDate(tournament.createdAt)}
          </p>
          <p className="text-sm text-gray-500">
            Players: {tournament.players.length} | Pools: {tournament.settings.numPools}
          </p>
        </div>
        <div>{getStatusBadge(tournament.status)}</div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="flex gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleOpenTournament(tournament)}
            className="flex-1"
          >
            Open
          </Button>
          {tournament.status === 'setup' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/tournament/${tournament.id}/draw-viewer`)}
              title="Open draw viewer"
            >
              🎯 Draw
            </Button>
          )}
          {(tournament.status === 'pool-play' || tournament.status === 'finals' || tournament.status === 'completed') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/tournament/${tournament.id}/viewer`)}
              title="Open pool play public viewer"
            >
              👁️ Pools
            </Button>
          )}
          {(tournament.status === 'finals' || tournament.status === 'completed') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/tournament/${tournament.id}/finals-viewer`)}
              title="Open finals public viewer"
            >
              👁️ Finals
            </Button>
          )}
          {tournament.status !== 'archived' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/tournament/${tournament.id}/live-viewer`)}
              title="Open auto live viewer (follows tournament phase)"
            >
              📺 Live
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          {!isArchived && tournament.status !== 'archived' && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleArchive(tournament)}
            >
              Archive
            </Button>
          )}
          {isArchived && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleUnarchive(tournament)}
            >
              Unarchive
            </Button>
          )}
          <Button
            variant="danger"
            size="sm"
            onClick={() => handleDeleteClick(tournament)}
          >
            Delete
          </Button>
        </div>
      </div>
    </Card>
  );

  // Loading state
  if (isLoading && activeTournaments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading tournaments...</div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && activeTournaments.length === 0) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card className="border-red-300 bg-red-50">
          <div className="text-center py-8">
            <p className="text-red-800 font-medium mb-2">Failed to load tournaments</p>
            <p className="text-red-600 text-sm mb-4">{error}</p>
            <Button variant="primary" onClick={() => loadTournaments()}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Darts Tournaments</h1>
        <Button variant="success" onClick={handleNewTournament} disabled={isLoading}>
          + New Tournament
        </Button>
      </div>

      {/* Active Tournaments */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Active Tournaments</h2>
        {activeTournaments.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-center py-8">
              No active tournaments. Create one to get started!
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTournaments.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
        )}
      </section>

      {/* Archived Tournaments */}
      {archivedTournaments.length > 0 && (
        <section>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-xl font-semibold text-gray-700 hover:text-gray-900 mb-4"
          >
            <span>{showArchived ? '▼' : '▶'}</span>
            <span>Archived Tournaments ({archivedTournaments.length})</span>
          </button>
          {showArchived && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {archivedTournaments.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} isArchived />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.show}
        onClose={() => setDeleteModal({ show: false, tournament: null })}
        onConfirm={handleDeleteConfirm}
        title="Delete Tournament"
        confirmText="Delete"
        confirmVariant="danger"
      >
        <p>
          Are you sure you want to delete{' '}
          <strong>{deleteModal.tournament?.settings.tournamentName}</strong>?
        </p>
        <p className="text-sm text-gray-500 mt-2">This action cannot be undone.</p>
      </Modal>
    </div>
  );
};
