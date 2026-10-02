import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { authenticateRequest } from '@/lib/auth/auth-helper';
import { CLIP_CATEGORIES, ClipCategory, ClipMarker } from '@/lib/game-engine';
import { broadcastClipMarked } from '@/lib/realtime/broadcaster';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;
    const auth = await authenticateRequest(req, gameId);

    if (!auth.isModerator) {
      return NextResponse.json({ error: 'Unauthorized. Moderator or Producer access required.' }, { status: 403 });
    }

    const body = await req.json();
    const { category, description, timestamp } = body;

    if (!category || !CLIP_CATEGORIES.includes(category as ClipCategory)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${CLIP_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    const clipTimestamp = timestamp || new Date().toISOString();

    const { data: clip, error: clipError } = await adminClient
      .from('clips')
      .insert({
        game_id: gameId,
        category,
        description: description || null,
        timestamp: clipTimestamp,
        created_by: auth.moderatorId !== 'dev-moderator' ? auth.moderatorId : null,
      })
      .select()
      .single();

    if (clipError || !clip) {
      return NextResponse.json({ error: clipError?.message || 'Failed to save clip' }, { status: 500 });
    }

    // Emit CLIP_MARKED event
    await adminClient.from('events').insert({
      game_id: gameId,
      type: 'CLIP_MARKED',
      metadata: {
        clipId: clip.id,
        category: clip.category,
        description: clip.description,
        timestamp: clip.timestamp,
      },
      visibility: 'PUBLIC',
    });

    broadcastClipMarked(gameId, clip as unknown as ClipMarker).then();

    return NextResponse.json({ success: true, clip });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;

    const { data: clips, error } = await adminClient
      .from('clips')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ clips: clips || [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
