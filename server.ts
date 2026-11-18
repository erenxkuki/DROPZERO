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
const MAX_MSGS_PER_WINDOW = parseInt(process.env.DROPZERO_MAX_SIGNALING_RATE || '180', 10);
const MAX_RELAY_PER_WINDOW = parseInt(process.env.DROPZERO_MAX_RELAY_RATE || '4000', 10);
const RATE_WINDOW_MS = 10_000;
const MAX_SIGNAL_PAYLOAD_BYTES = 256 * 1024;
const MAX_RELAY_FRAME_BYTES = 2 * 1024 * 1024;
const HTTP_CLIENT_IDLE_MS = 45_000;
const HTTP_POLL_HOLD_MS = 12_000;

interface SignalingClient {
  id: string;
  transport: 'ws' | 'http';
  send: (payload: Record<string, unknown>) => void;
  sendBinary?: (data: Buffer | ArrayBuffer | Buffer[]) => void;
  isOpen: () => boolean;
  lastSeenAt: number;
  queue: Record<string, unknown>[];
  waiter: ((messages: Record<string, unknown>[]) => void) | null;
}

interface PeerInfo {
  peerId: string;
  deviceName: string;
  deviceType: string;
  platform: string;
  publicKeyJwk: JsonWebKey;
  capabilities: string[];
  client: SignalingClient;
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
  signalCount: number;
  relayCount: number;
  windowStart: number;
}

const sessionsByCode = new Map<string, PairingSession>();
const sessionsById = new Map<string, PairingSession>();
const clientSessions = new Map<string, string>();
const rateBuckets = new Map<string, RateBucket>();
const connectedClients = new Map<string, SignalingClient>();
const serverStartedAt = Date.now();

function checkRateLimit(clientId: string, isRelay: boolean): boolean {
  const now = Date.now();
  let bucket = rateBuckets.get(clientId);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket = { signalCount: 0, relayCount: 0, windowStart: now };
    rateBuckets.set(clientId, bucket);
  }
  if (isRelay) {
    if (bucket.relayCount >= MAX_RELAY_PER_WINDOW) return false;
    bucket.relayCount += 1;
    return true;
  }
  if (bucket.signalCount >= MAX_MSGS_PER_WINDOW) return false;
  bucket.signalCount += 1;
  return true;
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
  for (const client of connectedClients.values()) {
    if (client.isOpen()) {
      client.send({
        type: 'discovery:sessions',
        sessions,
      });
    }
  }
}

function cleanupPeer(client: SignalingClient, reason = 'peer_disconnected') {
  rateBuckets.delete(client.id);
  const sessionId = clientSessions.get(client.id);
  if (!sessionId) return;
  clientSessions.delete(client.id);

  const session = sessionsById.get(sessionId);
  if (!session) return;

  if (session.host.client.id === client.id) {
    if (session.guest) {
      session.guest.client.send({
        type: 'session:ended',
        sessionId: session.sessionId,
        reason,
      });
      clientSessions.delete(session.guest.client.id);
    }
    sessionsById.delete(session.sessionId);
    sessionsByCode.delete(session.pairingCode);
    broadcastDiscovery();
  } else if (session.guest && session.guest.client.id === client.id) {
    session.guest = null;
    session.host.client.send({
      type: 'peer:left',
      sessionId: session.sessionId,
      reason,
    });
    broadcastDiscovery();
  }
}

