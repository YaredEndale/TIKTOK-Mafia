'use client';

import React, { useState } from 'react';

interface AlivePlayer {
  id: string;
  display_name: string;
  seat_number: number | null;
}

interface VotingViewProps {
  playerId: string;
  alivePlayers: AlivePlayer[];
  hasVoted: boolean;
  onVoteSubmitted: (targetId: string) => Promise<void>;
}

export const VotingView: React.FC<VotingViewProps> = ({
  playerId,
  alivePlayers,
  hasVoted,
  onVoteSubmitted,
}) => {
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(hasVoted);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const eligibleCandidates = alivePlayers.filter((p) => p.id !== playerId);

  const handleSubmit = async () => {
    if (!selectedCandidateId) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onVoteSubmitted(selectedCandidateId);
      setSubmitted(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to cast vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '36px 20px', borderLeft: '4px solid var(--role-citizen)' }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗳️</div>
        <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--role-citizen)', marginBottom: 8 }}>
          Vote Submitted & Locked
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5 }}>
          Your vote has been cast. The moderator and spectator overlay will reveal the vote results once voting closes.
        </p>
        <div style={{ marginTop: 20, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <span className="pulse-animation" style={{ width: 8, height: 8, borderRadius: '50%', background: '#ffb703' }} />
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Waiting for voting to end...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card" style={{ marginBottom: 20 }}>
      <div style={{ marginBottom: 16 }}>
        <span className="badge badge-citizen" style={{ marginBottom: 6 }}>TOWN TRIAL</span>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>
          Cast Your Elimination Vote
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Select the player you suspect is in the Mafia. Self-voting is prohibited. Votes cannot be changed once submitted.
        </p>
      </div>

      {errorMsg && (
        <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef4444', padding: '8px 12px', borderRadius: 8, color: '#fca5a5', fontSize: 13, marginBottom: 12 }}>
          {errorMsg}
        </div>
      )}

      {/* Candidate List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {eligibleCandidates.map((candidate) => {
          const isSelected = selectedCandidateId === candidate.id;

          return (
            <div
              key={candidate.id}
              onClick={() => setSelectedCandidateId(candidate.id)}
              className="glass-card-interactive"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 'var(--radius-md)',
                background: isSelected ? 'rgba(255, 183, 3, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: isSelected ? '2px solid var(--role-citizen)' : '1px solid var(--border-subtle)',
                boxShadow: isSelected ? '0 0 16px var(--role-citizen-glow)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isSelected ? 'var(--role-citizen)' : 'rgba(255,255,255,0.08)',
                    color: isSelected ? '#000' : '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  {candidate.seat_number ?? '#'}
                </div>
                <span style={{ fontSize: 16, fontWeight: isSelected ? 700 : 500 }}>
                  {candidate.display_name}
                </span>
              </div>

              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  border: isSelected ? '6px solid var(--role-citizen)' : '2px solid var(--text-muted)',
                  background: 'transparent',
                }}
              />
            </div>
          );
        })}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!selectedCandidateId || isSubmitting}
        className="btn-primary"
        style={{
          background: 'linear-gradient(135deg, #ffb703 0%, #fb8500 100%)',
          color: '#000',
          boxShadow: selectedCandidateId ? '0 4px 20px rgba(255, 183, 3, 0.4)' : 'none',
        }}
      >
        {isSubmitting ? 'Submitting...' : 'SUBMIT VOTE'}
      </button>
    </div>
  );
};
