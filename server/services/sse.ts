import { Response } from 'express';
import { UserRole } from '../db/store.js';

interface SSEClient {
  id: string;
  res: Response;
  role: UserRole;
  authorId?: string;
  ticketId?: string; // if listening to a specific ticket
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();

  constructor() {
    // Send heartbeat every 25 seconds
    setInterval(() => {
      this.broadcastHeartbeat();
    }, 25000);
  }

  public register(client: SSEClient) {
    this.clients.set(client.id, client);

    // Initial connection comment
    client.res.write(`: connected to BookLeaf event stream\n\n`);

    client.res.on('close', () => {
      this.clients.delete(client.id);
    });
  }

  public unregister(clientId: string) {
    this.clients.delete(clientId);
  }

  private broadcastHeartbeat() {
    for (const [id, client] of this.clients.entries()) {
      try {
        client.res.write(`: heartbeat ${Date.now()}\n\n`);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  /**
   * Broadcast an event safely checking role and ticket ownership
   */
  public broadcastTicketEvent(params: {
    eventType: string;
    ticketId: string;
    ticketAuthorId: string;
    data: any;
    isInternalOnly?: boolean;
  }) {
    const { eventType, ticketId, ticketAuthorId, data, isInternalOnly = false } = params;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      try {
        // If event is internal (like internal note), ONLY admins get it
        if (isInternalOnly && client.role !== 'admin') {
          continue;
        }

        // If client is listening to a specific ticket, verify ticketId
        if (client.ticketId && client.ticketId !== ticketId) {
          continue;
        }

        // If client is an author, verify ticket belongs to this author
        if (client.role === 'author') {
          if (client.authorId !== ticketAuthorId) {
            continue;
          }
        }

        client.res.write(payload);
      } catch (err) {
        this.clients.delete(id);
      }
    }
  }

  /**
   * Broadcast an admin queue change (e.g. ticket created, status changed)
   */
  public broadcastAdminQueueEvent(eventType: string, data: any) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;

    for (const [id, client] of this.clients.entries()) {
      if (client.role === 'admin') {
        try {
          client.res.write(payload);
        } catch (err) {
          this.clients.delete(id);
        }
      }
    }
  }
}

export const sseManager = new SSEManager();