function handleSignalingMessage(client: SignalingClient, msg: Record<string, unknown>) {
  client.lastSeenAt = Date.now();
  const type = typeof msg.type === 'string' ? msg.type : '';
  const isRelay = type === 'relay:packet';

  if (!checkRateLimit(client.id, isRelay)) {
    client.send({
      type: 'error',
      code: 'RATE_LIMITED',
      message: 'Signaling rate limit exceeded.',
    });
    return;
  }

  switch (type) {
    case 'ping':
      client.send({ type: 'pong', ts: Date.now() });
      break;

    case 'discovery:list':
      client.send({
        type: 'discovery:sessions',
        sessions: getPublicDiscoverableSessions(),
      });
      break;

    case 'session:create': {
      cleanupPeer(client, 'replaced_session');
      const rawCode =
        typeof msg.pairingCode === 'string' ? msg.pairingCode.trim().toUpperCase() : '';
      if (!/^[A-Z0-9]{6}$/.test(rawCode)) {
        client.send({
          type: 'error',
          code: 'INVALID_PAIRING_CODE',
          message: 'Pairing code must be 6 alphanumeric characters.',
        });
        return;
      }
      if (sessionsByCode.has(rawCode)) {
        client.send({
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
        client,
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
      clientSessions.set(client.id, sessionId);

      client.send({
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
      cleanupPeer(client, 'joined_another_session');
      const code =
        typeof msg.pairingCode === 'string' ? msg.pairingCode.trim().toUpperCase() : '';
      const session = sessionsByCode.get(code);

      if (!session) {
        client.send({
          type: 'error',
          code: 'PEER_NOT_FOUND',
          message: 'No active session found for that pairing code.',
        });
        return;
      }
      if (Date.now() > session.expiresAt) {
        client.send({
          type: 'error',
          code: 'PAIRING_EXPIRED',
          message: 'This pairing session has expired.',
        });
        return;
      }
      if (session.guest) {
        client.send({
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
        client,
      };

      session.guest = guest;
      clientSessions.set(client.id, session.sessionId);

      client.send({
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

      session.host.client.send({
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
      const sessionId = clientSessions.get(client.id);
      if (!sessionId) return;
      const session = sessionsById.get(sessionId);
      if (!session || !session.guest) return;
      const targetClient =
        session.host.client.id === client.id ? session.guest.client : session.host.client;
      const fromPeerId =
        session.host.client.id === client.id ? session.host.peerId : session.guest.peerId;
      targetClient.send({
        type: 'signal:relay',
        sessionId,
        fromPeerId,
        signalType: msg.signalType,
        payload: msg.payload,
      });
      break;
    }

    case 'relay:packet': {
      const sessionId = clientSessions.get(client.id);
      if (!sessionId) return;
      const session = sessionsById.get(sessionId);
      if (!session || !session.guest) return;
      const targetClient =
        session.host.client.id === client.id ? session.guest.client : session.host.client;
      targetClient.send({
        type: 'relay:packet',
        sessionId,
        iv: msg.iv,
        ciphertext: msg.ciphertext,
        seq: msg.seq,
      });
      break;
    }

    case 'session:leave':
      cleanupPeer(client, 'user_cancelled');
      break;

    default:
      client.send({
        type: 'error',
        code: 'UNKNOWN_MESSAGE_TYPE',
        message: 'Unsupported signaling message type.',
      });
  }
}

setInterval(() => {
  const now = Date.now();
  let expiredAny = false;

  for (const [sessionId, session] of sessionsById.entries()) {
    if (now > session.expiresAt) {
      expiredAny = true;
      session.host.client.send({ type: 'session:expired', sessionId });
      if (session.guest) {
        session.guest.client.send({ type: 'session:expired', sessionId });
        clientSessions.delete(session.guest.client.id);
      }
      clientSessions.delete(session.host.client.id);
      sessionsById.delete(sessionId);
      sessionsByCode.delete(session.pairingCode);
    }
  }

  for (const [clientId, client] of connectedClients.entries()) {
    if (client.transport === 'http' && now - client.lastSeenAt > HTTP_CLIENT_IDLE_MS) {
      if (client.waiter) {
        const w = client.waiter;
        client.waiter = null;
        w([]);
      }
      connectedClients.delete(clientId);
      cleanupPeer(client, 'http_timeout');
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
      transports: ['ws', 'http-long-poll'],
    });
  });

  app.post('/api/signaling/connect', (_req, res) => {
    const clientId = randomUUID();
    const client: SignalingClient = {
      id: clientId,
      transport: 'http',
      lastSeenAt: Date.now(),
      queue: [],
      waiter: null,
      isOpen: () => connectedClients.has(clientId),
      send: (payload) => {
        if (!connectedClients.has(clientId)) return;
        if (client.waiter) {
          const resolve = client.waiter;
          client.waiter = null;
          resolve([payload]);
        } else {
          client.queue.push(payload);
        }
      },
    };
    connectedClients.set(clientId, client);
    client.queue.push({
      type: 'discovery:sessions',
      sessions: getPublicDiscoverableSessions(),
    });
    res.json({ ok: true, clientId });
  });

  app.get('/api/signaling/poll', (req, res) => {
    const clientId = typeof req.query.clientId === 'string' ? req.query.clientId : '';
    const client = connectedClients.get(clientId);
    if (!client || client.transport !== 'http') {
      res.status(404).json({ ok: false, error: 'CLIENT_NOT_FOUND' });
      return;
    }

    client.lastSeenAt = Date.now();
    if (client.queue.length > 0) {
      const messages = client.queue.splice(0);
      res.json({ ok: true, messages });
      return;
    }

    if (client.waiter) {
      const prev = client.waiter;
      client.waiter = null;
      prev([]);
    }

    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      if (client.waiter) client.waiter = null;
      res.json({ ok: true, messages: [] });
    }, HTTP_POLL_HOLD_MS);

    client.waiter = (messages) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      res.json({ ok: true, messages });
    };

    req.on('close', () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (client.waiter) client.waiter = null;
    });
  });

  app.post('/api/signaling/send', express.json({ limit: '2mb' }), (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const client = connectedClients.get(clientId);
    if (!client || client.transport !== 'http') {
      res.status(404).json({ ok: false, error: 'CLIENT_NOT_FOUND' });
      return;
    }
    const msg = body.message as Record<string, unknown> | undefined;
    if (!msg || typeof msg !== 'object') {
      res.status(400).json({ ok: false, error: 'MALFORMED_MESSAGE' });
      return;
    }
    handleSignalingMessage(client, msg);
    res.json({ ok: true });
  });

  app.post('/api/signaling/disconnect', express.json({ limit: '16kb' }), (req, res) => {
    const body = (req.body || {}) as Record<string, unknown>;
    const clientId = typeof body.clientId === 'string' ? body.clientId : '';
    const client = connectedClients.get(clientId);
    if (client) {
      if (client.waiter) {
        const w = client.waiter;
        client.waiter = null;
        w([]);
      }
      connectedClients.delete(clientId);
      cleanupPeer(client, 'socket_closed');
    }
    res.json({ ok: true });
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
    const clientId = randomUUID();
    const client: SignalingClient = {
      id: clientId,
      transport: 'ws',
      lastSeenAt: Date.now(),
      queue: [],
      waiter: null,
      isOpen: () => ws.readyState === WebSocket.OPEN,
      send: (payload) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(payload));
        }
      },
      sendBinary: (rawData) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(rawData, { binary: true });
        }
      },
    };

    connectedClients.set(clientId, client);
    client.send({
      type: 'discovery:sessions',
      sessions: getPublicDiscoverableSessions(),
    });

    ws.on('message', (rawData, isBinary) => {
      if (isBinary) {
        const sessionId = clientSessions.get(client.id);
        if (!sessionId) return;
        const session = sessionsById.get(sessionId);
        if (!session || !session.guest) return;
        const target =
          session.host.client.id === client.id ? session.guest.client : session.host.client;
        target.sendBinary?.(rawData as Buffer);
        return;
      }

      const text = rawData.toString('utf8');
      if (text.length > MAX_RELAY_FRAME_BYTES) {
        client.send({
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
        client.send({
          type: 'error',
          code: 'MALFORMED_MESSAGE',
          message: 'Invalid JSON signaling payload.',
        });
        return;
      }

      const type = typeof msg.type === 'string' ? msg.type : '';
      if (type !== 'relay:packet' && text.length > MAX_SIGNAL_PAYLOAD_BYTES) {
        client.send({
          type: 'error',
          code: 'PAYLOAD_TOO_LARGE',
          message: 'Signaling message exceeds allowed bounds.',
        });
        return;
      }

      handleSignalingMessage(client, msg);
    });

    ws.on('close', () => {
      connectedClients.delete(clientId);
      cleanupPeer(client, 'socket_closed');
    });
    ws.on('error', () => {
      connectedClients.delete(clientId);
      cleanupPeer(client, 'socket_error');
    });
  });

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `> DROPZERO listening on http://0.0.0.0:${PORT} (ws /ws/signaling + http /api/signaling/*)`
    );
  });
}

startServer().catch((err) => {
  console.error('Failed to start DROPZERO server:', err);
  process.exit(1);
});
