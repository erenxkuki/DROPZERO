import express from 'express';
import { createServer } from 'node:http';
import { parse } from 'node:url';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const isProd = process.env.NODE_ENV === 'production';
const PORT = parseInt(process.env.PORT || '3000', 10);
const SESSION_TTL_MS = parseInt(process.env.DROPZERO_SESSION_TTL_MS || '600000', 10);
const MAX_MSGS_PER_WINDOW = parseInt(process.env.DROPZERO_MAX_SIGNALING_RATE || '120', 10);
const RATE_WINDOW_MS = 10_000;
const MAX_SIGNAL_PAYLOAD_BYTES = 256 * 1024;
const MAX_RELAY_FRAME_BYTES = 2 * 1024 * 1024;

interface PeerInfo {
  peerId: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  publicKeyJwk: JsonWebKey;
  capabilities: string[];
  ws: WebSocket;
}

interface PairingSession {
  sessionId: string;
  pairingCode: string;
  mode: 'send' | 'receive';
  createdAt: number;
  expiresAt: number;
  host: PeerInfo;
  guest: PeerInfo | null;
  discoverable: boolean;
}

interface RateBucket {
  count: number;
  windowStart: number;
}

const sessionsByCode = new Map<string, PairingSession>();
const sessionsById = new Map<string, PairingSession>();
const clientSessions = new Map<WebSocket, string>();
const rateBuckets = new Map<WebSocket, RateBucket>();
const connectedClients = new Set<WebSocket>();
const serverStartedAt = Date.now();

function checkRateLimit(ws: WebSocket): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ws);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    rateBuckets.set(ws, { count: 1, windowStart: now });
    return true;
  }
  if (bucket.count >= MAX_MSGS_PER_WINDOW) {
    return false;
  }
  bucket.count += 1;
  return true;
}

function sendJson(ws: WebSocket, payload: Record<string, unknown>) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}

function getPublicDiscoverableSessions() {
  const now = Date.now();
  const list: Array<{
    pairingCode: string;
    mode: 'send' | 'receive';
    deviceName: string;
    deviceType: string;
    platform: string;
    expiresAt: number;
  }> = [];

  for (const session of sessionsById.values()) {
    if (session.discoverable && !session.guest && session.expiresAt > now) {
      list.push({
        pairingCode: session.pairingCode,
        mode: session.mode,
        deviceName: session.host.deviceName,
        deviceType: session.host.deviceType,
        platform: session.host.platform,
        expiresAt: session.expiresAt,
      });
    }
  }
  return list;
}

function broadcastDiscovery() {
  const sessions = getPublicDiscoverableSessions();
  for (const client of connectedClients) {
    if (client.readyState === WebSocket.OPEN) {
      sendJson(client, {
        type: 'discovery:sessions',
        sessions,
      });
    }
  }
}

function cleanupPeer(ws: WebSocket, reason = 'peer_disconnected') {
  rateBuckets.delete(ws);
  const sessionId = clientSessions.get(ws);
  if (!sessionId) return;
  clientSessions.delete(ws);

  const session = sessionsById.get(sessionId);
  if (!session) return;

  if (session.host.ws === ws) {
    if (session.guest) {
      sendJson(session.guest.ws, {
        type: 'session:ended',
        sessionId: session.sessionId,
        reason,
      });
      clientSessions.delete(session.guest.ws);
    }
    sessionsById.delete(session.sessionId);
    sessionsByCode.delete(session.pairingCode);
    broadcastDiscovery();
  } else if (session.guest && session.guest.ws === ws) {
    session.guest = null;
    sendJson(session.host.ws, {
      type: 'peer:left',
      sessionId: session.sessionId,
      reason,
    });
    broadcastDiscovery();
  }
}

