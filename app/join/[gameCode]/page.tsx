'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function JoinGamePage({ params }: { params: { gameCode: string } }) {
  const router = useRouter();
  const gameCode = params.gameCode?.toUpperCase();

  const [displayName, setDisplayName] = useState('');
  const [tiktokUsername, setTiktokUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || displayName.trim().length < 2) {
      setErrorMsg('Display name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/games/${gameCode}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          display_name: displayName.trim(),
          tiktok_username: tiktokUsername.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to join game');
      }

      // Store player session in localStorage for automatic reconnect recovery (Rule 6)
      localStorage.setItem('mafia_player_session_id', data.session.id);
      localStorage.setItem('mafia_player_token', data.session.token);
      localStorage.setItem('mafia_player_id', data.player.id);
      localStorage.setItem('mafia_game_id', data.player.game_id);
      localStorage.setItem('mafia_game_code', gameCode);

      // Redirect to interactive player room
      router.push(`/play/${data.session.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to join game. Try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <main className="mobile-container">
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Game Badge Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44, marginBottom: 8 }}>🎭</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: -0.5, color: '#fff' }}>
            TikTok LIVE Mafia
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
            Join Room <strong style={{ color: 'var(--role-mafia)', letterSpacing: 1 }}>{gameCode}</strong>
          </p>
        </div>

        {/* Join Card Form */}
        <div className="glass-card">
          <form onSubmit={handleJoin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  color: '#fca5a5',
                  fontSize: 13,
                }}
              >
                {errorMsg}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                YOUR PLAYER NAME *
              </label>
              <input
                type="text"
                placeholder="e.g. Shadow, DetectiveDan"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={20}
                required
                className="form-input"
                autoFocus
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 6 }}>
                TIKTOK USERNAME (OPTIONAL)
              </label>
              <input
                type="text"
                placeholder="@yourusername"
                value={tiktokUsername}
                onChange={(e) => setTiktokUsername(e.target.value)}
                maxLength={30}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !displayName.trim()}
              className="btn-primary"
              style={{ marginTop: 8 }}
            >
              {isSubmitting ? 'JOINING ROOM...' : 'ENTER GAME LOBBY'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', marginTop: 24 }}>
          No account or password needed. All game roles and actions remain strictly private on your phone.
        </p>
      </div>
    </main>
  );
}
