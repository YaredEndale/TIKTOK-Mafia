import { describe, it, expect } from 'vitest';
import { CHANNELS, REALTIME_EVENTS } from '../lib/realtime';

describe('Realtime Channels & Event Contracts', () => {
  it('formats channel names according to architecture specification', () => {
    const gameId = 'game-uuid-1234';
    const sessionId = 'session-uuid-5678';

    expect(CHANNELS.game(gameId)).toBe('game:game-uuid-1234');
    expect(CHANNELS.overlay(gameId)).toBe('overlay:game-uuid-1234');
    expect(CHANNELS.moderator(gameId)).toBe('moderator:game-uuid-1234');
    expect(CHANNELS.player(sessionId)).toBe('player:session-uuid-5678');
  });

  it('contains all required realtime event types', () => {
    expect(REALTIME_EVENTS.PHASE_CHANGE).toBe('phase_change');
    expect(REALTIME_EVENTS.TIMER_SYNC).toBe('timer_sync');
    expect(REALTIME_EVENTS.PLAYER_ELIMINATED).toBe('player_eliminated');
    expect(REALTIME_EVENTS.ROLE_ASSIGNED).toBe('role_assigned');
    expect(REALTIME_EVENTS.VOTE_COUNT_UPDATE).toBe('vote_count_update');
    expect(REALTIME_EVENTS.CLIP_MARKED).toBe('clip_marked');
  });
});
