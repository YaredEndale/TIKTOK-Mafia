import { describe, it, expect } from 'vitest';
import {
  canTransition,
  getNextPhase,
  calculatePhaseTimers,
  extendPhaseTimer,
  buildRolePool,
  assignRoles,
  resolveNightActions,
  canDoctorSelfProtect,
  validateVote,
  resolveVotes,
  checkWinCondition,
  validateNightActionSubmission,
  validateVotingSubmission,
  GAME_DEFAULTS,
  ROLE_DISTRIBUTIONS,
  Player,
} from '../lib/game-engine';

describe('Game Engine — Finite State Machine (FSM)', () => {
  it('allows standard sequential phase transitions', () => {
    expect(canTransition('LOBBY', 'PLAYER_SELECTION')).toBe(true);
    expect(canTransition('PLAYER_SELECTION', 'ROLE_ASSIGNMENT')).toBe(true);
    expect(canTransition('ROLE_ASSIGNMENT', 'NIGHT')).toBe(true);
    expect(canTransition('NIGHT', 'DAY')).toBe(true);
    expect(canTransition('DAY', 'DISCUSSION')).toBe(true);
    expect(canTransition('DISCUSSION', 'VOTING')).toBe(true);
    expect(canTransition('VOTING', 'REVEAL')).toBe(true);
    expect(canTransition('REVEAL', 'ELIMINATION')).toBe(true);
    expect(canTransition('ELIMINATION', 'WIN_CHECK')).toBe(true);
    expect(canTransition('WIN_CHECK', 'NIGHT')).toBe(true);
    expect(canTransition('WIN_CHECK', 'GAME_OVER')).toBe(true);
  });

  it('rejects invalid phase transitions', () => {
    expect(canTransition('LOBBY', 'NIGHT')).toBe(false);
    expect(canTransition('NIGHT', 'VOTING')).toBe(false);
    expect(canTransition('VOTING', 'NIGHT')).toBe(false);
    expect(canTransition('ROLE_ASSIGNMENT', 'DISCUSSION')).toBe(false);
  });

  it('allows moderator overrides to bypass standard transition constraints', () => {
    expect(canTransition('LOBBY', 'NIGHT', true)).toBe(true);
    expect(canTransition('NIGHT', 'LOBBY', true)).toBe(true);
    expect(canTransition('VOTING', 'GAME_OVER', true)).toBe(true);
  });

  it('correctly increments round when looping from WIN_CHECK back to NIGHT', () => {
    const next1 = getNextPhase('WIN_CHECK', { round: 1 });
    expect(next1.nextPhase).toBe('NIGHT');
    expect(next1.nextRound).toBe(2);

    const nextEnd = getNextPhase('WIN_CHECK', { round: 2, winner: 'MAFIA' });
    expect(nextEnd.nextPhase).toBe('GAME_OVER');
    expect(nextEnd.nextRound).toBe(2);
  });

  it('calculates server-authoritative timers according to GAME_DEFAULTS', () => {
    const nightTimer = calculatePhaseTimers('NIGHT');
    expect(nightTimer.durationSeconds).toBe(90);
    expect(nightTimer.phaseEndsAt).not.toBeNull();

    const discTimer = calculatePhaseTimers('DISCUSSION');
    expect(discTimer.durationSeconds).toBe(180);

    const voteTimer = calculatePhaseTimers('VOTING');
    expect(voteTimer.durationSeconds).toBe(60);

    const lobbyTimer = calculatePhaseTimers('LOBBY');
    expect(lobbyTimer.durationSeconds).toBeNull();
    expect(lobbyTimer.phaseEndsAt).toBeNull();
  });

  it('correctly extends phase timers', () => {
    const now = new Date();
    const originalEndsAt = new Date(now.getTime() + 30000).toISOString();
    const extended = extendPhaseTimer(originalEndsAt, 30);
    const diffMs = new Date(extended).getTime() - new Date(originalEndsAt).getTime();
    expect(diffMs).toBe(30000);
  });
});

