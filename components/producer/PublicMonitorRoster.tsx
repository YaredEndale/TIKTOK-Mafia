'use client';

import React from 'react';
import { PublicPlayer } from '@/lib/game-engine';

interface PublicMonitorRosterProps {
  players: PublicPlayer[];
}

export function PublicMonitorRoster({ players }: PublicMonitorRosterProps) {
  const alivePlayers = players.filter((p) => p.status === 'ALIVE');
  const eliminatedPlayers = players.filter((p) => p.status === 'ELIMINATED');

  return (
    <div className="glass-card" style={{ padding: 22, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>👥</span>
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>Town Status Monitor</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
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
          <span
            className="badge"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: 'var(--status-eliminated)',
              fontSize: 12,
            }}
          >
            {eliminatedPlayers.length} FALLEN
          </span>
        </div>
      </div>

      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        Public live town roster (Secret roles remain hidden during active play).
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: 10,
          maxHeight: 460,
          overflowY: 'auto',
        }}
      >
        {players.map((p) => {
          const isAlive = p.status === 'ALIVE';
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 14,
                background: isAlive ? 'rgba(255, 255, 255, 0.04)' : 'rgba(239, 68, 68, 0.05)',
                border: isAlive
                  ? '1px solid rgba(255, 255, 255, 0.08)'
                  : '1px solid rgba(239, 68, 68, 0.2)',
                opacity: isAlive ? 1 : 0.6,
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: isAlive ? 'rgba(0, 245, 155, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: isAlive ? 'var(--status-alive)' : 'var(--status-eliminated)',
                  fontSize: 12,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {p.seat_number || '•'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isAlive ? '#ffffff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    textDecoration: isAlive ? 'none' : 'line-through',
                  }}
                >
                  {p.display_name}
                </p>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: isAlive ? 'var(--status-alive)' : 'var(--status-eliminated)',
                  }}
                >
                  {isAlive ? 'ALIVE' : p.role || 'ELIMINATED'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
