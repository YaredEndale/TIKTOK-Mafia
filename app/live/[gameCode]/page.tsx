'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  CandidateTally,
  GameWinner,
  PlayerRole,
  PublicGameState,
  PublicPlayer,
} from '@/lib/game-engine';
import { subscribeToOverlayChannel } from '@/lib/realtime';
import { OverlayHeader } from '@/components/overlay/OverlayHeader';
import { LobbyOverlay } from '@/components/overlay/LobbyOverlay';
import { NightOverlay } from '@/components/overlay/NightOverlay';
import { DiscussionOverlay } from '@/components/overlay/DiscussionOverlay';
import { VotingOverlay } from '@/components/overlay/VotingOverlay';
import { EliminationOverlay } from '@/components/overlay/EliminationOverlay';
import { GameOverOverlay } from '@/components/overlay/GameOverOverlay';

export default function LiveOverlayPage({ params }: { params: { gameCode: string } }) {
  const gameCode = params.gameCode.toUpperCase();

  const [isLoading, setIsLoading] = useState(true);
  const [gameState, setGameState] = useState<PublicGameState | null>(null);
  const [votingTallies, setVotingTallies] = useState<CandidateTally[]>([]);
  const [totalVotesCast, setTotalVotesCast] = useState(0);
  const [recentEliminatedPlayer, setRecentEliminatedPlayer] = useState<{
    player: PublicPlayer | null;
    role: PlayerRole | null;
    reason: string;
  } | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<{
    message: string;
    author?: string;
  } | null>(null);

  // 1. Fetch Public Game Snapshot (Rule 2: Zero role leak)
  const fetchOverlaySnapshot = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameCode}`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.game) {
        setGameState(data.game);

        // If in voting or reveal phase, fetch current vote tallies
        if (data.game.phase === 'VOTING' || data.game.phase === 'REVEAL') {
          const votesRes = await fetch(`/api/games/${data.game.gameId}/votes`);
          if (votesRes.ok) {
            const votesData = await votesRes.json();
            if (votesData.tally) {
              setVotingTallies(votesData.tally.tallies || []);
              setTotalVotesCast(votesData.tally.totalVotesCast || 0);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error fetching overlay state:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gameCode]);

  // 2. Realtime Broadcast Subscriptions
  useEffect(() => {
    fetchOverlaySnapshot();

    if (!gameState?.gameId) return;

    const channel = subscribeToOverlayChannel(gameState.gameId, {
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
        fetchOverlaySnapshot();
      },
      onTimerSync: (payload) => {
        setGameState((prev) =>
          prev ? { ...prev, phaseEndsAt: payload.phaseEndsAt } : null
        );
      },
      onVoteCountUpdate: (payload) => {
        setTotalVotesCast(payload.totalVotesCast);
        // Refresh live tally bars
        fetchOverlaySnapshot();
      },
      onPlayerEliminated: (payload) => {
        setRecentEliminatedPlayer({
          player: {
            id: payload.playerId,
            display_name: payload.displayName,
            tiktok_username: null,
            avatar_url: null,
            status: 'ELIMINATED',
            seat_number: null,
            role: payload.revealedRole,
            eliminated_reason: payload.reason as unknown as PublicPlayer['eliminated_reason'],
          },
          role: payload.revealedRole,
          reason: payload.reason,
        });

        fetchOverlaySnapshot();
      },
      onAnnouncement: (payload) => {
        setLiveAnnouncement({
          message: payload.message,
          author: payload.author,
        });
        // Auto-dismiss after 12 seconds
        setTimeout(() => setLiveAnnouncement(null), 12000);
      },
      onReconnect: () => {
        fetchOverlaySnapshot();
      },
    });

    return () => {
      channel.unsubscribe();
    };
  }, [gameState?.gameId, fetchOverlaySnapshot]);

  // Loading Screen
  if (isLoading && !gameState) {
    return (
      <div className="overlay-viewport" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-animation" style={{ fontSize: 56, marginBottom: 16 }}>
            🎭
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, letterSpacing: '1px' }}>
            CONNECTING TO LIVE SHOW...
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>
            OBS / Streamlabs Browser Source
          </p>
        </div>
      </div>
    );
  }

  // Not Found / Inactive Screen
  if (!gameState) {
    return (
      <div className="overlay-viewport" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="overlay-card" style={{ textAlign: 'center', padding: '36px 32px' }}>
          <span style={{ fontSize: 48, display: 'block', marginBottom: 12 }}>⚠️</span>
          <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>ROOM NOT FOUND</h2>
          <p style={{ color: 'var(--text-secondary)' }}>
            Game code <strong>{gameCode}</strong> is not currently active.
          </p>
        </div>
      </div>
    );
  }

  // Render Phase Specific Layout
  return (
    <div className="overlay-viewport">
      {/* Universal Top Header */}
      <OverlayHeader
        gameCode={gameState.code}
        phase={gameState.phase}
        round={gameState.round}
      />

      {/* Live Producer Announcement Ticker */}
      {liveAnnouncement && (
        <div
          className="overlay-card pulse-animation"
          style={{
            width: '100%',
            padding: '14px 20px',
            marginBottom: 20,
            background: 'rgba(255, 42, 95, 0.18)',
            border: '2px solid rgba(255, 42, 95, 0.6)',
            boxShadow: '0 0 25px var(--role-mafia-glow)',
            textAlign: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>📢</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 900,
                letterSpacing: '1.5px',
                color: 'var(--role-mafia)',
                textTransform: 'uppercase',
              }}
            >
              HOST ANNOUNCEMENT
            </span>
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#ffffff', marginTop: 4 }}>
            {liveAnnouncement.message}
          </p>
        </div>
      )}

      {/* Main Content Area Driven by Game State */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {(gameState.phase === 'LOBBY' ||
          gameState.phase === 'PLAYER_SELECTION' ||
          gameState.phase === 'ROLE_ASSIGNMENT') && (
          <LobbyOverlay
            gameCode={gameState.code}
            players={gameState.players}
            maxPlayers={12}
          />
        )}

        {gameState.phase === 'NIGHT' && (
          <NightOverlay
            round={gameState.round}
            phaseEndsAt={gameState.phaseEndsAt}
            players={gameState.players}
          />
        )}

        {(gameState.phase === 'DAY' || gameState.phase === 'DISCUSSION') && (
          <DiscussionOverlay
            round={gameState.round}
            phaseEndsAt={gameState.phaseEndsAt}
            players={gameState.players}
            announcements={gameState.announcements}
          />
        )}

        {gameState.phase === 'VOTING' && (
          <VotingOverlay
            phaseEndsAt={gameState.phaseEndsAt}
            players={gameState.players}
            tallies={votingTallies}
            totalVotesCast={totalVotesCast}
          />
        )}

        {(gameState.phase === 'REVEAL' || gameState.phase === 'ELIMINATION') && (
          <EliminationOverlay
            player={
              recentEliminatedPlayer?.player ||
              gameState.players.find((p) => p.status === 'ELIMINATED') ||
              null
            }
            revealedRole={recentEliminatedPlayer?.role || null}
            reason={recentEliminatedPlayer?.reason || 'Eliminated by decision of the town'}
            round={gameState.round}
          />
        )}

        {gameState.phase === 'GAME_OVER' && (
          <GameOverOverlay
            winner={gameState.winner as GameWinner}
            round={gameState.round}
            players={gameState.players}
          />
        )}
      </div>
    </div>
  );
}
