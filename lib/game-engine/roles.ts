/**
 * TikTok LIVE Mafia — Role Assignment Engine
 * Secure random role shuffling using Web Crypto API.
 */

import { PlayerRole } from './types';
import { ROLE_DISTRIBUTIONS } from './constants';

export class RoleAssignmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RoleAssignmentError';
  }
}

/**
 * Cryptographically secure Fisher-Yates array shuffle.
 */
export function secureShuffle<T>(array: T[]): T[] {
  const result = [...array];
  const length = result.length;

  for (let i = length - 1; i > 0; i--) {
    // Generate secure random index between 0 and i inclusive
    const randomBuffer = new Uint32Array(1);
    crypto.getRandomValues(randomBuffer);
    const j = randomBuffer[0] % (i + 1);

    // Swap elements
    const temp = result[i];
    result[i] = result[j];
    result[j] = temp;
  }

  return result;
}

/**
 * Builds the pool of roles required for a given player count.
 */
export function buildRolePool(playerCount: number): PlayerRole[] {
  const distribution = ROLE_DISTRIBUTIONS[playerCount];

  if (!distribution) {
    throw new RoleAssignmentError(
      `Unsupported player count: ${playerCount}. Must be between 5 and 12 players.`
    );
  }

  const pool: PlayerRole[] = [];

  for (let i = 0; i < distribution.mafia; i++) pool.push('MAFIA');
  for (let i = 0; i < distribution.detective; i++) pool.push('DETECTIVE');
  for (let i = 0; i < distribution.doctor; i++) pool.push('DOCTOR');
  for (let i = 0; i < distribution.citizen; i++) pool.push('CITIZEN');

  if (pool.length !== playerCount) {
    throw new RoleAssignmentError(
      `Distribution total (${pool.length}) does not match player count (${playerCount}).`
    );
  }

  return pool;
}

/**
 * Assigns roles securely to a list of player IDs.
 * Returns a map of playerId -> PlayerRole.
 */
export function assignRoles(playerIds: string[]): Record<string, PlayerRole> {
  const count = playerIds.length;

  if (count < 5 || count > 12) {
    throw new RoleAssignmentError(
      `Player count must be between 5 and 12 players. Provided: ${count}`
    );
  }

  // Ensure unique player IDs
  const uniqueIds = new Set(playerIds);
  if (uniqueIds.size !== count) {
    throw new RoleAssignmentError('Player IDs must be unique for role assignment.');
  }

  const rolePool = buildRolePool(count);
  const shuffledRoles = secureShuffle(rolePool);

  const assignments: Record<string, PlayerRole> = {};
  playerIds.forEach((id, index) => {
    assignments[id] = shuffledRoles[index];
  });

  return assignments;
}
