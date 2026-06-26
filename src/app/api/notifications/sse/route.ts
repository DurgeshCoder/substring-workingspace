import { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { addSSEClient, removeSSEClient } from '@/lib/sse';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const userId = session.user.id;

  const responseStream = new ReadableStream({
    start(controller) {
      // Add client connection
      addSSEClient(userId, controller);

      // Keep connection alive with a 15-second heartbeat
      const interval = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(': keep-alive\n\n'));
        } catch (err) {
          clearInterval(interval);
          removeSSEClient(controller);
        }
      }, 15000);

      // Clean up on connection close/abort
      req.signal.addEventListener('abort', () => {
        clearInterval(interval);
        removeSSEClient(controller);
      });
    },
    cancel() {
      // Controller level cancel
    },
  });

  return new Response(responseStream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
