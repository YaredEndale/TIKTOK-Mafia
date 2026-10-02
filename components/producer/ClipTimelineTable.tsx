'use client';

import React, { useState } from 'react';
import { ClipMarker } from '@/lib/game-engine';

interface ClipTimelineTableProps {
  clips: ClipMarker[];
  gameStartedAt?: string | null;
}

export function ClipTimelineTable({ clips, gameStartedAt }: ClipTimelineTableProps) {
  const [copiedType, setCopiedType] = useState<'md' | 'json' | null>(null);

  // Format relative timestamp from game start
  const formatOffset = (clipTime: string) => {
    if (!gameStartedAt) {
      return new Date(clipTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    const diffMs = Math.max(0, new Date(clipTime).getTime() - new Date(gameStartedAt).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return `+${m}:${s.toString().padStart(2, '0')}`;
  };

  const copyMarkdown = () => {
    const lines = [
      '# TikTok LIVE Mafia — Marked Clip Moments',
      '',
      '| Time | Category | Description |',
      '|---|---|---|',
      ...clips.map(
        (c) =>
          `| ${formatOffset(c.timestamp)} | **${c.category}** | ${c.description || '-'} |`
      ),
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedType('md');
    setTimeout(() => setCopiedType(null), 2000);
  };

  const copyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(clips, null, 2));
    setCopiedType('json');
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="glass-card" style={{ padding: 22, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>🎬</span>
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>Clip Timeline</h2>
          <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.08)' }}>
            {clips.length} {clips.length === 1 ? 'MOMENT' : 'MOMENTS'}
          </span>
        </div>

        {/* Export Buttons */}
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={copyMarkdown}
            disabled={clips.length === 0}
            className="btn-secondary"
            style={{ width: 'auto', minHeight: 34, height: 34, padding: '0 12px', fontSize: 11 }}
          >
            {copiedType === 'md' ? '✓ Copied Markdown!' : '📋 Copy MD Table'}
          </button>
          <button
            onClick={copyJson}
            disabled={clips.length === 0}
            className="btn-secondary"
            style={{ width: 'auto', minHeight: 34, height: 34, padding: '0 12px', fontSize: 11 }}
          >
            {copiedType === 'json' ? '✓ Copied JSON!' : '{ } Copy JSON'}
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {clips.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            color: 'var(--text-muted)',
            fontSize: 14,
          }}
        >
          No clips marked yet. Click any quick tag to record dramatic moments!
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            overflowY: 'auto',
            maxHeight: 460,
          }}
        >
          {clips.map((clip) => (
            <div
              key={clip.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(255, 42, 95, 0.15)',
                      color: 'var(--role-mafia)',
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    {clip.category}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    HIGHLIGHT
                  </span>
                </div>
                <p style={{ fontSize: 14, fontWeight: 600, color: '#ffffff', marginTop: 2 }}>
                  {clip.description || 'Marked moment'}
                </p>
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                  color: 'var(--role-detective)',
                  background: 'rgba(0, 229, 255, 0.1)',
                  padding: '4px 8px',
                  borderRadius: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {formatOffset(clip.timestamp)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
