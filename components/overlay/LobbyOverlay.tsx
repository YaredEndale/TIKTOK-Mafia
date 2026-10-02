'use client';

import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { PublicPlayer } from '@/lib/game-engine';

interface LobbyOverlayProps {
  gameCode: string;
  players: PublicPlayer[];
  maxPlayers?: number;
}

export function LobbyOverlay({ gameCode, players, maxPlayers = 12 }: LobbyOverlayProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mafia-pi-one.vercel.app';
    const joinUrl = `${origin}/join/${gameCode}`;

    QRCode.toDataURL(joinUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#00000000', // Transparent
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [gameCode]);

  const minPlayers = 5;
  const isReady = players.length >= minPlayers;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        maxWidth: 420,
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: 16 }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 900,
            letterSpacing: '-0.5px',
            lineHeight: 1.1,
            textShadow: '0 0 30px rgba(255, 42, 95, 0.4)',
          }}
        >
          TIKTOK LIVE <span style={{ color: 'var(--role-mafia)' }}>MAFIA</span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
          Scan QR to join as a player!
        </p>
      </div>

      {/* QR Code & Room Code Card */}
      <div
        className="overlay-card"
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '20px 16px',
          marginBottom: 20,
          background: 'rgba(255, 255, 255, 0.04)',
          border: '2px solid rgba(255, 42, 95, 0.5)',
          boxShadow: '0 0 35px var(--role-mafia-glow)',
          borderRadius: 20,
        }}
      >
        {qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodeDataUrl}
            alt="Join Game QR Code"
            style={{ width: 160, height: 160, borderRadius: 12, marginBottom: 12 }}
          />
        ) : (
          <div
            style={{
              width: 160,
              height: 160,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Generating QR...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1px' }}>
            OR ENTER GAME CODE:
          </span>
          <span
            style={{
              fontSize: 36,
              fontWeight: 900,
              letterSpacing: '5px',
              color: '#ffffff',
              textShadow: '0 0 20px rgba(255, 255, 255, 0.6)',
            }}
          >
            {gameCode}
          </span>
        </div>
      </div>

      {/* Players Joined Roster (Shows ONLY Joined Players) */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            padding: '0 4px',
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-secondary)' }}>
            PLAYERS JOINED ({players.length}/{maxPlayers})
          </span>
          <span
            className="badge"
            style={{
              background: isReady ? 'var(--role-doctor-bg)' : 'rgba(255, 183, 3, 0.15)',
              color: isReady ? 'var(--role-doctor)' : '#ffb703',
              border: `1px solid ${isReady ? 'var(--role-doctor)' : '#ffb703'}40`,
              fontSize: 11,
              padding: '3px 10px',
            }}
          >
            {isReady ? '✓ READY TO START' : `NEED ${minPlayers - players.length} MORE`}
          </span>
        </div>

        {players.length === 0 ? (
          <div
            style={{
              padding: '16px',
              color: 'var(--text-muted)',
              fontSize: 13,
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 12,
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            Waiting for players to scan QR code...
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 8,
              maxHeight: 240,
              overflowY: 'auto',
            }}
          >
            {players.map((player, idx) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 12,
                  background: 'rgba(0, 245, 155, 0.12)',
                  border: '1px solid rgba(0, 245, 155, 0.35)',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: 'var(--role-doctor)',
                    color: '#000000',
                    fontSize: 11,
                    fontWeight: 900,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {player.seat_number ?? idx + 1}
                </div>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: '#ffffff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {player.display_name}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
