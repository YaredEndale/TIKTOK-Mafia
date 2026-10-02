import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { broadcastAnnouncement } from '@/lib/realtime/broadcaster';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;
    const body = await req.json();
    const { message, author = 'PRODUCER' } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Announcement message is required' }, { status: 400 });
    }

    const trimmedMessage = message.trim().slice(0, 200); // 200 char max for live ticker

    // Insert into events table
    const { data: event, error: eventError } = await adminClient
      .from('events')
      .insert({
        game_id: gameId,
        type: 'ANNOUNCEMENT',
        metadata: {
          message: trimmedMessage,
          author,
        },
        visibility: 'PUBLIC',
      })
      .select()
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: eventError?.message || 'Failed to save announcement' }, { status: 500 });
    }

    const payload = {
      id: event.id,
      message: trimmedMessage,
      timestamp: event.timestamp,
      author,
    };

    // Broadcast across overlay and clients
    await broadcastAnnouncement(gameId, payload);

    return NextResponse.json({ success: true, announcement: payload });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const adminClient = createAdminClient();
    const gameId = params.id;

    const { data: rawEvents, error } = await adminClient
      .from('events')
      .select('*')
      .eq('game_id', gameId)
      .eq('type', 'ANNOUNCEMENT')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const announcements = (rawEvents || []).map((e) => ({
      id: e.id,
      message: (e.metadata as { message?: string })?.message || '',
      author: (e.metadata as { author?: string })?.author || 'PRODUCER',
      timestamp: e.timestamp,
    }));

    return NextResponse.json({ announcements });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
