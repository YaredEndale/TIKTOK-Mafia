'use client';

import React from 'react';
import { PublicPlayer } from '@/lib/game-engine';
import { OverlayTimer } from './OverlayTimer';

interface DiscussionOverlayProps {
  round: number;
  phaseEndsAt: string | null;
  players: PublicPlayer[];
  announcements?: string[];
}

export function DiscussionOverlay({
  round,
  phaseEndsAt,
  players,
  announcements = [],
}: DiscussionOverlayProps) {
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
      {/* Day Sun Icon & Header */}
      <div style={{ marginBottom: 12 }}>
        <div
          className="float-animation"
          style={{
            fontSize: 64,
            marginBottom: 8,
            filter: 'drop-shadow(0 0 35px rgba(255, 183, 3, 0.45))',
          }}
        >
          ☀️
        </div>
        <span
          className="badge"
          style={{
            background: 'var(--role-citizen-bg)',
            color: 'var(--role-citizen)',
            border: '1px solid rgba(255, 183, 3, 0.3)',
            fontSize: 14,
            padding: '6px 16px',
          }}
        >
          DAY {round} — DISCUSSION
        </span>
      </div>

      <h1
        style={{
          fontSize: 44,
          fontWeight: 900,
          letterSpacing: '-1px',
          textShadow: '0 0 30px rgba(255, 183, 3, 0.3)',
          marginBottom: 6,
        }}
      >
        WHO IS THE MAFIA?
      </h1>
      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Town members: state your alibis, review night clues, and prepare to vote!
      </p>

      {/* Morning Bulletin Announcement Card */}
      {announcements.length > 0 && (
        <div
          className="overlay-card"
          style={{
            width: '100%',
            padding: '14px 20px',
            marginBottom: 16,
            background: 'rgba(255, 183, 3, 0.08)',
            border: '1px solid rgba(255, 183, 3, 0.3)',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--role-citizen)' }}>
            🌅 MORNING REPORT:
          </span>
          <p style={{ fontSize: 15, fontWeight: 700, marginTop: 4, color: '#ffffff' }}>
            {announcements[0]}
          </p>
        </div>
      )}

      {/* Giant Discussion Timer */}
      <OverlayTimer phaseEndsAt={phaseEndsAt} label="DEBATE TIME REMAINING" />

      {/* Alive Podiums */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          marginTop: 10,
          background: 'rgba(20, 24, 38, 0.75)',
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
            ACTIVE ACCUSED & DEBATERS
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
                  background: isAlive ? 'rgba(255, 255, 255, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                  border: isAlive
                    ? '1px solid rgba(255, 255, 255, 0.12)'
                    : '1px solid rgba(239, 68, 68, 0.2)',
                  opacity: isAlive ? 1 : 0.4,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isAlive ? 'rgba(255, 183, 3, 0.25)' : 'rgba(239, 68, 68, 0.2)',
                    color: isAlive ? 'var(--role-citizen)' : 'var(--status-eliminated)',
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
