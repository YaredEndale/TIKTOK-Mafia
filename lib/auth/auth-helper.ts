/**
 * TikTok LIVE Mafia — Authentication & Authorization Helpers
 * Resolves whether an incoming API request is from a Moderator, a Player, or Public.
 */

import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '../supabase/server';

export interface AuthContext {
  isModerator: boolean;
  moderatorId: string | null;
  playerId: string | null;
  playerSessionId: string | null;
}

/**
 * Creates SHA-256 hash of a session token for secure DB storage & lookup.
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Authenticates request using Supabase Auth (for Moderator) or Session Token (for Player).
 */
export async function authenticateRequest(req: NextRequest, gameId?: string): Promise<AuthContext> {
  const adminClient = createAdminClient();

  // 1. Check for Moderator Session via Supabase Cookie or Auth Header
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if user is in moderators table
      const { data: moderator } = await adminClient
        .from('moderators')
        .select('id, user_id, role')
        .eq('user_id', user.id)
        .single();

      if (moderator) {
        return {
          isModerator: true,
          moderatorId: user.id,
          playerId: null,
          playerSessionId: null,
        };
      }
    }
  } catch {
    // Ignore cookie read failures in non-cookie contexts
  }

  // 1b. Check for Moderator Token, Room Admin Key, or Service Role Key
  const moderatorHeader = req.headers.get('x-moderator-token') || req.headers.get('x-moderator-key');
  if (moderatorHeader) {
    if (
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      moderatorHeader === process.env.SUPABASE_SERVICE_ROLE_KEY
    ) {
      return {
        isModerator: true,
        moderatorId: 'service-role',
        playerId: null,
        playerSessionId: null,
      };
    }

    if (gameId && (moderatorHeader === gameId || req.cookies.get(`mod_${gameId}`)?.value === gameId)) {
      const { data: validGame } = await adminClient
        .from('games')
        .select('id')
        .eq('id', gameId)
        .maybeSingle();

      if (validGame) {
        return {
          isModerator: true,
          moderatorId: `mod-${gameId}`,
          playerId: null,
          playerSessionId: null,
        };
      }
    }
  }

  // Check room host cookie
  if (gameId && req.cookies.get(`mod_${gameId}`)?.value === gameId) {
    const { data: validGame } = await adminClient
      .from('games')
      .select('id')
      .eq('id', gameId)
      .maybeSingle();

    if (validGame) {
      return {
        isModerator: true,
        moderatorId: `mod-${gameId}`,
        playerId: null,
        playerSessionId: null,
      };
    }
  }

  // 2. Check for Player Session Token via 'x-player-token' or Authorization Bearer
  const authHeader = req.headers.get('authorization');
  const tokenHeader = req.headers.get('x-player-token');

  let rawToken: string | null = null;
  if (tokenHeader) {
    rawToken = tokenHeader;
  } else if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7);
  }

  if (rawToken) {
    const tokenHash = await hashToken(rawToken);

    // Query active session
    const { data: session } = await adminClient
      .from('player_sessions')
      .select('id, player_id, expires_at, players!inner(game_id)')
      .eq('token_hash', tokenHash)
      .single();

    if (session) {
      const isExpired = new Date(session.expires_at).getTime() < Date.now();
      const belongsToGame = gameId ? (session.players as { game_id: string }).game_id === gameId : true;

      if (!isExpired && belongsToGame) {
        // Update last_seen asynchronously
        adminClient
          .from('player_sessions')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', session.id)
          .then();

        return {
          isModerator: false,
          moderatorId: null,
          playerId: session.player_id,
          playerSessionId: session.id,
        };
      }
    }
  }

  return {
    isModerator: false,
    moderatorId: null,
    playerId: null,
    playerSessionId: null,
  };
}
