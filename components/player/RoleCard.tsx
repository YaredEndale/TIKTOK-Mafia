'use client';

import React from 'react';
import { PlayerRole } from '@/lib/game-engine';

interface RoleCardProps {
  role: PlayerRole | null;
  teammates?: { id: string; display_name: string }[];
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, teammates }) => {
  if (!role) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '28px 16px' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 15 }}>Waiting for role assignment...</p>
      </div>
    );
  }

  const getRoleDetails = (r: PlayerRole) => {
    switch (r) {
      case 'MAFIA':
        return {
          title: 'MAFIA',
          icon: '🩸',
          borderColor: 'var(--role-mafia)',
          badgeClass: 'badge-mafia',
          glow: 'var(--role-mafia-glow)',
          description: 'Conspire with your fellow Mafia to eliminate citizens at night and blend in during the day.',
          winCondition: 'Eliminate citizens until Mafia reaches equal or greater numbers.',
        };
      case 'DETECTIVE':
        return {
          title: 'DETECTIVE',
          icon: '🔍',
          borderColor: 'var(--role-detective)',
          badgeClass: 'badge-detective',
          glow: 'var(--role-detective-glow)',
          description: 'Each night, investigate one suspect to discover if they are a member of the Mafia.',
          winCondition: 'Identify the Mafia and guide the Village to eliminate them.',
        };
      case 'DOCTOR':
        return {
          title: 'DOCTOR',
          icon: '💉',
          borderColor: 'var(--role-doctor)',
          badgeClass: 'badge-doctor',
          glow: 'var(--role-doctor-glow)',
          description: 'Each night, protect one person from being eliminated. You can protect yourself once every 3 rounds.',
          winCondition: 'Keep the townspeople alive and eliminate the Mafia.',
        };
      case 'CITIZEN':
      default:
        return {
          title: 'CITIZEN',
          icon: '🛡️',
          borderColor: 'var(--role-citizen)',
          badgeClass: 'badge-citizen',
          glow: 'var(--role-citizen-glow)',
          description: 'Use deduction, observation, and daytime discussions to figure out who the Mafia are.',
          winCondition: 'Vote to eliminate all Mafia members.',
        };
    }
  };

  const details = getRoleDetails(role);

  return (
    <div
      className="glass-card"
      style={{
        borderLeft: `4px solid ${details.borderColor}`,
        boxShadow: `0 8px 32px ${details.glow}`,
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 20,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 32 }}>{details.icon}</span>
          <div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>
              Your Secret Identity
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: 0.5, color: details.borderColor }}>
              {details.title}
            </h2>
          </div>
        </div>
        <span className={`badge ${details.badgeClass}`}>CONFIDENTIAL</span>
      </div>

      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
        {details.description}
      </p>

      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          padding: '10px 14px',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <strong>Win Goal:</strong> {details.winCondition}
      </div>

      {/* Mafia Teammates List */}
      {role === 'MAFIA' && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--role-mafia)', textTransform: 'uppercase' }}>
            🩸 Your Fellow Mafia:
          </span>
          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {teammates && teammates.length > 0 ? (
              teammates.map((m) => (
                <span
                  key={m.id}
                  style={{
                    background: 'var(--role-mafia-bg)',
                    color: '#fff',
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    border: '1px solid rgba(255, 42, 95, 0.3)',
                    fontWeight: 600,
                  }}
                >
                  {m.display_name}
                </span>
              ))
            ) : (
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>You are the sole Mafia member.</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