describe('Game Engine — Role Assignment', () => {
  it('builds role pools for 5 to 12 players matching ROLE_DISTRIBUTIONS', () => {
    for (let count = 5; count <= 12; count++) {
      const pool = buildRolePool(count);
      const expected = ROLE_DISTRIBUTIONS[count];
      expect(pool.length).toBe(count);

      const mafia = pool.filter((r) => r === 'MAFIA').length;
      const detective = pool.filter((r) => r === 'DETECTIVE').length;
      const doctor = pool.filter((r) => r === 'DOCTOR').length;
      const citizen = pool.filter((r) => r === 'CITIZEN').length;

      expect(mafia).toBe(expected.mafia);
      expect(detective).toBe(expected.detective);
      expect(doctor).toBe(expected.doctor);
      expect(citizen).toBe(expected.citizen);
    }
  });

  it('assigns roles to 5 players correctly (1 Mafia, 1 Detective, 1 Doctor, 2 Citizens)', () => {
    const playerIds = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const assignments = assignRoles(playerIds);

    const assignedRoles = Object.values(assignments);
    expect(assignedRoles.length).toBe(5);
    expect(assignedRoles.filter((r) => r === 'MAFIA').length).toBe(1);
    expect(assignedRoles.filter((r) => r === 'DETECTIVE').length).toBe(1);
    expect(assignedRoles.filter((r) => r === 'DOCTOR').length).toBe(1);
    expect(assignedRoles.filter((r) => r === 'CITIZEN').length).toBe(2);
  });

  it('throws error when player count is outside 5-12 boundary', () => {
    expect(() => assignRoles(['p1', 'p2', 'p3', 'p4'])).toThrow();
    const thirteen = Array.from({ length: 13 }, (_, i) => `p${i}`);
    expect(() => assignRoles(thirteen)).toThrow();
  });
});

describe('Game Engine — Night Action Resolution', () => {
  const mockPlayers: Player[] = [
    { id: 'm1', game_id: 'g1', display_name: 'MafiaBoss', tiktok_username: 'm1', avatar_url: null, role: 'MAFIA', status: 'ALIVE', seat_number: 1, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'doc', game_id: 'g1', display_name: 'DrGood', tiktok_username: 'doc', avatar_url: null, role: 'DOCTOR', status: 'ALIVE', seat_number: 2, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'det', game_id: 'g1', display_name: 'Sherlock', tiktok_username: 'det', avatar_url: null, role: 'DETECTIVE', status: 'ALIVE', seat_number: 3, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'c1', game_id: 'g1', display_name: 'Citizen1', tiktok_username: 'c1', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 4, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'c2', game_id: 'g1', display_name: 'Citizen2', tiktok_username: 'c2', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 5, eliminated_at: null, eliminated_reason: null, joined_at: '' },
  ];

  it('resolves successful Mafia kill when Doctor does not protect target', () => {
    const result = resolveNightActions({
      mafiaTargetId: 'c1',
      doctorTargetId: 'c2',
      detectiveTargetId: 'm1',
      currentRound: 1,
      players: mockPlayers,
    });

    expect(result.eliminatedPlayerId).toBe('c1');
    expect(result.eliminatedPlayerName).toBe('Citizen1');
    expect(result.savedPlayerId).toBeNull();
    expect(result.detectiveResult).toEqual({
      targetId: 'm1',
      targetName: 'MafiaBoss',
      isMafia: true,
    });
  });

  it('resolves Doctor save when Doctor target matches Mafia target', () => {
    const result = resolveNightActions({
      mafiaTargetId: 'c1',
      doctorTargetId: 'c1', // Doctor protects the victim!
      detectiveTargetId: 'c2',
      currentRound: 1,
      players: mockPlayers,
    });

    expect(result.eliminatedPlayerId).toBeNull();
    expect(result.savedPlayerId).toBe('c1');
    expect(result.savedPlayerName).toBe('Citizen1');
    expect(result.detectiveResult?.isMafia).toBe(false);
  });

  it('enforces Doctor self-protect cooldown (once every 3 rounds)', () => {
    // Round 1: Doctor protects self -> Allowed
    expect(canDoctorSelfProtect(1, undefined, 3)).toBe(true);

    // Round 2: Doctor protects self -> Rejected (1 round elapsed)
    expect(canDoctorSelfProtect(2, 1, 3)).toBe(false);

    // Round 3: Doctor protects self -> Rejected (2 rounds elapsed)
    expect(canDoctorSelfProtect(3, 1, 3)).toBe(false);

    // Round 4: Doctor protects self -> Allowed (3 rounds elapsed)
    expect(canDoctorSelfProtect(4, 1, 3)).toBe(true);

    // If cooldown is violated during resolution, protection fails and mafia kill succeeds
    const result = resolveNightActions({
      mafiaTargetId: 'doc',
      doctorTargetId: 'doc', // Doctor tries self protect on cooldown
      detectiveTargetId: null,
      currentRound: 2,
      doctorSelfProtectLastUsedRound: 1, // used in round 1
      players: mockPlayers,
    });

    expect(result.savedPlayerId).toBeNull();
    expect(result.eliminatedPlayerId).toBe('doc');
  });
});

