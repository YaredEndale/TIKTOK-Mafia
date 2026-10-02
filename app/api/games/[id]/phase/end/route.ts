import { NextRequest } from 'next/server';
import { POST as advancePhase } from '../start/route';

/**
 * Convenience endpoint for ending the current phase early.
 * Delegates to the phase advancement handler.
 */
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  return advancePhase(req, context);
}
