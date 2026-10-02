'use client';

import React, { useEffect, useState } from 'react';
import { GamePhase } from '@/lib/game-engine';

interface TimerHeaderProps {
  phase: GamePhase;
  round: number;
  phaseEndsAt: string | null;
}

export const TimerHeader: React.FC<TimerHeaderProps> = ({ phase, round, phaseEndsAt }) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsRemaining(null);
      return;
    }

    const calculateRemaining = () => {
      const diff = Math.max(0, Math.floor((new Date(phaseEndsAt).getTime() - Date.now()) / 1000));
      setSecondsRemaining(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  const getPhaseBadgeColor = (p: GamePhase) => {
    switch (p) {
      case 'NIGHT':
        return 'badge-mafia';
      case 'DISCUSSION':
        return 'badge-detective';
      case 'VOTING':
        return 'badge-citizen';
      default:
        return '';
    }
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const isCritical = secondsRemaining !== null && secondsRemaining <= 10 && secondsRemaining > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`badge ${getPhaseBadgeColor(phase)}`} style={{ padding: '6px 12px', fontSize: 13 }}>
          {phase.replace('_', ' ')}
        </span>
        {round > 0 && (
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>
            Round {round}
          </span>
        )}
      </div>

      {secondsRemaining !== null && (
        <div className={`timer-container ${isCritical ? 'timer-critical' : ''}`}>
          <span>⏱️</span>
          <span>{formatTimer(secondsRemaining)}</span>
        </div>
      )}
    </div>
  );
};