describe('Game Engine — Vote Counting and Tie Rule', () => {
  const mockPlayers: Player[] = [
    { id: 'p1', game_id: 'g1', display_name: 'Alice', tiktok_username: 'a', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 1, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'p2', game_id: 'g1', display_name: 'Bob', tiktok_username: 'b', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 2, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'p3', game_id: 'g1', display_name: 'Charlie', tiktok_username: 'c', avatar_url: null, role: 'MAFIA', status: 'ALIVE', seat_number: 3, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'p4', game_id: 'g1', display_name: 'Dave', tiktok_username: 'd', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 4, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'p5', game_id: 'g1', display_name: 'Eve', tiktok_username: 'e', avatar_url: null, role: 'DOCTOR', status: 'ALIVE', seat_number: 5, eliminated_at: null, eliminated_reason: null, joined_at: '' },
  ];

  it('eliminates player with clear plurality/majority', () => {
    const votes = [
      { voterId: 'p1', targetId: 'p3' },
      { voterId: 'p2', targetId: 'p3' },
      { voterId: 'p4', targetId: 'p3' },
      { voterId: 'p5', targetId: 'p2' },
      { voterId: 'p3', targetId: 'p2' },
    ];

    const result = resolveVotes(votes, mockPlayers, 1);
    expect(result.isTie).toBe(false);
    expect(result.eliminatedPlayerId).toBe('p3');
    expect(result.eliminatedPlayerName).toBe('Charlie');
    expect(result.maxVotes).toBe(3);
  });

  it('enforces NO_ELIMINATION rule on tied vote', () => {
    const votes = [
      { voterId: 'p1', targetId: 'p2' },
      { voterId: 'p3', targetId: 'p2' },
      { voterId: 'p2', targetId: 'p3' },
      { voterId: 'p4', targetId: 'p3' },
    ];

    const result = resolveVotes(votes, mockPlayers, 1, 'NO_ELIMINATION');
    expect(result.isTie).toBe(true);
    expect(result.eliminatedPlayerId).toBeNull();
    expect(result.announcement).toBe('NO ELIMINATION — VOTE WAS TIED');
  });

  it('rejects self-votes during validation and counting', () => {
    const check = validateVote({
      voterId: 'p1',
      targetId: 'p1',
      players: mockPlayers,
      allowSelfVote: false,
    });
    expect(check.valid).toBe(false);
    expect(check.error).toBe('Self-voting is prohibited.');

    // In count: self-votes are ignored
    const votesWithSelf = [
      { voterId: 'p1', targetId: 'p1' }, // ignored
      { voterId: 'p2', targetId: 'p3' },
    ];
    const result = resolveVotes(votesWithSelf, mockPlayers, 1);
    expect(result.eliminatedPlayerId).toBe('p3');
  });
});