setInterval(() => {
  const now = Date.now();
  let expiredAny = false;
  for (const [sessionId, session] of sessionsById.entries()) {
    if (now > session.expiresAt) {
      expiredAny = true;
      sendJson(session.host.ws, { type: 'session:expired', sessionId });
      if (session.guest) {
        sendJson(session.guest.ws, { type: 'session:expired', sessionId });
        clientSessions.delete(session.guest.ws);
      }
      clientSessions.delete(session.host.ws);
      sessionsById.delete(sessionId);
      sessionsByCode.delete(session.pairingCode);
    }
  }
  if (expiredAny) broadcastDiscovery();
}, 15_000).unref();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'dropzero-signaling',
      uptimeMs: Date.now() - serverStartedAt,
      activeSessions: sessionsById.size,
      sessionTtlMs: SESSION_TTL_MS,
    });
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get(/.*/, (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: MAX_RELAY_FRAME_BYTES,
  });

  httpServer.on('upgrade', (request, socket, head) => {
    const { pathname } = parse(request.url || '/', true);
    if (pathname === '/ws/signaling') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    connectedClients.add(ws);
    sendJson(ws, {
      type: 'discovery:sessions',
      sessions: getPublicDiscoverableSessions(),
    });

    ws.on('message', (rawData, isBinary) => {
      if (!checkRateLimit(ws)) {
        sendJson(ws, {
          type: 'error',
          code: 'RATE_LIMITED',
          message: 'Signaling rate limit exceeded.',
        });
        return;
      }

      if (isBinary) {
        const sessionId = clientSessions.get(ws);
        if (!sessionId) return;
        const session = sessionsById.get(sessionId);
        if (!session || !session.guest) return;
        const target = session.host.ws === ws ? session.guest.ws : session.host.ws;
        if (target.readyState === WebSocket.OPEN) {
          target.send(rawData, { binary: true });
        }
        return;
      }

      const text = rawData.toString('utf8');
      if (text.length > MAX_RELAY_FRAME_BYTES) {
        sendJson(ws, {
          type: 'error',
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Frame exceeds maximum allowed bounds.',
        });
        return;
      }

      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(text) as Record<string, unknown>;
      } catch {
        sendJson(ws, {
          type: 'error',
          code: 'MALFORMED_MESSAGE',
          message: 'Invalid JSON signaling payload.',
        });
        return;
      }

      const type = typeof msg.type === 'string' ? msg.type : '';
      if (type !== 'relay:packet' && text.length > MAX_SIGNAL_PAYLOAD_BYTES) {
        sendJson(ws, {
          type: 'error',
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Signaling message exceeds allowed bounds.',
        });
        return;
      }

      switch (type) {
        case 'ping':
          sendJson(ws, { type: 'pong', ts: Date.now() });
          break;

        case 'discovery:list':
          sendJson(ws, {
            type: 'discovery:sessions',
            sessions: getPublicDiscoverableSessions(),
          });
          break;

        case 'session:create': {
          cleanupPeer(ws, 'replaced_session');
          const rawCode =
            typeof msg.pairingCode === 'string' ? msg.pairingCode.trim().toUpperCase() : '';
          if (!/^[A-Z0-9]{6}$/.test(rawCode)) {
            sendJson(ws, {
              type: 'error',
              code: 'INVALID_PAIRING_CODE',
              message: 'Pairing code must be 6 alphanumeric characters.',
            });
            return;
          }
          if (sessionsByCode.has(rawCode)) {
            sendJson(ws, {
              type: 'error',
              code: 'PAIRING_COLLISION',
              message: 'Pairing code already active.',
            });
            return;
          }

          const device = (msg.device || {}) as Record<string, unknown>;
          const peerId = randomUUID();
          const sessionId = randomUUID();
          const now = Date.now();
          const expiresAt = now + SESSION_TTL_MS;

          const host: PeerInfo = {
            peerId,
            deviceName: String(device.name || 'Browser Device').slice(0, 64),
            deviceType: String(device.type || 'Browser').slice(0, 32),
            platform: String(device.platform || 'Web').slice(0, 32),
            publicKeyJwk: (msg.publicKeyJwk || {}) as JsonWebKey,
            capabilities: Array.isArray(device.capabilities)
              ? device.capabilities.slice(0, 12).map((c) => String(c))
              : ['webrtc', 'blake3'],
            ws,
          };

          const session: PairingSession = {
            sessionId,
            pairingCode: rawCode,
            mode: msg.mode === 'receive' ? 'receive' : 'send',
            createdAt: now,
            expiresAt,
            host,
            guest: null,
            discoverable: Boolean(msg.discoverable),
          };

          sessionsById.set(sessionId, session);
          sessionsByCode.set(rawCode, session);
          clientSessions.set(ws, sessionId);

          sendJson(ws, {
            type: 'session:created',
            sessionId,
            pairingCode: rawCode,
            peerId,
            expiresAt,
          });
          broadcastDiscovery();
          break;
        }

        case 'session:join': {
          cleanupPeer(ws, 'joined_another_session');
          const code =
            typeof msg.pairingCode === 'string' ? msg.pairingCode.trim().toUpperCase() : '';
          const session = sessionsByCode.get(code);

          if (!session) {
            sendJson(ws, {
              type: 'error',
              code: 'PEER_NOT_FOUND',
              message: 'No active session found for that pairing code.',
            });
            return;
          }
          if (Date.now() > session.expiresAt) {
            sendJson(ws, {
              type: 'error',
              code: 'PAIRING_EXPIRED',
              message: 'This pairing session has expired.',
            });
            return;
          }
          if (session.guest) {
            sendJson(ws, {
              type: 'error',
              code: 'SESSION_OCCUPIED',
              message: 'Another peer has already paired with this session.',
            });
            return;
          }

          const device = (msg.device || {}) as Record<string, unknown>;
          const guestPeerId = randomUUID();
          const guest: PeerInfo = {
            peerId: guestPeerId,
            deviceName: String(device.name || 'Browser Device').slice(0, 64),
            deviceType: String(device.type || 'Browser').slice(0, 32),
            platform: String(device.platform || 'Web').slice(0, 32),
            publicKeyJwk: (msg.publicKeyJwk || {}) as JsonWebKey,
            capabilities: Array.isArray(device.capabilities)
              ? device.capabilities.slice(0, 12).map((c) => String(c))
              : ['webrtc', 'blake3'],
            ws,
          };

          session.guest = guest;
          clientSessions.set(ws, session.sessionId);

          sendJson(ws, {
            type: 'session:joined',
            sessionId: session.sessionId,
            pairingCode: session.pairingCode,
            mode: session.mode,
            peerId: guestPeerId,
            expiresAt: session.expiresAt,
            remotePeer: {
              peerId: session.host.peerId,
              deviceName: session.host.deviceName,
              deviceType: session.host.deviceType,
              platform: session.host.platform,
              publicKeyJwk: session.host.publicKeyJwk,
              capabilities: session.host.capabilities,
            },
          });

          sendJson(session.host.ws, {
            type: 'peer:joined',
            sessionId: session.sessionId,
            remotePeer: {
              peerId: guest.peerId,
              deviceName: guest.deviceName,
              deviceType: guest.deviceType,
              platform: guest.platform,
              publicKeyJwk: guest.publicKeyJwk,
              capabilities: guest.capabilities,
            },
          });
          broadcastDiscovery();
          break;
        }

        case 'signal:relay': {
          const sessionId = clientSessions.get(ws);
          if (!sessionId) return;
          const session = sessionsById.get(sessionId);
          if (!session || !session.guest) return;
          const targetWs = session.host.ws === ws ? session.guest.ws : session.host.ws;
          const fromPeerId = session.host.ws === ws ? session.host.peerId : session.guest.peerId;
          sendJson(targetWs, {
            type: 'signal:relay',
            sessionId,
            fromPeerId,
            signalType: msg.signalType,
            payload: msg.payload,
          });
          break;
        }

        case 'relay:packet': {
          const sessionId = clientSessions.get(ws);
          if (!sessionId) return;
          const session = sessionsById.get(sessionId);
          if (!session || !session.guest) return;
          const targetWs = session.host.ws === ws ? session.guest.ws : session.host.ws;
          sendJson(targetWs, {
            type: 'relay:packet',
            sessionId,
            iv: msg.iv,
            ciphertext: msg.ciphertext,
            seq: msg.seq,
          });
          break;
        }

        case 'session:leave':
          cleanupPeer(ws, 'user_cancelled');
          break;

        default:
          sendJson(ws, {
            type: 'error',
            code: 'UNKNOWN_MESSAGE_TYPE',
            message: 'Unsupported signaling message type.',
          });
      }
    });

    ws.on('close', () => {
      connectedClients.delete(ws);
      cleanupPeer(ws, 'socket_closed');
    });
    ws.on('error', () => {
      connectedClients.delete(ws);
      cleanupPeer(ws, 'socket_error');
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`> DROPZERO listening on http://0.0.0.0:${PORT} (ws /ws/signaling)`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start DROPZERO server:', err);
  process.exit(1);
});
