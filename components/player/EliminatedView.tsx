'use client';

import React from 'react';
import { PlayerRole } from '@/lib/game-engine';

interface EliminatedViewProps {
  displayName: string;
  role: PlayerRole | null;
  eliminatedReason?: string | null;
}

export const EliminatedView: React.FC<EliminatedViewProps> = ({
  displayName,
  role,
  eliminatedReason,
}) => {
  const getReasonLabel = (reason?: string | null) => {
    switch (reason) {
      case 'MAFIA_KILL':
        return 'Eliminated by the Mafia during the night.';
      case 'VOTE_EXECUTION':
        return 'Voted out by the townspeople.';
      case 'MODERATOR_REMOVAL':
        return 'Removed by game moderator.';
      default:
        return 'You have been eliminated from the game.';
    }
  };

  return (
    <div
      className="glass-card"
      style={{
        textAlign: 'center',
        padding: '36px 20px',
        borderLeft: '4px solid var(--status-eliminated)',
        boxShadow: '0 8px 32px rgba(239, 68, 68, 0.25)',
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 50, marginBottom: 12 }}>💀</div>
      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', marginBottom: 8 }}>
        DECEASED / SPECTATOR
      </span>
      <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', marginTop: 6, marginBottom: 8 }}>
        {displayName}
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        {getReasonLabel(eliminatedReason)}
      </p>

      {role && (
        <div
          style={{
            background: 'rgba(0, 0, 0, 0.4)',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 20,
          }}
        >
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Your Role Was:
          </span>
          <h3 style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color: 'var(--role-mafia)' }}>
            {role}
          </h3>
        </div>
      )}

      <p style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic' }}>
        You may continue watching the game as a spectator. Do not reveal secrets to alive players!
      </p>
    </div>
  );
};
