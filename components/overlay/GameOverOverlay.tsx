'use client';

import React from 'react';
import { GameWinner, PublicPlayer } from '@/lib/game-engine';

interface GameOverOverlayProps {
  winner: GameWinner | null;
  round: number;
  players: PublicPlayer[];
}

export function GameOverOverlay({ winner, round, players }: GameOverOverlayProps) {
  const isMafiaWin = winner === 'MAFIA';

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
      {/* Trophy & Winner Badge */}
      <div style={{ marginBottom: 16 }}>
        <div
          className="float-animation"
          style={{
            fontSize: 72,
            marginBottom: 8,
            filter: isMafiaWin
              ? 'drop-shadow(0 0 40px var(--role-mafia-glow))'
              : 'drop-shadow(0 0 40px var(--role-citizen-glow))',
          }}
        >
          {isMafiaWin ? '🔪' : '🏆'}
        </div>
        <span
          className="badge"
          style={{
            background: isMafiaWin ? 'var(--role-mafia-bg)' : 'var(--role-citizen-bg)',
            color: isMafiaWin ? 'var(--role-mafia)' : 'var(--role-citizen)',
            border: `1px solid ${isMafiaWin ? 'rgba(255, 42, 95, 0.4)' : 'rgba(255, 183, 3, 0.4)'}`,
            fontSize: 14,
            padding: '6px 20px',
          }}
        >
          GAME COMPLETED IN ROUND {round}
        </span>
      </div>

      <h1
        style={{
          fontSize: 52,
          fontWeight: 900,
          letterSpacing: '-1px',
          color: isMafiaWin ? 'var(--role-mafia)' : 'var(--role-citizen)',
          textShadow: isMafiaWin
            ? '0 0 40px var(--role-mafia-glow)'
            : '0 0 40px var(--role-citizen-glow)',
          marginBottom: 8,
        }}
      >
        {isMafiaWin ? 'MAFIA WINS' : 'CITIZENS WIN'}
      </h1>

      <p style={{ fontSize: 16, color: 'var(--text-secondary)', maxWidth: 440, marginBottom: 28 }}>
        {isMafiaWin
          ? 'The Mafia eliminated all town defense and took control of the city!'
          : 'All Mafia infiltrators were discovered and brought to justice! Peace is restored.'}
      </p>

      {/* Post-Game Full Roster Review */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          background: 'rgba(15, 18, 28, 0.85)',
          maxHeight: 440,
          overflowY: 'auto',
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
            FINAL TOWN IDENTITIES
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            ALL ROLES REVEALED
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {players.map((p) => {
            const isAlive = p.status === 'ALIVE';
            const role = p.role;
            const isMafia = role === 'MAFIA';

            return (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 14,
                  background: isMafia ? 'rgba(255, 42, 95, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isMafia
                    ? '1px solid rgba(255, 42, 95, 0.3)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isAlive ? 'rgba(0, 245, 155, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: isAlive ? 'var(--status-alive)' : 'var(--status-eliminated)',
                      fontSize: 12,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {p.seat_number || '•'}
                  </div>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>
                      {p.display_name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        marginLeft: 8,
                        color: isAlive ? 'var(--status-alive)' : 'var(--text-muted)',
                      }}
                    >
                      {isAlive ? 'SURVIVOR' : 'FALLEN'}
                    </span>
                  </div>
                </div>

                <span
                  className="badge"
                  style={{
                    background:
                      role === 'MAFIA'
                        ? 'var(--role-mafia-bg)'
                        : role === 'DETECTIVE'
                        ? 'var(--role-detective-bg)'
                        : role === 'DOCTOR'
                        ? 'var(--role-doctor-bg)'
                        : 'var(--role-citizen-bg)',
                    color:
                      role === 'MAFIA'
                        ? 'var(--role-mafia)'
                        : role === 'DETECTIVE'
                        ? 'var(--role-detective)'
                        : role === 'DOCTOR'
                        ? 'var(--role-doctor)'
                        : 'var(--role-citizen)',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  {role || 'CITIZEN'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
