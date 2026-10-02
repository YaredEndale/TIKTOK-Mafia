/**
 * TikTok LIVE Mafia — Realtime Server Broadcaster
 * Sends server-authoritative WebSocket broadcast messages via Supabase Realtime channels.
 */

import { createAdminClient } from '../supabase/server';
import {
  CHANNELS,
  REALTIME_EVENTS,
  PhaseChangePayload,
  TimerSyncPayload,
  PlayerEliminatedPayload,
  VoteCountUpdatePayload,
  PrivateRoleAssignedPayload,
  PrivateInvestigationPayload,
} from './channels';
import { ClipMarker } from '../game-engine';

/**
 * Sends a generic broadcast message to a Supabase Realtime channel.
 */
export async function sendBroadcast<T extends Record<string, unknown>>(
  channelName: string,
  event: string,
  payload: T
): Promise<void> {
  try {
    const adminClient = createAdminClient();
    const channel = adminClient.channel(channelName);

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  } catch (err) {
    // Non-blocking catch to ensure API response succeeds even if socket drops
    console.error(`[Realtime Broadcast Error] Channel: ${channelName}, Event: ${event}`, err);
  }
}

/**
 * Broadcasts phase changes to public game channel and overlay.
 */
export async function broadcastPhaseChange(
  gameId: string,
  payload: PhaseChangePayload
): Promise<void> {
  await Promise.all([
    sendBroadcast(CHANNELS.game(gameId), REALTIME_EVENTS.PHASE_CHANGE, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.overlay(gameId), REALTIME_EVENTS.PHASE_CHANGE, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.moderator(gameId), REALTIME_EVENTS.PHASE_CHANGE, payload as unknown as Record<string, unknown>),
  ]);
}

/**
 * Broadcasts timer extension (+30s, etc.) across all clients.
 */
export async function broadcastTimerSync(
  gameId: string,
  payload: TimerSyncPayload
): Promise<void> {
  await Promise.all([
    sendBroadcast(CHANNELS.game(gameId), REALTIME_EVENTS.TIMER_SYNC, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.overlay(gameId), REALTIME_EVENTS.TIMER_SYNC, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.moderator(gameId), REALTIME_EVENTS.TIMER_SYNC, payload as unknown as Record<string, unknown>),
  ]);
}

/**
 * Broadcasts a player elimination (with revealed role if rule enabled).
 */
export async function broadcastPlayerEliminated(
  gameId: string,
  payload: PlayerEliminatedPayload
): Promise<void> {
  await Promise.all([
    sendBroadcast(CHANNELS.game(gameId), REALTIME_EVENTS.PLAYER_ELIMINATED, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.overlay(gameId), REALTIME_EVENTS.PLAYER_ELIMINATED, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.moderator(gameId), REALTIME_EVENTS.PLAYER_ELIMINATED, payload as unknown as Record<string, unknown>),
  ]);
}

/**
 * Broadcasts vote count updates (voted count / total alive players).
 */
export async function broadcastVoteCountUpdate(
  gameId: string,
  payload: VoteCountUpdatePayload
): Promise<void> {
  await Promise.all([
    sendBroadcast(CHANNELS.game(gameId), REALTIME_EVENTS.VOTE_COUNT_UPDATE, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.overlay(gameId), REALTIME_EVENTS.VOTE_COUNT_UPDATE, payload as unknown as Record<string, unknown>),
    sendBroadcast(CHANNELS.moderator(gameId), REALTIME_EVENTS.VOTE_COUNT_UPDATE, payload as unknown as Record<string, unknown>),
  ]);
}

/**
 * Broadcasts private role assignment to a specific player's private channel.
 */
export async function broadcastPrivateRole(
  sessionId: string,
  payload: PrivateRoleAssignedPayload
): Promise<void> {
  await sendBroadcast(
    CHANNELS.player(sessionId),
    REALTIME_EVENTS.ROLE_ASSIGNED,
    payload as unknown as Record<string, unknown>
  );
}

/**
 * Broadcasts private investigation result to detective's private channel.
 */
export async function broadcastPrivateInvestigation(
  sessionId: string,
  payload: PrivateInvestigationPayload
): Promise<void> {
  await sendBroadcast(
    CHANNELS.player(sessionId),
    REALTIME_EVENTS.INVESTIGATION_RESULT,
    payload as unknown as Record<string, unknown>
  );
}

/**
 * Broadcasts a new clip marker to the moderator and producer channels.
 */
export async function broadcastClipMarked(
  gameId: string,
  clip: ClipMarker
): Promise<void> {
  await sendBroadcast(
    CHANNELS.moderator(gameId),
    REALTIME_EVENTS.CLIP_MARKED,
    clip as unknown as Record<string, unknown>
  );
}
