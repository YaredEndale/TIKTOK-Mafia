'use client';

import React, { useState } from 'react';

interface AnnouncementConsoleProps {
  onSendAnnouncement: (message: string) => Promise<void>;
  recentAnnouncements?: { id: string; message: string; timestamp: string }[];
}

const PRESETS = [
  '🔥 30 SECONDS LEFT TO VOTE!',
  '👀 CHAT: WHO IS THE MAFIA? DROP NUMBERS IN CHAT!',
  '⚡ DRAMA ALERT: BLUFF CALLED OUT!',
  '🎁 TAP THE SCREEN & SHARE THE LIVE!',
  '🚨 TIE IMMINENT! LAST SECONDS TO BREAK!',
];

export function AnnouncementConsole({
  onSendAnnouncement,
  recentAnnouncements = [],
}: AnnouncementConsoleProps) {
  const [customMessage, setCustomMessage] = useState('');
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleBroadcast = async (msg: string) => {
    if (!msg.trim()) return;
    try {
      setIsBroadcasting(true);
      await onSendAnnouncement(msg.trim());
      setCustomMessage('');
      setFeedback('✓ Broadcasted to Overlay!');
      setTimeout(() => setFeedback(null), 2500);
    } finally {
      setIsBroadcasting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 20 }}>📢</span>
          <h2 style={{ fontSize: 17, fontWeight: 900 }}>Live Stream Overlay Announcement</h2>
        </div>
        {feedback && (
          <span
            className="badge"
            style={{
              background: 'var(--role-doctor-bg)',
              color: 'var(--role-doctor)',
              fontSize: 12,
            }}
          >
            {feedback}
          </span>
        )}
      </div>

      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
        Broadcasts an immediate glowing banner onto the 9:16 stream overlay for viewers.
      </p>

      {/* Preset Quick Announcements */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {PRESETS.map((preset) => (
          <button
            key={preset}
            onClick={() => handleBroadcast(preset)}
            disabled={isBroadcasting}
            style={{
              background: 'rgba(255, 42, 95, 0.1)',
              border: '1px solid rgba(255, 42, 95, 0.25)',
              borderRadius: 12,
              padding: '6px 12px',
              fontSize: 12,
              fontWeight: 700,
              color: '#ffffff',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s ease',
            }}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Custom Broadcast Input */}
      <div style={{ display: 'flex', gap: 10 }}>
        <input
          type="text"
          value={customMessage}
          onChange={(e) => setCustomMessage(e.target.value)}
          placeholder="Custom broadcast ticker (max 100 chars)..."
          maxLength={100}
          className="form-input"
          style={{ flex: 1, minHeight: 46, height: 46, fontSize: 14 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleBroadcast(customMessage);
          }}
        />
        <button
          onClick={() => handleBroadcast(customMessage)}
          disabled={isBroadcasting || !customMessage.trim()}
          className="btn-primary"
          style={{
            width: 'auto',
            minHeight: 46,
            height: 46,
            padding: '0 20px',
            fontSize: 14,
            whiteSpace: 'nowrap',
            background: 'linear-gradient(135deg, #00e5ff 0%, #0088cc 100%)',
            boxShadow: '0 4px 16px rgba(0, 229, 255, 0.35)',
          }}
        >
          {isBroadcasting ? 'Broadcasting...' : '📢 Broadcast'}
        </button>
      </div>

      {/* Recent Announcements */}
      {recentAnnouncements.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-muted)' }}>
            RECENT BROADCASTS
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6, maxHeight: 110, overflowY: 'auto' }}>
            {recentAnnouncements.slice(0, 4).map((ann) => (
              <div
                key={ann.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 10px',
                  borderRadius: 8,
                  background: 'rgba(255, 255, 255, 0.03)',
                  fontSize: 12,
                }}
              >
                <span style={{ color: '#ffffff' }}>{ann.message}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                  {new Date(ann.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
