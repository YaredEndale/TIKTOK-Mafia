'use client';

import React, { useState } from 'react';
import { Game, GamePhase, NightAction } from '@/lib/game-engine';

interface GameControlsProps {
  game: Game;
  playerCount: number;
  aliveCount: number;
  currentNightActions: NightAction[];
  onStartGame: () => Promise<void>;
  onAdvancePhase: (targetPhase?: GamePhase, isOverride?: boolean) => Promise<void>;
  onExtendTimer: (seconds: number) => Promise<void>;
  onEndGame: () => Promise<void>;
  onRestartGame?: () => Promise<void>;
}

export const GameControls: React.FC<GameControlsProps> = ({
  game,
  playerCount,
  aliveCount,
  currentNightActions,
  onStartGame,
  onAdvancePhase,
  onExtendTimer,
  onEndGame,
  onRestartGame,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [overridePhase, setOverridePhase] = useState<GamePhase | ''>('');

  const handleAction = async (fn: () => Promise<void>) => {
    setIsProcessing(true);
    try {
      await fn();
    } finally {
      setIsProcessing(false);
    }
  };

  // Night Action Submission Checks
  const mafiaSubmitted = currentNightActions.some((a) => a.action === 'KILL');
  const doctorSubmitted = currentNightActions.some((a) => a.action === 'PROTECT');
  const detectiveSubmitted = currentNightActions.some((a) => a.action === 'INVESTIGATE');

  const allNightActionsReady = mafiaSubmitted && doctorSubmitted && detectiveSubmitted;

  const renderPrimaryAction = () => {
    switch (game.phase) {
      case 'LOBBY':
      case 'PLAYER_SELECTION':
        return (
          <button
            onClick={() => handleAction(onStartGame)}
            disabled={isProcessing || playerCount < 5 || playerCount > 12}
            className="btn-primary"
            style={{ minHeight: 56, fontSize: 16 }}
          >
            {playerCount < 5
              ? `Need ${5 - playerCount} More Player${5 - playerCount === 1 ? '' : 's'}`
              : '🚀 ASSIGN ROLES & START GAME'}
          </button>
        );

      case 'ROLE_ASSIGNMENT':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('NIGHT'))}
            disabled={isProcessing}
            className="btn-primary"
          >
            🌙 BEGIN NIGHT 1 (90s)
          </button>
        );

      case 'NIGHT':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('DAY'))}
            disabled={isProcessing}
            className="btn-primary"
            style={{
              background: allNightActionsReady
                ? 'linear-gradient(135deg, #00f59b 0%, #0091ea 100%)'
                : 'linear-gradient(135deg, #ff2a5f 0%, #d60036 100%)',
              color: allNightActionsReady ? '#000' : '#fff',
            }}
          >
            {allNightActionsReady ? '☀️ ALL ACTIONS IN — RESOLVE & START DAY' : '☀️ RESOLVE NIGHT & START DAY'}
          </button>
        );

      case 'DAY':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('DISCUSSION'))}
            disabled={isProcessing}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #00e5ff 0%, #0091ea 100%)', color: '#000' }}
          >
            🗣️ START DISCUSSION (180s)
          </button>
        );

      case 'DISCUSSION':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('VOTING'))}
            disabled={isProcessing}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #ffb703 0%, #fb8500 100%)', color: '#000' }}
          >
            🗳️ OPEN VOTING (60s)
          </button>
        );

      case 'VOTING':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('REVEAL'))}
            disabled={isProcessing}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #e11d48 0%, #be123c 100%)' }}
          >
            ⚖️ CLOSE VOTING & REVEAL RESULT
          </button>
        );

      case 'REVEAL':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('ELIMINATION'))}
            disabled={isProcessing}
            className="btn-primary"
          >
            💀 PROCEED TO ELIMINATION
          </button>
        );

      case 'ELIMINATION':
      case 'WIN_CHECK':
        return (
          <button
            onClick={() => handleAction(() => onAdvancePhase('NIGHT'))}
            disabled={isProcessing}
            className="btn-primary"
            style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)' }}
          >
            🌙 NEXT ROUND (START NIGHT {game.round + 1})
          </button>
        );

      case 'GAME_OVER':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, textAlign: 'center' }}>
            <span className="badge" style={{ background: 'rgba(0,245,155,0.15)', color: '#00f59b', fontSize: 15, padding: '8px 16px' }}>
              🏆 GAME CONCLUDED ({game.winner || 'DRAW'})
            </span>
            {onRestartGame && (
              <button
                onClick={() => handleAction(onRestartGame)}
                disabled={isProcessing}
                className="btn-primary"
                style={{
                  minHeight: 52,
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #00f59b 0%, #0091ea 100%)',
                  color: '#000',
                  fontWeight: 800,
                  boxShadow: '0 4px 20px rgba(0,245,155,0.3)',
                }}
              >
                🔄 REMATCH / RESTART (KEEP PLAYERS)
              </button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="glass-card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800 }}>Game Control Room</h3>
        <span className="badge" style={{ background: 'rgba(255,255,255,0.06)' }}>
          Round {game.round} • {aliveCount} Alive
        </span>

      </div>

      {/* Primary Action Button */}
      <div style={{ marginBottom: 16 }}>{renderPrimaryAction()}</div>

      {/* Night Phase Submissions Tracker */}
      {game.phase === 'NIGHT' && (
        <div
          style={{
            padding: 12,
            borderRadius: 'var(--radius-md)',
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid var(--border-subtle)',
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Night Submissions Tracker:
          </span>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span>{mafiaSubmitted ? '✅' : '⏳'}</span>
              <span style={{ color: mafiaSubmitted ? '#00f59b' : 'var(--text-muted)' }}>Mafia Kill</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span>{doctorSubmitted ? '✅' : '⏳'}</span>
              <span style={{ color: doctorSubmitted ? '#00f59b' : 'var(--text-muted)' }}>Doctor Save</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span>{detectiveSubmitted ? '✅' : '⏳'}</span>
              <span style={{ color: detectiveSubmitted ? '#00f59b' : 'var(--text-muted)' }}>Detective</span>
            </div>
          </div>
        </div>
      )}

      {/* Timer Extension & Skip Controls */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
        <button
          onClick={() => handleAction(() => onExtendTimer(30))}
          disabled={isProcessing || !game.phase_ends_at}
          className="btn-secondary"
          style={{ fontSize: 13, minHeight: 44 }}
        >
          ⏱️ +30 SECONDS
        </button>
        <button
          onClick={() => handleAction(() => onAdvancePhase())}
          disabled={isProcessing || game.phase === 'LOBBY' || game.phase === 'GAME_OVER'}
          className="btn-secondary"
          style={{ fontSize: 13, minHeight: 44 }}
        >
          ⏭️ SKIP PHASE
        </button>
      </div>

      {/* Moderator Safety Overrides */}
      <div
        style={{
          marginTop: 'auto',
          paddingTop: 14,
          borderTop: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
          Safety Controls (Rule 5: Logged):
        </span>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <select
            value={overridePhase}
            onChange={(e) => setOverridePhase(e.target.value as GamePhase)}
            style={{
              flex: 1,
              height: 40,
              padding: '0 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              border: '1px solid var(--border-strong)',
              fontSize: 12,
            }}
          >
            <option value="">Force Transition To...</option>
            <option value="LOBBY">LOBBY</option>
            <option value="NIGHT">NIGHT</option>
            <option value="DISCUSSION">DISCUSSION</option>
            <option value="VOTING">VOTING</option>
            <option value="REVEAL">REVEAL</option>
            <option value="GAME_OVER">GAME_OVER</option>
          </select>

          <button
            onClick={() => {
              if (overridePhase) {
                handleAction(() => onAdvancePhase(overridePhase as GamePhase, true));
                setOverridePhase('');
              }
            }}
            disabled={!overridePhase || isProcessing}
            className="btn-secondary"
            style={{ width: 'auto', padding: '0 16px', height: 40, minHeight: 40, fontSize: 12 }}
          >
            Apply
          </button>
        </div>

        {onRestartGame && game.phase !== 'LOBBY' && (
          <button
            onClick={() => {
              if (confirm('Restart game back to lobby with current players?')) handleAction(onRestartGame);
            }}
            disabled={isProcessing}
            style={{
              marginTop: 10,
              width: '100%',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              borderRadius: 'var(--radius-sm)',
              color: '#38bdf8',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              padding: '8px 12px',
              textAlign: 'center',
            }}
          >
            🔄 Restart Game (Keep All Players)
          </button>
        )}

        {game.status === 'IN_PROGRESS' && (
          <button
            onClick={() => {
              if (confirm('Conclude game now?')) handleAction(onEndGame);
            }}
            disabled={isProcessing}
            style={{
              marginTop: 10,
              width: '100%',
              background: 'transparent',
              border: 'none',
              color: '#ef4444',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Force End Game
          </button>
        )}
      </div>
    </div>
  );
};
