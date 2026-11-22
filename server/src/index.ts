import http from 'http';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { config } from './config';
import { connectDb } from './db';
import { errorHandler } from './lib/errors';
import { initSocket } from './realtime/socket';
import { recoverState } from './realtime/recover';
import { authRouter } from './routes/auth';
import { ridesRouter } from './routes/rides';
import { riderRouter } from './routes/rider';
import { safetyRouter } from './routes/safety';
import { trackRouter } from './routes/track';

async function main(): Promise<void> {
  await connectDb();

  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'ridego-pangasinan-api' });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/rides', ridesRouter);
  app.use('/api/rider', riderRouter);
  app.use('/api/safety', safetyRouter);
  app.use('/api/track', trackRouter);
  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });
  app.use(errorHandler);

  const server = http.createServer(app);
  initSocket(server);
  await recoverState();

  server.listen(config.port, () => {
    console.log(`[server] RideGo Pangasinan API listening on :${config.port}`);
    console.log(`[server] SMS provider: ${config.sms.provider}${config.sms.provider === 'console' ? ' (codes are printed here, no real text is sent)' : ''}`);
    if (config.isProd && config.sms.provider === 'console') {
      console.warn('[server] WARNING: SMS_PROVIDER=console in production. Sign-up is disabled until SMS_PROVIDER=semaphore.');
    }
  });

  const shutdown = () => {
    console.log('[server] shutting down');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[server] failed to start', err);
  process.exit(1);
});