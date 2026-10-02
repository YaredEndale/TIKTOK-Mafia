'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateGame = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create game');
      }
      router.push(`/admin/${data.game.id}`);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create room');
      setIsCreating(false);
    }
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setErrorMsg('Game code must be exactly 6 characters');
      return;
    }
    router.push(`/join/${code}`);
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        position: 'relative',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440, textAlign: 'center' }}>
        {/* Title & Badge */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>🎭</div>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: -0.5, color: '#fff' }}>
            TikTok LIVE Mafia
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, marginTop: 6 }}>
            Interactive real-time social deduction show for TikTok LIVE.
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              color: '#fca5a5',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            {errorMsg}
          </div>
        )}

        {/* Action Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Host Card */}
          <div className="glass-card" style={{ textAlign: 'left', borderLeft: '4px solid var(--role-mafia)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--role-mafia)', textTransform: 'uppercase' }}>
              HOST A LIVE SHOW
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 8px' }}>Moderator Control Room</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Launch a new game room, manage player rosters, control timers, and run night/day phases.
            </p>
            <button onClick={handleCreateGame} disabled={isCreating} className="btn-primary">
              {isCreating ? 'CREATING ROOM...' : '🎙️ CREATE NEW GAME ROOM'}
            </button>
          </div>

          {/* Player Card */}
          <div className="glass-card" style={{ textAlign: 'left', borderLeft: '4px solid var(--role-citizen)' }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--role-citizen)', textTransform: 'uppercase' }}>
              JOIN AS A PLAYER
            </span>
            <h3 style={{ fontSize: 18, fontWeight: 800, margin: '4px 0 8px' }}>Enter Room Code</h3>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
              Enter the 6-character room code shown on the TikTok LIVE stream.
            </p>
            <form onSubmit={handleJoin} style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                placeholder="e.g. ABC123"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="form-input"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: 2,
                  fontWeight: 800,
                  fontSize: 16,
                  textAlign: 'center',
                }}
              />
              <button
                type="submit"
                disabled={joinCode.trim().length !== 6}
                className="btn-primary"
                style={{
                  width: 'auto',
                  padding: '0 20px',
                  background: 'linear-gradient(135deg, #ffb703 0%, #fb8500 100%)',
                  color: '#000',
                }}
              >
                JOIN
              </button>
            </form>
          </div>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 32 }}>
          Built for OBS / Streamlabs Browser Source integration • 9:16 Vertical Broadcast Ready
        </p>
      </div>
    </main>
  );
}
