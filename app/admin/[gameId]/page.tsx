'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CandidateTally,
  ClipCategory,
  ClipMarker,
  Game,
  GameEvent,
  GamePhase,
  NightAction,
  Player,
} from '@/lib/game-engine';
import { subscribeToModeratorChannel } from '@/lib/realtime';
import { PlayerPanel } from '@/components/moderator/PlayerPanel';
import { GameControls } from '@/components/moderator/GameControls';
import { VotingBarChart } from '@/components/moderator/VotingBarChart';
import { ClipMarkerPanel } from '@/components/moderator/ClipMarkerPanel';
import { EventLogStream } from '@/components/moderator/EventLogStream';

export default function ModeratorDashboardPage({ params }: { params: { gameId: string } }) {
  const router = useRouter();
  const gameId = params.gameId;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<'player' | 'overlay' | null>(null);

  const [game, setGame] = useState<Game | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentNightActions, setCurrentNightActions] = useState<NightAction[]>([]);
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [clips, setClips] = useState<ClipMarker[]>([]);
  const [votingTallies, setVotingTallies] = useState<CandidateTally[]>([]);
  const [totalVotesCast, setTotalVotesCast] = useState(0);
  const [voteAnnouncement, setVoteAnnouncement] = useState<string | null>(null);

  // 1. Fetch Complete Moderator Snapshot
  const fetchDashboardData = useCallback(async () => {
    try {
      // Fetch game state
      const res = await fetch(`/api/games/${gameId}`, {
        headers: { 'x-moderator-key': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load game');

      setGame(data.game);
      setPlayers(data.players || []);
      setCurrentNightActions(data.currentRoundNightActions || []);

      // Fetch events
      const eventsRes = await fetch(`/api/games/${data.game.id}/events`);
      const eventsData = await eventsRes.json();
      if (eventsData.events) setEvents(eventsData.events);

      // Fetch clips
      const clipsRes = await fetch(`/api/games/${data.game.id}/clips`);
      const clipsData = await clipsRes.json();
      if (clipsData.clips) setClips(clipsData.clips);

      // Fetch votes if voting/reveal phase
      if (data.game.phase === 'VOTING' || data.game.phase === 'REVEAL') {
        const votesRes = await fetch(`/api/games/${data.game.id}/votes`);
        const votesData = await votesRes.json();
        if (votesData.tally) {
          setVotingTallies(votesData.tally.tallies || []);
          setTotalVotesCast(votesData.tally.totalVotesCast || 0);
          setVoteAnnouncement(votesData.tally.announcement || null);
        }
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error loading dashboard');
    } finally {
      setIsLoading(false);
    }
  }, [gameId]);

  // 2. Realtime Subscriptions
  useEffect(() => {
    fetchDashboardData();

    const channel = subscribeToModeratorChannel(gameId, {
      onPhaseChange: () => {
        fetchDashboardData();
      },
      onTimerSync: (payload) => {
        setGame((prev) => (prev ? { ...prev, phase_ends_at: payload.phaseEndsAt } : null));
      },
      onVoteCountUpdate: (payload) => {
        setTotalVotesCast(payload.totalVotesCast);
        fetchDashboardData();
      },
      onClipMarked: () => {
        fetchDashboardData();
      },
      onReconnect: () => {
        fetchDashboardData();
      },
    });

    return () => {
      channel.unsubscribe();
    };
  }, [gameId, fetchDashboardData]);

  // 3. Moderator Actions
  const handleStartGame = async () => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/start`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to start game');
    else fetchDashboardData();
  };

  const handleAdvancePhase = async (targetPhase?: GamePhase, isOverride = false) => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/phase/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetPhase, isModeratorOverride: isOverride }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to advance phase');
    else fetchDashboardData();
  };

  const handleExtendTimer = async (seconds: number) => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'EXTEND_TIMER', additionalSeconds: seconds }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to extend timer');
    else fetchDashboardData();
  };

  const handleEliminatePlayer = async (playerId: string, reason: string) => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/eliminate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId, reason }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to eliminate player');
    else fetchDashboardData();
  };

  const handleRemovePlayer = async (playerId: string) => {
    const res = await fetch(`/api/players/${playerId}/remove`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) alert(data.error || 'Failed to remove player');
    else fetchDashboardData();
  };

  const handleMarkClip = async (category: ClipCategory, description: string) => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/clips`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, description }),
    });
    if (res.ok) fetchDashboardData();
  };

  const handleEndGame = async () => {
    if (!game) return;
    const res = await fetch(`/api/games/${game.id}/end`, { method: 'POST' });
    if (res.ok) fetchDashboardData();
  };


  const copyLink = (type: 'player' | 'overlay') => {
    if (!game) return;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const path = type === 'player' ? `/join/${game.code}` : `/live/${game.code}`;
    navigator.clipboard.writeText(`${origin}${path}`);
    setCopiedLink(type);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text-secondary)' }}>Loading Moderator Dashboard...</p>
      </div>
    );
  }

  if (errorMsg || !game) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ textAlign: 'center', padding: 32 }}>
          <h2>Dashboard Error</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '12px 0 20px' }}>{errorMsg}</p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  const alivePlayers = players.filter((p) => p.status === 'ALIVE');

  return (
    <div style={{ minHeight: '100vh', padding: '16px 24px', maxWidth: 1400, margin: '0 auto' }}>
      {/* Top Header Bar */}
      <header
        className="glass-card"
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          padding: '14px 24px',
          marginBottom: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🎙️</span>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 20, fontWeight: 900 }}>Host Dashboard</h1>
              <span className="badge" style={{ background: 'var(--role-mafia-bg)', color: 'var(--role-mafia)' }}>
                ROOM: {game.code}
              </span>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.08)' }}>
                {game.status}
              </span>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Current Phase: <strong>{game.phase}</strong> | Round: <strong>{game.round}</strong>
            </p>
          </div>
        </div>

        {/* Share Link Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={() => copyLink('player')}
            className="btn-secondary"
            style={{ width: 'auto', minHeight: 38, height: 38, padding: '0 14px', fontSize: 12 }}
          >
            {copiedLink === 'player' ? '✓ Link Copied!' : '📋 Copy Player Link'}
          </button>
          <button
            onClick={() => copyLink('overlay')}
            className="btn-secondary"
            style={{
              width: 'auto',
              minHeight: 38,
              height: 38,
              padding: '0 14px',
              fontSize: 12,
              borderColor: 'var(--role-detective)',
              color: 'var(--role-detective)',
            }}
          >
            {copiedLink === 'overlay' ? '✓ Link Copied!' : '📺 Copy LIVE Overlay Link'}
          </button>
        </div>
      </header>

      {/* Main 2-Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Left Column: Player Panel */}
        <div>
          <PlayerPanel
            players={players}
            onEliminatePlayer={handleEliminatePlayer}
            onRemovePlayer={handleRemovePlayer}
            isGameInProgress={game.status === 'IN_PROGRESS'}
          />
        </div>

        {/* Right Column: Controls & Voting Tally */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <GameControls
            game={game}
            playerCount={players.length}
            aliveCount={alivePlayers.length}
            currentNightActions={currentNightActions}
            onStartGame={handleStartGame}
            onAdvancePhase={handleAdvancePhase}
            onExtendTimer={handleExtendTimer}
            onEndGame={handleEndGame}
          />

          {(game.phase === 'VOTING' || game.phase === 'REVEAL') && (
            <VotingBarChart
              tallies={votingTallies}
              totalVotesCast={totalVotesCast}
              alivePlayersCount={alivePlayers.length}
              isVotingOpen={game.phase === 'VOTING'}
              announcement={voteAnnouncement}
            />
          )}
        </div>
      </div>

      {/* Bottom Row: Clips and Audit Event Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div>
          <ClipMarkerPanel clips={clips} onMarkClip={handleMarkClip} />
        </div>
        <div>
          <EventLogStream events={events} />
        </div>
      </div>
    </div>
  );
}
