export type SSEClient = {
  id: string; // userId
  controller: ReadableStreamDefaultController;
};

// Global registry to persist connections across Hot Modules Replacement in dev
const globalForSSE = globalThis as unknown as { sseClients: SSEClient[] };
if (!globalForSSE.sseClients) {
  globalForSSE.sseClients = [];
}

export const sseClients = globalForSSE.sseClients;

export function addSSEClient(userId: string, controller: ReadableStreamDefaultController) {
  // Clear any stale controller for the same user to avoid duplicate deliveries
  const index = sseClients.findIndex((c) => c.id === userId);
  if (index !== -1) {
    try {
      sseClients[index].controller.close();
    } catch (_) {}
    sseClients.splice(index, 1);
  }
  sseClients.push({ id: userId, controller });
  console.log(`[SSE Client Connected] User: ${userId}. Active clients: ${sseClients.length}`);
}

export function removeSSEClient(controller: ReadableStreamDefaultController) {
  const index = sseClients.findIndex((c) => c.controller === controller);
  if (index !== -1) {
    const client = sseClients[index];
    sseClients.splice(index, 1);
    console.log(`[SSE Client Disconnected] User: ${client.id}. Active clients: ${sseClients.length}`);
  }
}

export function sendSSEMessage(userId: string, event: string, data: any) {
  const targetClients = sseClients.filter((c) => c.id === userId);
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  
  targetClients.forEach((client) => {
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch (err) {
      removeSSEClient(client.controller);
    }
  });
}

export function broadcastSSEMessage(event: string, data: any) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoder = new TextEncoder();
  
  sseClients.forEach((client) => {
    try {
      client.controller.enqueue(encoder.encode(payload));
    } catch (err) {
      removeSSEClient(client.controller);
    }
  });
}
