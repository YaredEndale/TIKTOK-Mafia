/**
 * TikTok LIVE Mafia — Win Condition Engine
 * Evaluates whether Mafia parity or Village victory conditions have been met.
 */

import { GameWinner, PlayerRole, PlayerStatus } from './types';

export interface WinCheckPlayer {
  id: string;
  role: PlayerRole | null;
  status: PlayerStatus;
}

export interface WinConditionResult {
  isGameOver: boolean;
  winner: GameWinner;
  aliveMafiaCount: number;
  aliveVillageCount: number;
  reason: string;
}

/**
 * Checks win conditions after any elimination or phase change.
 *
 * Rules:
 * 1. Village wins if all Mafia are eliminated (alive_mafia === 0).
 * 2. Mafia wins if Mafia reach parity with or outnumber Village (alive_mafia >= alive_village).
 * 3. Otherwise, game continues (winner is null).
 */
export function checkWinCondition(players: WinCheckPlayer[]): WinConditionResult {
  const alivePlayers = players.filter((p) => p.status === 'ALIVE');

  const aliveMafiaCount = alivePlayers.filter((p) => p.role === 'MAFIA').length;
  const aliveVillageCount = alivePlayers.filter((p) => p.role !== 'MAFIA').length;

  // Condition 1: Village Victory
  if (aliveMafiaCount === 0) {
    return {
      isGameOver: true,
      winner: 'VILLAGE',
      aliveMafiaCount,
      aliveVillageCount,
      reason: 'All Mafia members have been eliminated! The Village wins.',
    };
  }

  // Condition 2: Mafia Victory (Parity or majority)
  if (aliveMafiaCount >= aliveVillageCount) {
    return {
      isGameOver: true,
      winner: 'MAFIA',
      aliveMafiaCount,
      aliveVillageCount,
      reason: `Mafia reached parity (${aliveMafiaCount} Mafia vs ${aliveVillageCount} Villagers)! Mafia controls the town.`,
    };
  }

  // Condition 3: Game continues
  return {
    isGameOver: false,
    winner: null,
    aliveMafiaCount,
    aliveVillageCount,
    reason: `Game in progress (${aliveMafiaCount} Mafia, ${aliveVillageCount} Villagers alive).`,
  };
}
