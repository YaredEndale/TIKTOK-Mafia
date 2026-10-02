'use client';

import React, { useState } from 'react';
import { Player, PlayerRole } from '@/lib/game-engine';

interface PlayerPanelProps {
  players: Player[];
  onEliminatePlayer: (playerId: string, reason: string) => Promise<void>;
  onRemovePlayer: (playerId: string) => Promise<void>;
  isGameInProgress: boolean;
}

export const PlayerPanel: React.FC<PlayerPanelProps> = ({
  players,
  onEliminatePlayer,
  onRemovePlayer,
  isGameInProgress,
}) => {
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const eliminateReason = 'MODERATOR_REMOVAL';
  const [isProcessing, setIsProcessing] = useState(false);


  const getRoleBadge = (role: PlayerRole | null) => {
    switch (role) {
      case 'MAFIA':
        return <span className="badge badge-mafia">🩸 MAFIA</span>;
      case 'DETECTIVE':
        return <span className="badge badge-detective">🔍 DETECTIVE</span>;
      case 'DOCTOR':
        return <span className="badge badge-doctor">💉 DOCTOR</span>;
      case 'CITIZEN':
        return <span className="badge badge-citizen">🛡️ CITIZEN</span>;
      default:
        return <span className="badge" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>PENDING</span>;
    }
  };

  const handleEliminate = async () => {
    if (!selectedPlayer) return;
    setIsProcessing(true);
    try {
      await onEliminatePlayer(selectedPlayer.id, eliminateReason);
      setSelectedPlayer(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (playerId: string) => {
    if (!confirm('Are you sure you want to remove this player?')) return;
    setIsProcessing(true);
    try {
      await onRemovePlayer(playerId);
      if (selectedPlayer?.id === playerId) setSelectedPlayer(null);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800 }}>Players Roster</h3>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
            {players.filter((p) => p.status === 'ALIVE').length} Alive / {players.length} Total
          </p>
        </div>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}>
          MODERATOR VIEW
        </span>
      </div>

      {/* Players List */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 420 }}>
        {players.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
            <p>No players joined yet.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Share the room link to invite players.</p>
          </div>
        ) : (
          players.map((p) => {
            const isAlive = p.status === 'ALIVE';
            const isSelected = selectedPlayer?.id === p.id;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedPlayer(p)}
                className="glass-card-interactive"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: isSelected
                    ? 'rgba(255, 42, 95, 0.12)'
                    : isAlive
                    ? 'rgba(255, 255, 255, 0.03)'
                    : 'rgba(0, 0, 0, 0.35)',
                  border: isSelected
                    ? '1px solid var(--role-mafia)'
                    : isAlive
                    ? '1px solid var(--border-subtle)'
                    : '1px solid rgba(239, 68, 68, 0.2)',
                  opacity: isAlive ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: isAlive ? 'rgba(0, 245, 155, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isAlive ? '#00f59b' : '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    {p.seat_number ?? '#'}
                  </span>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{p.display_name}</div>
                    {p.tiktok_username && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        @{p.tiktok_username.replace('@', '')}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {getRoleBadge(p.role)}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: isAlive ? 'var(--status-alive)' : 'var(--status-eliminated)',
                    }}
                  >
                    {isAlive ? 'ALIVE' : 'DEAD'}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Player Action Drawer */}
      {selectedPlayer && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0, 0, 0, 0.45)',
            border: '1px solid var(--border-strong)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700 }}>
              Selected: <strong style={{ color: '#fff' }}>{selectedPlayer.display_name}</strong>
            </span>
            <button
              onClick={() => setSelectedPlayer(null)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {selectedPlayer.status === 'ALIVE' && isGameInProgress && (
              <button
                onClick={handleEliminate}
                disabled={isProcessing}
                className="btn-primary"
                style={{
                  flex: 1,
                  minHeight: 40,
                  fontSize: 13,
                  background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                }}
              >
                Manual Eliminate
              </button>
            )}

            {!isGameInProgress && (
              <button
                onClick={() => handleRemove(selectedPlayer.id)}
                disabled={isProcessing}
                className="btn-secondary"
                style={{ flex: 1, minHeight: 40, fontSize: 13, color: '#ef4444' }}
              >
                Kick from Lobby
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
