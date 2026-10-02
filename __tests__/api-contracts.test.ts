import { describe, it, expect } from 'vitest';
import { hashToken } from '../lib/auth/auth-helper';
import { asGame, asGameConfiguration, asPlayer } from '../lib/game-engine';

describe('API Security & Domain Contracts', () => {
  it('hashes player session tokens deterministically via SHA-256', async () => {
    const token = 'sample-secret-token-12345';
    const hash1 = await hashToken(token);
    const hash2 = await hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // SHA-256 hex string is 64 characters
    expect(hash1).not.toBe(token);
  });

  it('safely adapts raw database rows to domain models', () => {
    const rawPlayer = {
      id: 'p-1',
      game_id: 'g-1',
      display_name: 'Detective Conan',
      tiktok_username: 'conan',
      avatar_url: null,
      role: 'DETECTIVE',
      status: 'ALIVE',
      seat_number: 1,
      eliminated_at: null,
      eliminated_reason: null,
      joined_at: '2026-10-02T00:00:00Z',
    };

    const player = asPlayer(rawPlayer);
    expect(player.id).toBe('p-1');
    expect(player.role).toBe('DETECTIVE');
    expect(player.status).toBe('ALIVE');
  });

  it('safely adapts game configuration JSON and fills missing defaults', () => {
    const partialConfig = {
      timers: { night: 75 }, // custom night duration
    };

    const config = asGameConfiguration(partialConfig);
    expect(config.timers.night).toBe(75);
    expect(config.timers.discussion).toBe(180); // defaulted from GAME_DEFAULTS
    expect(config.voting.tieRule).toBe('NO_ELIMINATION'); // defaulted
    expect(config.roles.doctorSelfProtectCooldown).toBe(3); // defaulted
  });

  it('adapts raw game rows to domain Game object', () => {
    const rawGame = {
      id: 'g-1',
      code: 'XYZ987',
      status: 'IN_PROGRESS',
      phase: 'NIGHT',
      round: 1,
      phase_started_at: '2026-10-02T00:00:00Z',
      phase_ends_at: '2026-10-02T00:01:30Z',
      configuration: null,
      winner: null,
      moderator_id: null,
      created_at: '2026-10-02T00:00:00Z',
      started_at: '2026-10-02T00:00:00Z',
      ended_at: null,
    };

    const game = asGame(rawGame);
    expect(game.code).toBe('XYZ987');
    expect(game.phase).toBe('NIGHT');
    expect(game.configuration.timers.night).toBe(90);
  });
});
