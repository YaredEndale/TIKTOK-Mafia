/**
 * TikTok LIVE Mafia — Game Integrity & Action Validator
 * Strict server-side validation to reject illegal actions, invalid targets, and unauthorized operations.
 */

import { GamePhase, NightActionType, Player } from './types';
import { canDoctorSelfProtect } from './night-resolution';
import { GAME_DEFAULTS } from './constants';

export interface ActionValidationResult {
  valid: boolean;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Validates a Night Action submission (Mafia Kill, Doctor Protect, Detective Investigate).
 */
export function validateNightActionSubmission(params: {
  currentPhase: GamePhase;
  currentRound: number;
  actor: Player | null | undefined;
  targetId: string | null;
  action: NightActionType;
  players: Player[];
  doctorSelfProtectLastUsedRound?: number;
}): ActionValidationResult {
  const {
    currentPhase,
    currentRound,
    actor,
    targetId,
    action,
    players,
    doctorSelfProtectLastUsedRound,
  } = params;

  // 1. Phase Check
  if (currentPhase !== 'NIGHT') {
    return {
      valid: false,
      errorCode: 'INVALID_PHASE',
      errorMessage: `Night actions are only allowed during the NIGHT phase. Current phase is ${currentPhase}.`,
    };
  }

  // 2. Actor Check
  if (!actor) {
    return {
      valid: false,
      errorCode: 'PLAYER_NOT_FOUND',
      errorMessage: 'Acting player is not registered in this game.',
    };
  }

  if (actor.status !== 'ALIVE') {
    return {
      valid: false,
      errorCode: 'PLAYER_ELIMINATED',
      errorMessage: 'Eliminated players cannot perform night actions.',
    };
  }

  // 3. Role-to-Action mapping
  if (action === 'KILL' && actor.role !== 'MAFIA') {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_ROLE_ACTION',
      errorMessage: 'Only Mafia members can perform kill actions.',
    };
  }

  if (action === 'PROTECT' && actor.role !== 'DOCTOR') {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_ROLE_ACTION',
      errorMessage: 'Only the Doctor can perform protection actions.',
    };
  }

  if (action === 'INVESTIGATE' && actor.role !== 'DETECTIVE') {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_ROLE_ACTION',
      errorMessage: 'Only the Detective can perform investigation actions.',
    };
  }

  // 4. Target Validation (if target provided)
  if (targetId) {
    const playerMap = new Map<string, Player>();
    players.forEach((p) => playerMap.set(p.id, p));

    const target = playerMap.get(targetId);
    if (!target) {
      return {
        valid: false,
        errorCode: 'TARGET_NOT_FOUND',
        errorMessage: 'Target player not found in game.',
      };
    }

    if (target.status !== 'ALIVE') {
      return {
        valid: false,
        errorCode: 'TARGET_ALREADY_ELIMINATED',
        errorMessage: 'Target player is already eliminated.',
      };
    }

    // Role-specific target constraints
    if (action === 'KILL' && target.role === 'MAFIA') {
      return {
        valid: false,
        errorCode: 'MAFIA_CANNOT_TARGET_MAFIA',
        errorMessage: 'Mafia members cannot target other Mafia members.',
      };
    }

    if (action === 'PROTECT' && target.id === actor.id) {
      const allowed = canDoctorSelfProtect(
        currentRound,
        doctorSelfProtectLastUsedRound,
        GAME_DEFAULTS.roles.doctorSelfProtectCooldown
      );
      if (!allowed) {
        return {
          valid: false,
          errorCode: 'DOCTOR_SELF_PROTECT_COOLDOWN',
          errorMessage: `Doctor cannot protect themselves. Cooldown is active (once every ${GAME_DEFAULTS.roles.doctorSelfProtectCooldown} rounds).`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validates a Voting submission.
 */
export function validateVotingSubmission(params: {
  currentPhase: GamePhase;
  voter: Player | null | undefined;
  targetId: string | null;
  players: Player[];
  hasAlreadyVoted?: boolean;
}): ActionValidationResult {
  const { currentPhase, voter, targetId, players, hasAlreadyVoted } = params;

  if (currentPhase !== 'VOTING') {
    return {
      valid: false,
      errorCode: 'INVALID_PHASE',
      errorMessage: `Votes are only allowed during the VOTING phase. Current phase is ${currentPhase}.`,
    };
  }

  if (!voter) {
    return {
      valid: false,
      errorCode: 'PLAYER_NOT_FOUND',
      errorMessage: 'Voter is not registered in this game.',
    };
  }

  if (voter.status !== 'ALIVE') {
    return {
      valid: false,
      errorCode: 'PLAYER_ELIMINATED',
      errorMessage: 'Eliminated players cannot vote.',
    };
  }

  if (hasAlreadyVoted) {
    return {
      valid: false,
      errorCode: 'DUPLICATE_VOTE',
      errorMessage: 'Player has already cast a vote for this round.',
    };
  }

  if (targetId) {
    if (targetId === voter.id) {
      return {
        valid: false,
        errorCode: 'SELF_VOTING_PROHIBITED',
        errorMessage: 'Self-voting is not allowed.',
      };
    }

    const playerMap = new Map<string, Player>();
    players.forEach((p) => playerMap.set(p.id, p));

    const target = playerMap.get(targetId);
    if (!target) {
      return {
        valid: false,
        errorCode: 'TARGET_NOT_FOUND',
        errorMessage: 'Voted target is not in this game.',
      };
    }

    if (target.status !== 'ALIVE') {
      return {
        valid: false,
        errorCode: 'TARGET_ALREADY_ELIMINATED',
        errorMessage: 'Cannot vote for an eliminated player.',
      };
    }
  }

  return { valid: true };
}
