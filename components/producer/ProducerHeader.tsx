'use client';

import React from 'react';
import { GamePhase } from '@/lib/game-engine';

interface ProducerHeaderProps {
  gameCode: string;
  phase: GamePhase;
  round: number;
  phaseEndsAt: string | null;
}

export function ProducerHeader({
  gameCode,
  phase,
  round,
  phaseEndsAt,
}: ProducerHeaderProps) {
  const [remaining, setRemaining] = React.useState<number>(0);

  React.useEffect(() => {
    if (!phaseEndsAt) {
      setRemaining(0);
      return;
    }

    const calc = () => {
      const diff = Math.max(0, Math.floor((new Date(phaseEndsAt).getTime() - Date.now()) / 1000));
      setRemaining(diff);
    };

    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

  return (
    <header
      className="glass-card"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '14px 24px',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 32 }}>🎬</span>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 20, fontWeight: 900 }}>Producer Console</h1>
            <span
              className="badge"
              style={{
                background: 'rgba(0, 229, 255, 0.15)',
                color: 'var(--role-detective)',
                border: '1px solid rgba(0, 229, 255, 0.4)',
              }}
            >
              ROOM: {gameCode}
            </span>
            <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
              READ-ONLY GAMEPLAY
            </span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
            Phase: <strong style={{ color: '#ffffff' }}>{phase}</strong> | Round:{' '}
            <strong style={{ color: '#ffffff' }}>{round}</strong>
          </p>
        </div>
      </div>

      {/* Synchronized Timer Display */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 18px',
            background: 'rgba(0, 0, 0, 0.4)',
            borderRadius: '9999px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            fontVariantNumeric: 'tabular-nums',
            fontSize: 22,
            fontWeight: 800,
            color: remaining <= 10 && remaining > 0 ? '#ef4444' : '#ffffff',
          }}
        >
          <span>⏱️</span>
          <span>{timeFormatted}</span>
        </div>
      </div>
    </header>
  );
}
