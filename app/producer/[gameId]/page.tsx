'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipCategory,
  ClipMarker,
  PublicGameState,
} from '@/lib/game-engine';
import { subscribeToGameChannel } from '@/lib/realtime';
import { ProducerHeader } from '@/components/producer/ProducerHeader';
import { ClipMarkerConsole } from '@/components/producer/ClipMarkerConsole';
import { AnnouncementConsole } from '@/components/producer/AnnouncementConsole';
import { ClipTimelineTable } from '@/components/producer/ClipTimelineTable';
import { PublicMonitorRoster } from '@/components/producer/PublicMonitorRoster';

export default function ProducerDashboardPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const identifier = params.gameId;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [clips, setClips] = useState<ClipMarker[]>([]);
  const [announcements, setAnnouncements] = useState<
    { id: string; message: string; timestamp: string }[]
  >([]);

  // 1. Fetch Producer Snapshot
  const fetchProducerData = useCallback(async () => {
    try {
      // Fetch public game state
      const res = await fetch(`/api/games/${identifier}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load game');

      // Unpack game (supports both public view or direct game object)
      const gameInfo: PublicGameState = data.game;
      setGameState(gameInfo);

      // Fetch clips
      const clipsRes = await fetch(`/api/games/${gameInfo.gameId}/clips`);
      const clipsData = await clipsRes.json();
      if (clipsData.clips) setClips(clipsData.clips);

      // Fetch announcements
      const annRes = await fetch(`/api/games/${gameInfo.gameId}/announcements`);
      const annData = await annRes.json();
      if (annData.announcements) setAnnouncements(annData.announcements);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading producer console');
    } finally {
      setIsLoading(false);
    }
  }, [identifier]);

  // 2. Realtime Broadcast Subscriptions
  useEffect(() => {
    fetchProducerData();

    if (!gameState?.gameId) return;

    const channel = subscribeToGameChannel(gameState.gameId, {
      onPhaseChange: (payload) => {
        setGameState((prev) =>
          prev
            ? {
                ...prev,
                phase: payload.phase,
                round: payload.round,
                phaseStartedAt: payload.phaseStartedAt,
                phaseEndsAt: payload.phaseEndsAt,
              }
            : null
        );
        fetchProducerData();
      },
      onTimerSync: (payload) => {
        setGameState((prev) =>
          prev ? { ...prev, phaseEndsAt: payload.phaseEndsAt } : null
        );
      },
      onPlayerEliminated: () => {
        fetchProducerData();
      },
      onAnnouncement: (payload) => {
        setAnnouncements((prev) => [
          { id: payload.id, message: payload.message, timestamp: payload.timestamp },
          ...prev,
        ]);
      },
      onReconnect: () => {
        fetchProducerData();
      },
    });

    return () => {
      channel.unsubscribe();
    };
  }, [gameState?.gameId, fetchProducerData]);

  // 3. Producer Actions
  const handleMarkClip = async (category: ClipCategory, description: string) => {
    if (!gameState) return;
    const res = await fetch(`/api/games/${gameState.gameId}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.clip) {
        setClips((prev) => [data.clip, ...prev]);
      }
    }
  };

  const handleSendAnnouncement = async (message: string) => {
    if (!gameState) return;
    const res = await fetch(`/api/games/${gameState.gameId}/announcements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, author: 'PRODUCER' }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.announcement) {
        setAnnouncements((prev) => [data.announcement, ...prev]);
      }
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Producer Console...</p>
      </div>
    );
  }

  if (errorMsg || !gameState) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <h2>Producer Error</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>{errorMsg}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Producer Universal Header */}
      <ProducerHeader
        gameCode={gameState.code}
        phase={gameState.phase}
        round={gameState.round}
        phaseEndsAt={gameState.phaseEndsAt}
      />

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Left Column: Clip Console & Announcement Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ClipMarkerConsole onMarkClip={handleMarkClip} />
          <AnnouncementConsole
            onSendAnnouncement={handleSendAnnouncement}
            recentAnnouncements={announcements}
          />
        </div>

        {/* Right Column: Clip Timeline & Public Status Monitor */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ClipTimelineTable
            clips={clips}
            gameStartedAt={gameState.phaseStartedAt}
          />
          <PublicMonitorRoster players={gameState.players} />
        </div>
      </div>
    </div>
  );
}
