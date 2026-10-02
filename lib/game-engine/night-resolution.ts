/**
 * TikTok LIVE Mafia — Night Action Resolution Engine
 * Evaluates Mafia kills, Doctor protections (with 3-round self-protect cooldown),
 * and Detective investigations in server-authoritative order.
 */

import { EventType, EventVisibility, PlayerRole } from './types';
import { GAME_DEFAULTS } from './constants';

export interface NightInputPlayer {
  id: string;
  display_name: string;
  role: PlayerRole | null;
  status: 'ALIVE' | 'ELIMINATED' | 'DISCONNECTED';
}

export interface NightActionInput {
  mafiaTargetId: string | null;
  doctorTargetId: string | null;
  detectiveTargetId: string | null;
  currentRound: number;
  doctorSelfProtectLastUsedRound?: number;
  players: NightInputPlayer[];
}

export interface DetectiveInvestigationResult {
  targetId: string;
  targetName: string;
  isMafia: boolean;
}

export interface GeneratedEvent {
  type: EventType;
  actorId?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  visibility: EventVisibility;
}

export interface NightResolutionOutput {
  eliminatedPlayerId: string | null;
  eliminatedPlayerName: string | null;
  savedPlayerId: string | null;
  savedPlayerName: string | null;
  detectiveResult: DetectiveInvestigationResult | null;
  doctorSelfProtectUsedThisRound: boolean;
  doctorCooldownRemaining: number;
  events: GeneratedEvent[];
}

/**
 * Checks if a Doctor is allowed to protect themselves in the current round.
 * Rule: Can protect themselves once every 3 rounds.
 */
export function canDoctorSelfProtect(
  currentRound: number,
  lastUsedRound?: number,
  cooldownRounds: number = GAME_DEFAULTS.roles.doctorSelfProtectCooldown
): boolean {
  if (lastUsedRound === undefined || lastUsedRound === null) {
    return true; // Never used before
  }
  return currentRound - lastUsedRound >= cooldownRounds;
}

/**
 * Resolves all night actions strictly on the server.
 */
export function resolveNightActions(input: NightActionInput): NightResolutionOutput {
  const {
    mafiaTargetId,
    doctorTargetId,
    detectiveTargetId,
    currentRound,
    doctorSelfProtectLastUsedRound,
    players,
  } = input;

  const playerMap = new Map<string, NightInputPlayer>();
  players.forEach((p) => playerMap.set(p.id, p));

  const events: GeneratedEvent[] = [];

  // Find Doctor
  const doctor = players.find((p) => p.role === 'DOCTOR' && p.status === 'ALIVE');
  let effectiveDoctorTargetId: string | null = doctorTargetId;
  let doctorSelfProtectUsedThisRound = false;

  // Validate Doctor Protection
  if (doctor && doctorTargetId) {
    const isSelfProtect = doctorTargetId === doctor.id;
    if (isSelfProtect) {
      const allowed = canDoctorSelfProtect(
        currentRound,
        doctorSelfProtectLastUsedRound,
        GAME_DEFAULTS.roles.doctorSelfProtectCooldown
      );
      if (!allowed) {
        // Cooldown has not elapsed; self-protect fails
        effectiveDoctorTargetId = null;
      } else {
        doctorSelfProtectUsedThisRound = true;
      }
    }
  }

  // Validate Mafia Target
  let effectiveMafiaTargetId: string | null = mafiaTargetId;

  if (effectiveMafiaTargetId) {
    const targetPlayer = playerMap.get(effectiveMafiaTargetId);
    // Mafia cannot target fellow Mafia or dead players
    if (!targetPlayer || targetPlayer.status !== 'ALIVE' || targetPlayer.role === 'MAFIA') {
      effectiveMafiaTargetId = null;
    }
  }

  let eliminatedPlayerId: string | null = null;
  let eliminatedPlayerName: string | null = null;
  let savedPlayerId: string | null = null;
  let savedPlayerName: string | null = null;

  // Resolution Step 1 & 2: Compare Doctor protection vs Mafia target
  if (effectiveMafiaTargetId) {
    const targetedPlayer = playerMap.get(effectiveMafiaTargetId);
    const targetName = targetedPlayer?.display_name ?? 'Unknown Player';

    if (effectiveDoctorTargetId && effectiveDoctorTargetId === effectiveMafiaTargetId) {
      // Protection Match -> Player Survives!
      savedPlayerId = effectiveMafiaTargetId;
      savedPlayerName = targetName;
      eliminatedPlayerId = null;
    } else {
      // No Protection -> Player Eliminated!
      eliminatedPlayerId = effectiveMafiaTargetId;
      eliminatedPlayerName = targetName;
      savedPlayerId = null;
    }
  }

  // Detective Investigation
  let detectiveResult: DetectiveInvestigationResult | null = null;
  const detective = players.find((p) => p.role === 'DETECTIVE' && p.status === 'ALIVE');

  if (detective && detectiveTargetId) {
    const targetPlayer = playerMap.get(detectiveTargetId);
    if (targetPlayer && targetPlayer.status === 'ALIVE') {
      const isMafia = targetPlayer.role === 'MAFIA';
      detectiveResult = {
        targetId: targetPlayer.id,
        targetName: targetPlayer.display_name,
        isMafia,
      };

      events.push({
        type: 'DETECTIVE_ACTION_SUBMITTED',
        actorId: detective.id,
        targetId: targetPlayer.id,
        metadata: { isMafia },
        visibility: 'PLAYER_ONLY',
      });
    }
  }

  // Emit public Night Resolved Event
  events.push({
    type: 'NIGHT_RESOLVED',
    metadata: {
      round: currentRound,
      eliminatedPlayerId,
      eliminatedPlayerName,
      wasSaved: savedPlayerId !== null,
    },
    visibility: 'PUBLIC',
  });

  const cooldownRemaining = doctorSelfProtectUsedThisRound
    ? GAME_DEFAULTS.roles.doctorSelfProtectCooldown
    : doctorSelfProtectLastUsedRound !== undefined
    ? Math.max(0, GAME_DEFAULTS.roles.doctorSelfProtectCooldown - (currentRound - doctorSelfProtectLastUsedRound))
    : 0;

  return {
    eliminatedPlayerId,
    eliminatedPlayerName,
    savedPlayerId,
    savedPlayerName,
    detectiveResult,
    doctorSelfProtectUsedThisRound,
    doctorCooldownRemaining: cooldownRemaining,
    events,
  };
}
