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
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://mafia.chewata.com';
    const joinUrl = `${origin}/join/${gameCode}`;

    QRCode.toDataURL(joinUrl, {
      width: 260,
      margin: 1,
      color: {
        dark: '#ffffff',
        light: '#00000000', // Transparent background
      },
    })
      .then((url) => setQrCodeDataUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [gameCode]);

  // Generate slots for max players (5-12)
  const slots = Array.from({ length: maxPlayers }).map((_, idx) => {
    const seatNum = idx + 1;
    const player = players.find((p) => p.seat_number === seatNum) || players[idx];
    return {
      seatNumber: seatNum,
      player: player || null,
    };
  });

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
      {/* Title & Brand Badge */}
      <div style={{ marginBottom: 20 }}>
        <span
          className="badge"
          style={{
            background: 'var(--role-mafia-bg)',
            color: 'var(--role-mafia)',
            border: '1px solid rgba(255, 42, 95, 0.4)',
            fontSize: 13,
            padding: '6px 16px',
            marginBottom: 12,
          }}
        >
          🎭 SOCIAL DEDUCTION SHOW
        </span>
        <h1
          style={{
            fontSize: 48,
            fontWeight: 900,
            letterSpacing: '-1px',
            lineHeight: 1.1,
            textShadow: '0 0 40px rgba(255, 255, 255, 0.25)',
          }}
        >
          TIKTOK LIVE <span style={{ color: 'var(--role-mafia)' }}>MAFIA</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginTop: 6 }}>
          Scan to join as a player on your phone!
        </p>
      </div>

      {/* Center QR Code Container */}
      <div
        className="overlay-card"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: 24,
          marginBottom: 28,
          background: 'rgba(255, 255, 255, 0.05)',
          border: '2px solid rgba(255, 42, 95, 0.4)',
          boxShadow: '0 0 35px var(--role-mafia-glow)',
        }}
      >
        {qrCodeDataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={qrCodeDataUrl}
            alt="Join Game QR Code"
            style={{ width: 180, height: 180, borderRadius: 12, marginBottom: 16 }}
          />
        ) : (
          <div
            style={{
              width: 180,
              height: 180,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)',
            }}
          >
            Generating QR...
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', letterSpacing: '1px' }}>
            OR ENTER GAME CODE:
          </span>
          <span
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: '4px',
              color: '#ffffff',
              textShadow: '0 0 15px rgba(255, 255, 255, 0.5)',
            }}
          >
            {gameCode}
          </span>
        </div>
      </div>

      {/* Player Roster Grid */}
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 12,
            padding: '0 4px',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-secondary)' }}>
            LOBBY PLAYERS
          </span>
          <span
            className="badge"
            style={{
              background: players.length >= 5 ? 'var(--role-doctor-bg)' : 'rgba(255, 255, 255, 0.08)',
              color: players.length >= 5 ? 'var(--role-doctor)' : 'var(--text-muted)',
              fontSize: 12,
            }}
          >
            {players.length} / {maxPlayers} READY (MIN 5)
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 10,
          }}
        >
          {slots.map(({ seatNumber, player }) => (
            <div
              key={seatNumber}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 12px',
                borderRadius: 14,
                background: player ? 'rgba(0, 245, 155, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                border: player
                  ? '1px solid rgba(0, 245, 155, 0.35)'
                  : '1px dashed rgba(255, 255, 255, 0.1)',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: player ? 'var(--role-doctor)' : 'rgba(255, 255, 255, 0.1)',
                  color: player ? '#000000' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {seatNumber}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: player ? '#ffffff' : 'var(--text-muted)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {player ? player.display_name : 'Waiting...'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