describe('Game Engine — Win Conditions', () => {
  it('declares Village win when all Mafia are eliminated', () => {
    const players = [
      { id: '1', role: 'MAFIA' as const, status: 'ELIMINATED' as const },
      { id: '2', role: 'CITIZEN' as const, status: 'ALIVE' as const },
      { id: '3', role: 'DOCTOR' as const, status: 'ALIVE' as const },
      { id: '4', role: 'DETECTIVE' as const, status: 'ALIVE' as const },
    ];

    const result = checkWinCondition(players);
    expect(result.isGameOver).toBe(true);
    expect(result.winner).toBe('VILLAGE');
  });

  it('declares Mafia win when alive Mafia >= alive Village (parity)', () => {
    const players = [
      { id: '1', role: 'MAFIA' as const, status: 'ALIVE' as const },
      { id: '2', role: 'CITIZEN' as const, status: 'ALIVE' as const },
      { id: '3', role: 'CITIZEN' as const, status: 'ELIMINATED' as const },
    ];

    const result = checkWinCondition(players);
    expect(result.isGameOver).toBe(true);
    expect(result.winner).toBe('MAFIA');
  });

  it('continues game when Village outnumbers Mafia and Mafia is alive', () => {
    const players = [
      { id: '1', role: 'MAFIA' as const, status: 'ALIVE' as const },
      { id: '2', role: 'CITIZEN' as const, status: 'ALIVE' as const },
      { id: '3', role: 'DOCTOR' as const, status: 'ALIVE' as const },
      { id: '4', role: 'DETECTIVE' as const, status: 'ALIVE' as const },
    ];

    const result = checkWinCondition(players);
    expect(result.isGameOver).toBe(false);
    expect(result.winner).toBeNull();
  });
});

describe('Game Engine — Action Validation & Integrity', () => {
  const players: Player[] = [
    { id: 'm1', game_id: 'g1', display_name: 'M1', tiktok_username: 'm1', avatar_url: null, role: 'MAFIA', status: 'ALIVE', seat_number: 1, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'm2', game_id: 'g1', display_name: 'M2', tiktok_username: 'm2', avatar_url: null, role: 'MAFIA', status: 'ALIVE', seat_number: 2, eliminated_at: null, eliminated_reason: null, joined_at: '' },
    { id: 'dead', game_id: 'g1', display_name: 'Dead', tiktok_username: 'd', avatar_url: null, role: 'CITIZEN', status: 'ELIMINATED', seat_number: 3, eliminated_at: 'now', eliminated_reason: 'MAFIA_KILL', joined_at: '' },
    { id: 'c1', game_id: 'g1', display_name: 'C1', tiktok_username: 'c1', avatar_url: null, role: 'CITIZEN', status: 'ALIVE', seat_number: 4, eliminated_at: null, eliminated_reason: null, joined_at: '' },
  ];

  it('rejects Mafia targeting fellow Mafia', () => {
    const check = validateNightActionSubmission({
      currentPhase: 'NIGHT',
      currentRound: 1,
      actor: players[0],
      targetId: 'm2',
      action: 'KILL',
      players,
    });

    expect(check.valid).toBe(false);
    expect(check.errorCode).toBe('MAFIA_CANNOT_TARGET_MAFIA');
  });

  it('rejects night actions from eliminated players', () => {
    const check = validateNightActionSubmission({
      currentPhase: 'NIGHT',
      currentRound: 1,
      actor: players[2], // dead player
      targetId: 'c1',
      action: 'KILL',
      players,
    });

    expect(check.valid).toBe(false);
    expect(check.errorCode).toBe('PLAYER_ELIMINATED');
  });

  it('rejects actions submitted in incorrect phase', () => {
    const checkNightInDay = validateNightActionSubmission({
      currentPhase: 'DAY',
      currentRound: 1,
      actor: players[0],
      targetId: 'c1',
      action: 'KILL',
      players,
    });
    expect(checkNightInDay.valid).toBe(false);
    expect(checkNightInDay.errorCode).toBe('INVALID_PHASE');

    const checkVoteInNight = validateVotingSubmission({
      currentPhase: 'NIGHT',
      voter: players[3],
      targetId: 'm1',
      players,
    });
    expect(checkVoteInNight.valid).toBe(false);
    expect(checkVoteInNight.errorCode).toBe('INVALID_PHASE');
  });
});
