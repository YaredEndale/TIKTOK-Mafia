'use client';

import React from 'react';
import { CandidateTally, PublicPlayer } from '@/lib/game-engine';
import { OverlayTimer } from './OverlayTimer';

interface VotingOverlayProps {
  phaseEndsAt: string | null;
  players: PublicPlayer[];
  tallies?: CandidateTally[];
  totalVotesCast?: number;
}

export function VotingOverlay({
  phaseEndsAt,
  players,
  tallies = [],
  totalVotesCast = 0,
}: VotingOverlayProps) {
  const alivePlayers = players.filter((p) => p.status === 'ALIVE');

  // Map candidates to include all alive players even if 0 votes
  const candidateRows = alivePlayers.map((p) => {
    const tally = tallies.find((t) => t.candidateId === p.id);
    const voteCount = tally ? tally.voteCount : 0;
    const percentage = totalVotesCast > 0 ? Math.round((voteCount / totalVotesCast) * 100) : 0;
    return {
      id: p.id,
      name: p.display_name,
      seatNumber: p.seat_number,
      votes: voteCount,
      percentage,
    };
  });

  // Sort descending by votes received
  candidateRows.sort((a, b) => b.votes - a.votes);
  const highestVotes = candidateRows[0]?.votes || 0;

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
      {/* Voting Badge & Header */}
      <div style={{ marginBottom: 12 }}>
        <span
          className="badge"
          style={{
            background: 'var(--role-mafia-bg)',
            color: 'var(--role-mafia)',
            border: '1px solid rgba(255, 42, 95, 0.4)',
            fontSize: 14,
            padding: '6px 18px',
            marginBottom: 8,
          }}
        >
          🗳️ LIVE ELIMINATION VOTE
        </span>
        <h1
          style={{
            fontSize: 44,
            fontWeight: 900,
            letterSpacing: '-1px',
            textShadow: '0 0 35px var(--role-mafia-glow)',
            marginTop: 8,
          }}
        >
          WHO SHOULD LEAVE?
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)' }}>
          Cast your vote on your mobile device now!
        </p>
      </div>

      {/* Giant Voting Timer */}
      <OverlayTimer phaseEndsAt={phaseEndsAt} label="VOTING CLOSES IN" />

      {/* Live Vote Progress Bar */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          padding: '16px 20px',
          marginBottom: 16,
          background: 'rgba(255, 42, 95, 0.08)',
          border: '1px solid rgba(255, 42, 95, 0.3)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>
            VOTES RECORDED
          </span>
          <span style={{ fontSize: 14, fontWeight: 900, color: 'var(--role-mafia)' }}>
            {totalVotesCast} / {alivePlayers.length} CAST
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 8,
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: 9999,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${alivePlayers.length > 0 ? (totalVotesCast / alivePlayers.length) * 100 : 0}%`,
              background: 'linear-gradient(90deg, #ff2a5f, #ffb703)',
              borderRadius: 9999,
              transition: 'width 0.4s ease-out',
            }}
          />
        </div>
      </div>

      {/* Candidate Live Vote Tallies */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          background: 'rgba(15, 18, 28, 0.85)',
          maxHeight: 460,
          overflowY: 'auto',
        }}
      >
        {candidateRows.map((candidate) => {
          const isLeader = candidate.votes > 0 && candidate.votes === highestVotes;
          return (
            <div
              key={candidate.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                padding: '10px 14px',
                borderRadius: 14,
                background: isLeader ? 'rgba(255, 42, 95, 0.14)' : 'rgba(255, 255, 255, 0.03)',
                border: isLeader
                  ? '1px solid rgba(255, 42, 95, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: isLeader ? '0 0 15px var(--role-mafia-glow)' : 'none',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 26,
                      height: 26,
                      borderRadius: '50%',
                      background: isLeader ? 'var(--role-mafia)' : 'rgba(255, 255, 255, 0.1)',
                      color: isLeader ? '#ffffff' : 'var(--text-secondary)',
                      fontSize: 12,
                      fontWeight: 900,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {candidate.seatNumber}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: '#ffffff' }}>
                    {candidate.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    {candidate.percentage}%
                  </span>
                  <span
                    className="badge"
                    style={{
                      background: candidate.votes > 0 ? 'rgba(255, 42, 95, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      color: candidate.votes > 0 ? 'var(--role-mafia)' : 'var(--text-muted)',
                      fontSize: 13,
                      fontWeight: 900,
                      padding: '4px 10px',
                    }}
                  >
                    {candidate.votes} {candidate.votes === 1 ? 'VOTE' : 'VOTES'}
                  </span>
                </div>
              </div>

              {/* Individual Bar */}
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderRadius: 9999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${candidate.percentage}%`,
                    background: isLeader ? 'var(--role-mafia)' : 'rgba(255, 255, 255, 0.4)',
                    borderRadius: 9999,
                    transition: 'width 0.4s ease-out',
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
