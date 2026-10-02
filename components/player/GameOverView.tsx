'use client';

import React from 'react';
import { GameWinner, PlayerRole, PublicPlayer } from '@/lib/game-engine';

interface GameOverViewProps {
  winner: GameWinner;
  playerRole: PlayerRole | null;
  players: PublicPlayer[];
  onPlayAgain?: () => void;
}

export const GameOverView: React.FC<GameOverViewProps> = ({
  winner,
  playerRole,
  players,
  onPlayAgain,
}) => {
  const isMafiaPlayer = playerRole === 'MAFIA';
  const playerWon = (winner === 'MAFIA' && isMafiaPlayer) || (winner === 'VILLAGE' && !isMafiaPlayer);

  const getWinnerTitle = () => {
    if (winner === 'MAFIA') {
      return {
        title: 'MAFIA VICTORY',
        color: 'var(--role-mafia)',
        glow: 'var(--role-mafia-glow)',
        icon: '🩸',
        subtitle: 'The Mafia reached parity and seized control of the town.',
      };
    }
    return {
      title: 'VILLAGE VICTORY',
      color: 'var(--role-doctor)',
      glow: 'var(--role-doctor-glow)',
      icon: '🏆',
      subtitle: 'All Mafia conspirators have been rooted out and eliminated!',
    };
  };

  const details = getWinnerTitle();

  return (
    <div
      className="glass-card"
      style={{
        textAlign: 'center',
        padding: '32px 18px',
        borderLeft: `4px solid ${details.color}`,
        boxShadow: `0 8px 36px ${details.glow}`,
        marginBottom: 20,
      }}
    >
      <div style={{ fontSize: 52, marginBottom: 8 }}>{details.icon}</div>
      <h1 style={{ fontSize: 26, fontWeight: 900, color: details.color, letterSpacing: 0.5, marginBottom: 6 }}>
        {details.title}
      </h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
        {details.subtitle}
      </p>

      {/* Personal outcome */}
      {playerRole && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            background: playerWon ? 'rgba(0, 245, 155, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: playerWon ? '1px solid #00f59b' : '1px solid #ef4444',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 800, color: playerWon ? '#00f59b' : '#ef4444' }}>
            {playerWon ? '🎉 YOU WON!' : 'DEFEAT'}
          </span>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
            You played as {playerRole}.
          </p>
        </div>
      )}

      {/* Full Roster Reveal */}
      <div style={{ textAlign: 'left', marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 12 }}>
          Full Player Roster & Roles:
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: p.status === 'ALIVE' ? 'rgba(0, 245, 155, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: p.status === 'ALIVE' ? '#00f59b' : '#ef4444',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {p.seat_number ?? '#'}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600 }}>{p.display_name}</span>
              </div>

              <span
                style={{
                  fontSize: 12,
                  fontWeight: 800,
                  color:
                    p.role === 'MAFIA'
                      ? 'var(--role-mafia)'
                      : p.role === 'DETECTIVE'
                      ? 'var(--role-detective)'
                      : p.role === 'DOCTOR'
                      ? 'var(--role-doctor)'
                      : 'var(--role-citizen)',
                }}
              >
                {p.role || 'CITIZEN'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {onPlayAgain && (
        <button onClick={onPlayAgain} className="btn-secondary">
          Return to Home
        </button>
      )}
    </div>
  );
};
