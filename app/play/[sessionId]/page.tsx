'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase, GameWinner, PlayerPrivateState, PublicPlayer } from '@/lib/game-engine';
import { subscribeToGameChannel, subscribeToPlayerChannel } from '@/lib/realtime';
import { TimerHeader } from '@/components/player/TimerHeader';
import { RoleCard } from '@/components/player/RoleCard';
import { NightActionView } from '@/components/player/NightActionView';
import { VotingView } from '@/components/player/VotingView';
import { DiscussionView } from '@/components/player/DiscussionView';
import { EliminatedView } from '@/components/player/EliminatedView';
import { GameOverView } from '@/components/player/GameOverView';

interface GameSnapshot {
  id: string;
  code: string;
  status: string;
  phase: GamePhase;
  round: number;
  phaseStartedAt: string | null;
  phaseEndsAt: string | null;
  winner: GameWinner;
}

export default function PlayGamePage({ params }: { params: { sessionId: string } }) {
  const router = useRouter();
  const sessionId = params.sessionId;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const [gameState, setGameState] = useState<GameSnapshot | null>(null);
  const [playerState, setPlayerState] = useState<PlayerPrivateState | null>(null);
  const [publicPlayers, setPublicPlayers] = useState<PublicPlayer[]>([]);
  const [dawnBulletin, setDawnBulletin] = useState<string | null>(null);

  // 1. Fetch Authoritative Snapshot from Server
  const fetchSnapshot = useCallback(async (playerToken: string, gameId?: string) => {
    try {
      const targetId = gameId || localStorage.getItem('mafia_game_id') || localStorage.getItem('mafia_game_code');
      if (!targetId) return;

      const res = await fetch(`/api/games/${targetId}`, {
        headers: {
          'x-player-token': playerToken,
        },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch game state');
      }

      if (data.view === 'PLAYER') {
        setGameState(data.game);
        setPlayerState(data.player);
      } else if (data.view === 'PUBLIC') {
        setGameState(data.game);
      }

      // Also fetch public players list
      const playersRes = await fetch(`/api/games/${data.game.id}/players`);
      const playersData = await playersRes.json();
      if (playersData.players) {
        setPublicPlayers(playersData.players);
      }
    } catch (err: unknown) {
      console.error('Error fetching snapshot:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 2. Initialize on Mount & Handle Reconnect (Rule 6)
  useEffect(() => {
    const storedToken = localStorage.getItem('mafia_player_token');
    if (!storedToken) {
      setErrorMsg('No active player session found. Please join via room link.');
      setIsLoading(false);
      return;
    }

    setToken(storedToken);
    const storedGameId = localStorage.getItem('mafia_game_id') || undefined;

    fetchSnapshot(storedToken, storedGameId);

    // Subscribe to private player channel
    const playerSub = subscribeToPlayerChannel(sessionId, {
      onRoleAssigned: (payload) => {
        setPlayerState((prev) => (prev ? { ...prev, role: payload.role, teammates: payload.teammates } : null));
      },
      onInvestigationResult: (payload) => {
        setPlayerState((prev) => {
          if (!prev) return null;
          const history = prev.investigationHistory ? [...prev.investigationHistory, payload] : [payload];
          return { ...prev, investigationHistory: history };
        });
      },
      onEliminated: (payload) => {
        setPlayerState((prev) => (prev ? { ...prev, status: 'ELIMINATED' } : null));
        setDawnBulletin(`You have been eliminated: ${payload.reason}`);
      },
      onReconnect: () => {
        fetchSnapshot(storedToken, storedGameId);
      },
    });

    return () => {
      playerSub.unsubscribe();
    };
  }, [sessionId, fetchSnapshot]);

  // 3. Subscribe to Public Game Channel once gameId is known
  useEffect(() => {
    if (!gameState?.id || !token) return;

    const gameSub = subscribeToGameChannel(gameState.id, {
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

        // Reset per-phase action flags on phase change
        setPlayerState((prev) =>
          prev
            ? {
                ...prev,
                phase: payload.phase,
                round: payload.round,
                phaseStartedAt: payload.phaseStartedAt,
                phaseEndsAt: payload.phaseEndsAt,
                hasActed: payload.phase === 'NIGHT' ? false : prev.hasActed,
                hasVoted: payload.phase === 'VOTING' ? false : prev.hasVoted,
              }
            : null
        );

        fetchSnapshot(token, gameState.id);
      },
      onTimerSync: (payload) => {
        setGameState((prev) => (prev ? { ...prev, phaseEndsAt: payload.phaseEndsAt } : null));
      },
      onPlayerEliminated: (payload) => {
        setDawnBulletin(`${payload.displayName} was eliminated! (${payload.revealedRole || 'Role Secret'})`);
        fetchSnapshot(token, gameState.id);
      },
      onReconnect: () => {
        fetchSnapshot(token, gameState.id);
      },
    });

    return () => {
      gameSub.unsubscribe();
    };
  }, [gameState?.id, token, fetchSnapshot]);

  // 4. Action Handlers
  const handleNightAction = async (action: 'KILL' | 'PROTECT' | 'INVESTIGATE', targetId: string) => {
    if (!gameState || !token) return;

    const res = await fetch(`/api/games/${gameState.id}/night-actions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': token,
      },
      body: JSON.stringify({ action, targetId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit night action');
    }

    setPlayerState((prev) => (prev ? { ...prev, hasActed: true } : null));
  };

  const handleVote = async (targetId: string) => {
    if (!gameState || !token) return;

    const res = await fetch(`/api/games/${gameState.id}/votes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-player-token': token,
      },
      body: JSON.stringify({ targetId }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Failed to submit vote');
    }

    setPlayerState((prev) => (prev ? { ...prev, hasVoted: true } : null));
  };

  // 5. Loading and Error States
  if (isLoading) {
    return (
      <main className="mobile-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="pulse-animation" style={{ fontSize: 44, marginBottom: 12 }}>🎭</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>Connecting to game room...</p>
        </div>
      </main>
    );
  }

  if (errorMsg || !gameState) {
    return (
      <main className="mobile-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div className="glass-card" style={{ textAlign: 'center', maxWidth: 360 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Session Issue</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>
            {errorMsg || 'Unable to connect to game session.'}
          </p>
          <button onClick={() => router.push('/')} className="btn-secondary">
            Return to Home
          </button>
        </div>
      </main>
    );
  }

  const isEliminated = playerState?.status === 'ELIMINATED';
  const isGameOver = gameState.phase === 'GAME_OVER' || gameState.status === 'COMPLETED';

  return (
    <main className="mobile-container">
      {/* Timer & Phase Header */}
      <TimerHeader
        phase={gameState.phase}
        round={gameState.round}
        phaseEndsAt={gameState.phaseEndsAt}
      />

      {/* 1. GAME OVER VIEW */}
      {isGameOver ? (
        <GameOverView
          winner={gameState.winner}
          playerRole={playerState?.role || null}
          players={publicPlayers}
          onPlayAgain={() => router.push('/')}
        />
      ) : isEliminated ? (
        /* 2. ELIMINATED SPECTATOR VIEW */
        <>
          <EliminatedView
            displayName={playerState?.displayName || 'Player'}
            role={playerState?.role || null}
            eliminatedReason={dawnBulletin}
          />
          <DiscussionView
            round={gameState.round}
            alivePlayers={playerState?.alivePlayers || []}
            dawnAnnouncement={dawnBulletin}
          />
        </>
      ) : (
        /* 3. ACTIVE PLAYER VIEW */
        <>
          {/* Secret Role Card */}
          <RoleCard
            role={playerState?.role || null}
            teammates={playerState?.teammates}
          />

          {/* Lobby Waiting State */}
          {(gameState.phase === 'LOBBY' || gameState.phase === 'PLAYER_SELECTION') && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⏳</div>
              <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>
                Waiting in Lobby
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
                You are registered as <strong>{playerState?.displayName}</strong>. The host will assign roles and start the game shortly.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 20, background: 'rgba(255,255,255,0.06)' }}>
                <span className="pulse-animation" style={{ width: 8, height: 8, borderRadius: '50%', background: '#00f59b' }} />
                <span style={{ fontSize: 13, color: '#00f59b', fontWeight: 600 }}>
                  {publicPlayers.length} players joined
                </span>
              </div>
            </div>
          )}

          {/* Night Phase Action Screen */}
          {gameState.phase === 'NIGHT' && playerState?.role && (
            <NightActionView
              gameId={gameState.id}
              playerId={playerState.playerId}
              role={playerState.role}
              alivePlayers={playerState.alivePlayers}
              teammates={playerState.teammates}
              investigationHistory={playerState.investigationHistory}
              hasActed={Boolean(playerState.hasActed)}
              onActionSubmitted={handleNightAction}
            />
          )}

          {/* Day / Discussion Screen */}
          {(gameState.phase === 'DAY' || gameState.phase === 'DISCUSSION') && (
            <DiscussionView
              round={gameState.round}
              alivePlayers={playerState?.alivePlayers || []}
              dawnAnnouncement={dawnBulletin}
            />
          )}

          {/* Voting Screen */}
          {gameState.phase === 'VOTING' && (
            <VotingView
              playerId={playerState?.playerId || ''}
              alivePlayers={playerState?.alivePlayers || []}
              hasVoted={Boolean(playerState?.hasVoted)}
              onVoteSubmitted={handleVote}
            />
          )}

          {/* Reveal & Elimination Transition */}
          {(gameState.phase === 'REVEAL' || gameState.phase === 'ELIMINATION') && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '36px 16px' }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>⚖️</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
                The Town Has Spoken
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Votes are being counted. Watch the host and LIVE stream overlay for the verdict!
              </p>
            </div>
          )}
        </>
      )}
    </main>
  );
}
