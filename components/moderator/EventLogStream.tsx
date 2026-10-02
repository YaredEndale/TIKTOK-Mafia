'use client';

import React from 'react';
import { GameEvent } from '@/lib/game-engine';

interface EventLogStreamProps {
  events: GameEvent[];
}

export const EventLogStream: React.FC<EventLogStreamProps> = ({ events }) => {
  const getEventTag = (type: string) => {
    if (type.includes('OVERRIDE')) return { color: '#f59e0b', label: 'OVERRIDE' };
    if (type.includes('ELIMINATED')) return { color: '#ef4444', label: 'ELIMINATION' };
    if (type.includes('VOTE')) return { color: '#ffb703', label: 'VOTE' };
    if (type.includes('NIGHT')) return { color: '#818cf8', label: 'NIGHT' };
    if (type.includes('DAY') || type.includes('DISCUSSION')) return { color: '#00e5ff', label: 'DAY' };
    if (type.includes('WIN') || type.includes('ENDED')) return { color: '#00f59b', label: 'OUTCOME' };
    return { color: '#94a3b8', label: 'SYSTEM' };
  };

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h4 style={{ fontSize: 16, fontWeight: 800 }}>Audit Event Timeline</h4>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
          {events.length} Events
        </span>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column-reverse', // Most recent at top
          gap: 6,
          maxHeight: 280,
          paddingRight: 4,
        }}
      >
        {events.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            No events recorded yet.
          </p>
        ) : (
          events.map((e) => {
            const tag = getEventTag(e.type);
            const time = new Date(e.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            return (
              <div
                key={e.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 6,
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: 12,
                }}
              >
                <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: 11, minWidth: 55 }}>
                  {time}
                </span>

                <span
                  style={{
                    padding: '1px 6px',
                    borderRadius: 4,
                    background: `${tag.color}22`,
                    color: tag.color,
                    fontWeight: 700,
                    fontSize: 10,
                  }}
                >
                  {tag.label}
                </span>

                <span style={{ flex: 1, color: 'var(--text-secondary)', wordBreak: 'break-word' }}>
                  <strong style={{ color: '#fff' }}>{e.type}</strong>
                  {e.metadata && Object.keys(e.metadata).length > 0 && (
                    <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                      {JSON.stringify(e.metadata).slice(0, 80)}
                    </span>
                  )}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
