'use client';

import React from 'react';
import { GamePhase } from '@/lib/game-engine';

interface OverlayHeaderProps {
  gameCode: string;
  phase: GamePhase;
  round: number;
}

export function OverlayHeader({ gameCode, phase, round }: OverlayHeaderProps) {
  const getPhaseDisplay = (p: GamePhase) => {
    switch (p) {
      case 'LOBBY':
        return { label: 'LOBBY', color: 'var(--text-secondary)' };
      case 'NIGHT':
        return { label: `NIGHT ${round}`, color: 'var(--role-detective)' };
      case 'DAY':
      case 'DISCUSSION':
        return { label: `DAY ${round} DISCUSSION`, color: 'var(--role-citizen)' };
      case 'VOTING':
        return { label: 'VOTING OPEN', color: 'var(--role-mafia)' };
      case 'REVEAL':
      case 'ELIMINATION':
        return { label: 'ELIMINATION', color: 'var(--status-eliminated)' };
      case 'GAME_OVER':
        return { label: 'GAME OVER', color: '#ffb703' };
      default:
        return { label: p, color: 'var(--text-primary)' };
    }
  };

  const phaseInfo = getPhaseDisplay(phase);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto 20px auto',
        padding: '10px 16px',
        background: 'rgba(0, 0, 0, 0.55)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '9999px',
        boxSizing: 'border-box',
      }}
    >
      {/* Brand & Room Code */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            background: 'rgba(255, 42, 95, 0.2)',
            border: '1px solid rgba(255, 42, 95, 0.4)',
            borderRadius: '9999px',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#ff2a5f',
              boxShadow: '0 0 8px #ff2a5f',
              display: 'inline-block',
            }}
          />
          <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: '1px', color: '#ff2a5f' }}>
            LIVE
          </span>
        </div>

        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.5px', color: 'var(--text-secondary)' }}>
          ROOM: <strong style={{ color: '#ffffff', letterSpacing: '2px' }}>{gameCode}</strong>
        </span>
      </div>

      {/* Current Phase Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 14px',
          background: 'rgba(255, 255, 255, 0.06)',
          border: `1px solid ${phaseInfo.color}40`,
          borderRadius: '9999px',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '1px',
            color: phaseInfo.color,
            textTransform: 'uppercase',
          }}
        >
          {phaseInfo.label}
        </span>
      </div>
    </div>
  );
}
