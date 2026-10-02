'use client';

import React, { useState } from 'react';
import { PlayerRole } from '@/lib/game-engine';

interface TargetPlayer {
  id: string;
  display_name: string;
  seat_number: number | null;
}

interface InvestigationRecord {
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

interface NightActionViewProps {
  gameId: string;
  playerId: string;
  role: PlayerRole;
  alivePlayers: TargetPlayer[];
  teammates?: { id: string; display_name: string }[];
  investigationHistory?: InvestigationRecord[];
  hasActed: boolean;
  canDoctorSelfProtect?: boolean;
  onActionSubmitted: (action: 'KILL' | 'PROTECT' | 'INVESTIGATE', targetId: string) => Promise<void>;
}

export const NightActionView: React.FC<NightActionViewProps> = ({
  playerId,
  role,
  alivePlayers,
  teammates = [],
  investigationHistory = [],
  hasActed,
  canDoctorSelfProtect = true,
  onActionSubmitted,
}) => {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasActed);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // CITIZEN VIEW: No night actions
  if (role === 'CITIZEN') {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px' }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🌙</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>
          Night Has Fallen
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
          The town is asleep. The Mafia and special roles are making their moves in the shadows. Wait for dawn to break.
        </p>
        <div style={{ marginTop: 24, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-animation" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ffb703' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Waiting for morning...</span>
        </div>
      </div>
    );
  }

  // Filter available targets based on role
  let targetablePlayers = [...alivePlayers];

  if (role === 'MAFIA') {
    // Mafia cannot target fellow Mafia or self
    const mafiaIds = new Set([playerId, ...teammates.map((m) => m.id)]);
    targetablePlayers = targetablePlayers.filter((p) => !mafiaIds.has(p.id));
  } else if (role === 'DETECTIVE') {
    // Detective investigates others
    targetablePlayers = targetablePlayers.filter((p) => p.id !== playerId);
  } else if (role === 'DOCTOR') {
    // Doctor can protect others, and can protect self only if cooldown allows
    if (!canDoctorSelfProtect) {
      targetablePlayers = targetablePlayers.filter((p) => p.id !== playerId);
    }
  }

  const getActionConfig = () => {
    switch (role) {
      case 'MAFIA':
        return {
          title: 'Mafia Night Kill',
          subtitle: 'Choose an innocent citizen to eliminate tonight.',
          action: 'KILL' as const,
          btnText: 'CONFIRM KILL TARGET',
          btnClass: 'btn-primary',
          themeColor: 'var(--role-mafia)',
        };
      case 'DOCTOR':
        return {
          title: 'Doctor Night Protection',
          subtitle: canDoctorSelfProtect
            ? 'Choose a player to protect from death tonight.'
            : 'Self-protect is on cooldown. Choose another player to protect.',
          action: 'PROTECT' as const,
          btnText: 'PROTECT THIS PLAYER',
          btnClass: 'btn-primary',
          themeColor: 'var(--role-doctor)',
        };
      case 'DETECTIVE':
        return {
          title: 'Detective Investigation',
          subtitle: 'Investigate a suspect to uncover if they are in the Mafia.',
          action: 'INVESTIGATE' as const,
          btnText: 'INVESTIGATE SUSPECT',
          btnClass: 'btn-primary',
          themeColor: 'var(--role-detective)',
        };
      default:
        return null;
    }
  };

  const config = getActionConfig();
  if (!config) return null;

  const handleSubmit = async () => {
    if (!selectedTargetId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onActionSubmitted(config.action, selectedTargetId);
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to submit night action');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '32px 20px', borderLeft: `4px solid ${config.themeColor}` }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <h3 style={{ fontSize: 19, fontWeight: 700, color: config.themeColor, marginBottom: 6 }}>
          Action Confirmed & Locked
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Your night action has been recorded. Wait for the night timer to finish and dawn to break.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ borderLeft: `4px solid ${config.themeColor}`, marginBottom: 20 }}>
      <h3 style={{ fontSize: 18, fontWeight: 700, color: config.themeColor, marginBottom: 4 }}>
        {config.title}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        {config.subtitle}
      </p>

      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', padding: '8px 12px', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      {/* Target Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {targetablePlayers.map((player) => {
          const isSelected = selectedTargetId === player.id;
          const isSelf = player.id === playerId;

          return (
            <div
              key={player.id}
              onClick={() => setSelectedTargetId(player.id)}
              className="glass-card-interactive"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? `2px solid ${config.themeColor}` : '1px solid var(--border-subtle)',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isSelected ? config.themeColor : 'rgba(255,255,255,0.1)',
                    color: isSelected ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {player.seat_number ?? '#'}
                </div>
                <span style={{ fontSize: 15, fontWeight: isSelected ? 700 : 500 }}>
                  {player.display_name} {isSelf && '(You)'}
                </span>
              </div>

              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: isSelected ? `6px solid ${config.themeColor}` : '2px solid var(--text-muted)',
                  background: 'transparent',
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedTargetId || isSubmitting}
        className={config.btnClass}
        style={{
          background: `linear-gradient(135deg, ${config.themeColor} 0%, #111 250%)`,
          color: '#ffffff',
          boxShadow: selectedTargetId ? `0 4px 16px ${config.themeColor}55` : 'none',
        }}
      >
        {isSubmitting ? 'Confirming...' : config.btnText}
      </button>

      {/* Detective Investigation History Card */}
      {role === 'DETECTIVE' && investigationHistory.length > 0 && (
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
            Investigation Log:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {investigationHistory.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 13,
                }}
              >
                <span>{item.targetName}</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: item.isMafia ? 'var(--role-mafia)' : 'var(--role-doctor)',
                  }}
                >
                  {item.isMafia ? '🩸 MAFIA' : '🛡️ NOT MAFIA'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
