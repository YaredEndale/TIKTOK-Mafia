'use client';

import React from 'react';
import { PublicPlayer } from '@/lib/game-engine';
import { OverlayTimer } from './OverlayTimer';

interface NightOverlayProps {
  round: number;
  phaseEndsAt: string | null;
  players: PublicPlayer[];
}

export function NightOverlay({ round, phaseEndsAt, players }: NightOverlayProps) {
  const alivePlayers = players.filter((p) => p.status === 'ALIVE');

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        width: '100%',
        textAlign: 'center',
      }}
    >
      {/* Night Moon Graphic & Badge */}
      <div style={{ marginBottom: 12 }}>
        <div
          className="float-animation"
          style={{
            fontSize: 72,
            marginBottom: 8,
            filter: 'drop-shadow(0 0 30px rgba(0, 229, 255, 0.4))',
          }}
        >
          🌙
        </div>
        <span
          className="badge"
          style={{
            background: 'var(--role-detective-bg)',
            color: 'var(--role-detective)',
            border: '1px solid rgba(0, 229, 255, 0.3)',
            fontSize: 14,
            padding: '6px 16px',
          }}
        >
          NIGHT {round}
        </span>
      </div>

      <h1
        style={{
          fontSize: 42,
          fontWeight: 900,
          letterSpacing: '-1px',
          textShadow: '0 0 30px rgba(0, 229, 255, 0.3)',
          marginBottom: 6,
        }}
      >
        THE CITY SLEEPS
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 440, marginBottom: 16 }}>
        Secret roles are acting in the shadows. Do not reveal your screens!
      </p>

      {/* Giant Countdown Timer */}
      <OverlayTimer phaseEndsAt={phaseEndsAt} label="NIGHT TIME REMAINING" />

      {/* Alive Town Roster */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          marginTop: 12,
          background: 'rgba(10, 14, 26, 0.7)',
          border: '1px solid rgba(0, 229, 255, 0.15)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>
            SURVIVING CITIZENS
          </span>
          <span
            className="badge"
            style={{
              background: 'var(--role-doctor-bg)',
              color: 'var(--role-doctor)',
              fontSize: 12,
            }}
          >
            {alivePlayers.length} ALIVE
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
          }}
        >
          {players.map((p) => {
            const isAlive = p.status === 'ALIVE';
            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '10px 6px',
                  borderRadius: 14,
                  background: isAlive ? 'rgba(255, 255, 255, 0.04)' : 'rgba(239, 68, 68, 0.05)',
                  border: isAlive
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(239, 68, 68, 0.2)',
                  opacity: isAlive ? 1 : 0.45,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isAlive ? 'rgba(0, 229, 255, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: isAlive ? 'var(--role-detective)' : 'var(--status-eliminated)',
                    fontSize: 14,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 6,
                  }}
                >
                  {isAlive ? p.seat_number : '✕'}
                </div>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: isAlive ? '#ffffff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: 75,
                    textDecoration: isAlive ? 'none' : 'line-through',
                  }}
                >
                  {p.display_name}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
