'use client';

import React from 'react';

interface AlivePlayer {
  id: string;
  display_name: string;
  seat_number: number | null;
}

interface DiscussionViewProps {
  round: number;
  alivePlayers: AlivePlayer[];
  dawnAnnouncement?: string | null;
}

export const DiscussionView: React.FC<DiscussionViewProps> = ({
  round,
  alivePlayers,
  dawnAnnouncement,
}) => {
  return (
    <div className="glass-card" style={{ marginBottom: 20 }}>
      {/* Dawn Announcement */}
      {dawnAnnouncement ? (
        <div
          style={{
            padding: '14px 16px',
            background: 'rgba(255, 42, 95, 0.15)',
            border: '1px solid rgba(255, 42, 95, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--role-mafia)', textTransform: 'uppercase' }}>
            Morning Bulletin
          </span>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginTop: 4 }}>
            {dawnAnnouncement}
          </p>
        </div>
      ) : (
        <div
          style={{
            padding: '12px 16px',
            background: 'rgba(0, 229, 255, 0.1)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: 'var(--role-detective)', fontWeight: 600 }}>
            ☀️ Dawn has broken over Day {round}. Discuss and find the Mafia!
          </span>
        </div>
      )}

      <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
        Surviving Players ({alivePlayers.length})
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
        {alivePlayers.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 12px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: 'rgba(0, 245, 155, 0.2)',
                color: 'var(--status-alive)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {p.seat_number ?? '#'}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {p.display_name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
