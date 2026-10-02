'use client';

import React from 'react';
import { CandidateTally } from '@/lib/game-engine';

interface VotingBarChartProps {
  tallies: CandidateTally[];
  totalVotesCast: number;
  alivePlayersCount: number;
  isVotingOpen: boolean;
  announcement?: string | null;
}

export const VotingBarChart: React.FC<VotingBarChartProps> = ({
  tallies,
  totalVotesCast,
  alivePlayersCount,
  isVotingOpen,
  announcement,
}) => {
  const maxVotes = tallies.length > 0 ? tallies[0].voteCount : 0;

  return (
    <div className="glass-card" style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <h4 style={{ fontSize: 16, fontWeight: 800 }}>Live Vote Tally</h4>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {totalVotesCast} of {alivePlayersCount} votes cast ({isVotingOpen ? 'Active' : 'Closed'})
          </span>
        </div>
        <span
          className="badge"
          style={{
            background: isVotingOpen ? 'rgba(255, 183, 3, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: isVotingOpen ? 'var(--role-citizen)' : '#ef4444',
          }}
        >
          {isVotingOpen ? 'BALLOT OPEN' : 'BALLOT CLOSED'}
        </span>
      </div>

      {announcement && (
        <div
          style={{
            padding: '8px 12px',
            borderRadius: 8,
            background: announcement.includes('TIED') ? 'rgba(239,68,68,0.15)' : 'rgba(0,245,155,0.15)',
            color: announcement.includes('TIED') ? '#fca5a5' : '#86efac',
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 12,
            textAlign: 'center',
          }}
        >
          {announcement}
        </div>
      )}

      {/* Bar Chart */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {tallies.map((candidate) => {
          const percentage = maxVotes > 0 ? (candidate.voteCount / maxVotes) * 100 : 0;
          const isLeader = maxVotes > 0 && candidate.voteCount === maxVotes;

          return (
            <div key={candidate.candidateId}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ fontWeight: isLeader ? 700 : 500, color: isLeader ? 'var(--role-citizen)' : '#fff' }}>
                  {candidate.candidateName}
                </span>
                <span style={{ fontWeight: 700 }}>
                  {candidate.voteCount} vote{candidate.voteCount === 1 ? '' : 's'}
                </span>
              </div>

              <div
                style={{
                  height: 12,
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: isLeader
                      ? 'linear-gradient(90deg, #ffb703 0%, #fb8500 100%)'
                      : 'rgba(255,255,255,0.2)',
                    borderRadius: 6,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
