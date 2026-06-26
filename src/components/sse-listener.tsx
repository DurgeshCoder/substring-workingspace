'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

export default function SSEListener() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user?.id) return;

    const eventSource = new EventSource('/api/notifications/sse');

    eventSource.addEventListener('notification', (event) => {
      try {
        const data = JSON.parse(event.data);
        toast.info(data.title, {
          description: data.message,
          duration: 5000,
        });
      } catch (err) {
        console.error('Failed to parse SSE event data:', err);
      }
    });

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
    };

    return () => {
      eventSource.close();
    };
  }, [session?.user?.id]);

  return null;
}
