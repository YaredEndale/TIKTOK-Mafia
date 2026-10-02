/**
 * TikTok LIVE Mafia — Realtime Client Subscriptions & Reconnect Manager
 * Handles WebSocket subscriptions, message routing, and automatic state reconciliation on reconnect.
 */

import { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '../supabase/client';
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

export interface SubscriptionStatus {
  status: 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';
}

export interface GameChannelCallbacks {
  onPhaseChange?: (payload: PhaseChangePayload) => void;
  onTimerSync?: (payload: TimerSyncPayload) => void;
  onPlayerEliminated?: (payload: PlayerEliminatedPayload) => void;
  onVoteCountUpdate?: (payload: VoteCountUpdatePayload) => void;
  onAnnouncement?: (payload: { id: string; message: string; timestamp: string; author?: string }) => void;
  onReconnect?: () => void;
  onStatusChange?: (status: SubscriptionStatus['status']) => void;
}

export interface PlayerChannelCallbacks {
  onRoleAssigned?: (payload: PrivateRoleAssignedPayload) => void;
  onInvestigationResult?: (payload: PrivateInvestigationPayload) => void;
  onEliminated?: (payload: { reason: string }) => void;
  onReconnect?: () => void;
}

export interface ModeratorChannelCallbacks extends GameChannelCallbacks {
  onClipMarked?: (payload: Record<string, unknown>) => void;
  onNightActionReceived?: (payload: Record<string, unknown>) => void;
}

/**
 * Subscribes to the public game channel for state updates and reconnect recovery.
 */
export function subscribeToGameChannel(
  gameId: string,
  callbacks: GameChannelCallbacks
): RealtimeChannel {
  const supabase = createClient();
  const channelName = CHANNELS.game(gameId);

  const channel = supabase.channel(channelName, {
    config: {
      broadcast: { ack: false },
    },
  });

  // Listen to broadcast events
  channel
    .on('broadcast', { event: REALTIME_EVENTS.PHASE_CHANGE }, (payload) => {
      callbacks.onPhaseChange?.(payload.payload as PhaseChangePayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.TIMER_SYNC }, (payload) => {
      callbacks.onTimerSync?.(payload.payload as TimerSyncPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.PLAYER_ELIMINATED }, (payload) => {
      callbacks.onPlayerEliminated?.(payload.payload as PlayerEliminatedPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.VOTE_COUNT_UPDATE }, (payload) => {
      callbacks.onVoteCountUpdate?.(payload.payload as VoteCountUpdatePayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.ANNOUNCEMENT }, (payload) => {
      callbacks.onAnnouncement?.(payload.payload as { id: string; message: string; timestamp: string; author?: string });
    });

  // Listen to postgres_changes on games table as backup sync
  channel.on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'games',
      filter: `id=eq.${gameId}`,
    },
    () => {
      callbacks.onReconnect?.();
    }
  );

  channel.subscribe((status) => {
    callbacks.onStatusChange?.(status);
    if (status === 'SUBSCRIBED') {
      // Upon successful reconnect, re-sync snapshot
      callbacks.onReconnect?.();
    }
  });

  return channel;
}

/**
 * Subscribes to the public LIVE overlay channel (optimized for 9:16 vertical broadcast).
 */
export function subscribeToOverlayChannel(
  gameId: string,
  callbacks: GameChannelCallbacks
): RealtimeChannel {
  return subscribeToGameChannel(gameId, callbacks);
}

/**
 * Subscribes to private player notifications (role assignment, teammate list, detective results).
 */
export function subscribeToPlayerChannel(
  sessionId: string,
  callbacks: PlayerChannelCallbacks
): RealtimeChannel {
  const supabase = createClient();
  const channelName = CHANNELS.player(sessionId);

  const channel = supabase.channel(channelName, {
    config: { broadcast: { ack: false } },
  });

  channel
    .on('broadcast', { event: REALTIME_EVENTS.ROLE_ASSIGNED }, (payload) => {
      callbacks.onRoleAssigned?.(payload.payload as PrivateRoleAssignedPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.INVESTIGATION_RESULT }, (payload) => {
      callbacks.onInvestigationResult?.(payload.payload as PrivateInvestigationPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.YOUR_ELIMINATION }, (payload) => {
      callbacks.onEliminated?.(payload.payload as { reason: string });
    });

  channel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      callbacks.onReconnect?.();
    }
  });

  return channel;
}

/**
 * Subscribes to moderator-only channel.
 */
export function subscribeToModeratorChannel(
  gameId: string,
  callbacks: ModeratorChannelCallbacks
): RealtimeChannel {
  const supabase = createClient();
  const channelName = CHANNELS.moderator(gameId);

  const channel = supabase.channel(channelName, {
    config: { broadcast: { ack: false } },
  });

  channel
    .on('broadcast', { event: REALTIME_EVENTS.PHASE_CHANGE }, (payload) => {
      callbacks.onPhaseChange?.(payload.payload as PhaseChangePayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.TIMER_SYNC }, (payload) => {
      callbacks.onTimerSync?.(payload.payload as TimerSyncPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.PLAYER_ELIMINATED }, (payload) => {
      callbacks.onPlayerEliminated?.(payload.payload as PlayerEliminatedPayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.VOTE_COUNT_UPDATE }, (payload) => {
      callbacks.onVoteCountUpdate?.(payload.payload as VoteCountUpdatePayload);
    })
    .on('broadcast', { event: REALTIME_EVENTS.CLIP_MARKED }, (payload) => {
      callbacks.onClipMarked?.(payload.payload as Record<string, unknown>);
    });

  // Listen to postgres_changes on players table so lobby roster updates live
  channel.on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'players',
      filter: `game_id=eq.${gameId}`,
    },
    () => {
      callbacks.onReconnect?.();
    }
  );

  channel.subscribe((status) => {
    callbacks.onStatusChange?.(status);
    if (status === 'SUBSCRIBED') {
      callbacks.onReconnect?.();
    }
  });

  return channel;
}
