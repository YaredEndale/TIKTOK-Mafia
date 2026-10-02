'use client';

import React, { useEffect, useState } from 'react';

interface OverlayTimerProps {
  phaseEndsAt: string | null;
  label?: string;
}

export function OverlayTimer({ phaseEndsAt, label }: OverlayTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

  useEffect(() => {
    if (!phaseEndsAt) {
      setSecondsRemaining(0);
      return;
    }

    const calculateRemaining = () => {
      const targetTime = new Date(phaseEndsAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000));
      setSecondsRemaining(diff);
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [phaseEndsAt]);

  const isUrgent = secondsRemaining > 0 && secondsRemaining <= 10;
  const minutes = Math.floor(secondsRemaining / 60);
  const secs = secondsRemaining % 60;
  const timeFormatted = `${minutes}:${secs.toString().padStart(2, '0')}`;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '12px 0 24px',
      }}
    >
      {label && (
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: '2px',
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            marginBottom: 4,
          }}
        >
          {label}
        </span>
      )}
      <div className={`overlay-timer-giant ${isUrgent ? 'urgent' : ''}`}>
        <span>⏱️</span>
        <span>{timeFormatted}</span>
      </div>
    </div>
  );
}
