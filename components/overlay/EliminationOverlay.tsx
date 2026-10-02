'use client';

import React from 'react';
import { PlayerRole, PublicPlayer } from '@/lib/game-engine';

interface EliminationOverlayProps {
  player: PublicPlayer | null;
  revealedRole: PlayerRole | null;
  reason?: string;
  round: number;
}

export function EliminationOverlay({
  player,
  revealedRole,
  reason,
  round,
}: EliminationOverlayProps) {
  const getRoleCardDetails = (role: PlayerRole | null) => {
    switch (role) {
      case 'MAFIA':
        return {
          title: 'MAFIA MEMBER',
          color: 'var(--role-mafia)',
          bg: 'rgba(255, 42, 95, 0.15)',
          border: 'rgba(255, 42, 95, 0.5)',
          icon: '🔪',
          desc: 'A ruthless killer has been eliminated!',
        };
      case 'DETECTIVE':
        return {
          title: 'DETECTIVE',
          color: 'var(--role-detective)',
          bg: 'rgba(0, 229, 255, 0.15)',
          border: 'rgba(0, 229, 255, 0.5)',
          icon: '🔍',
          desc: 'The town has lost their sharpest investigator!',
        };
      case 'DOCTOR':
        return {
          title: 'DOCTOR',
          color: 'var(--role-doctor)',
          bg: 'rgba(0, 245, 155, 0.15)',
          border: 'rgba(0, 245, 155, 0.5)',
          icon: '💉',
          desc: 'The town has lost their only protector!',
        };
      case 'CITIZEN':
      default:
        return {
          title: 'INNOCENT CITIZEN',
          color: 'var(--role-citizen)',
          bg: 'rgba(255, 183, 3, 0.15)',
          border: 'rgba(255, 183, 3, 0.5)',
          icon: '👥',
          desc: 'An innocent soul was taken!',
        };
    }
  };

  const roleCard = getRoleCardDetails(revealedRole);

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
      {/* Dramatic Skull Animation */}
      <div
        className="skull-animation"
        style={{
          fontSize: 92,
          marginBottom: 16,
          filter: 'drop-shadow(0 0 40px rgba(239, 68, 68, 0.6))',
        }}
      >
        💀
      </div>

      <span
        className="badge"
        style={{
          background: 'rgba(239, 68, 68, 0.2)',
          color: 'var(--status-eliminated)',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          fontSize: 14,
          padding: '6px 20px',
          marginBottom: 12,
        }}
      >
        ROUND {round} — PLAYER ELIMINATED
      </span>

      <h1
        style={{
          fontSize: 48,
          fontWeight: 900,
          letterSpacing: '-1px',
          textShadow: '0 0 35px rgba(239, 68, 68, 0.5)',
          marginBottom: 6,
        }}
      >
        {player ? player.display_name : 'A CITIZEN'}
      </h1>

      <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 28 }}>
        {reason || 'Eliminated by decision of the town'}
      </p>

      {/* Role Revealed Card */}
      {revealedRole && (
        <div
          className="overlay-card skull-animation"
          style={{
            width: '100%',
            maxWidth: 420,
            padding: '28px 24px',
            background: roleCard.bg,
            border: `2px solid ${roleCard.border}`,
            boxShadow: `0 0 40px ${roleCard.color}40`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span style={{ fontSize: 44 }}>{roleCard.icon}</span>
          <div>
            <span
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: '2px',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              TRUE IDENTITY REVEALED
            </span>
            <h2
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: '1px',
                color: roleCard.color,
                marginTop: 4,
              }}
            >
              {roleCard.title}
            </h2>
          </div>
          <p style={{ fontSize: 14, color: '#ffffff', opacity: 0.9 }}>
            {roleCard.desc}
          </p>
        </div>
      )}
    </div>
  );
}
