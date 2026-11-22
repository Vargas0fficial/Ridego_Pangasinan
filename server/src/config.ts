import 'dotenv/config';

const isProd = process.env.NODE_ENV === 'production';

function need(key: string, devDefault?: string): string {
  const value = process.env[key] ?? (isProd ? undefined : devDefault);
  if (value === undefined || value === '') throw new Error(`Missing required environment variable ${key}`);
  return value;
}

export const config = {
  isProd,
  port: Number(process.env.PORT ?? 4000),
  mongoUri: need('MONGODB_URI', 'mongodb://127.0.0.1:27017/ridego-pangasinan'),
  jwtSecret: need('JWT_SECRET', 'dev-secret-change-me'),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  osrmUrl: (process.env.OSRM_URL ?? 'https://router.project-osrm.org').replace(/\/$/, ''),
  fare: { base: 40, perKm: 11.5, min: 50, serviceFeeRate: 0.15 },
  dispatch: { offerSeconds: 15, wavesKm: [5, 10, 20], maxOffersPerWave: 10 },
  maxTripKm: 80,
  sms: {
    // 'console' logs the text instead of sending it. 'semaphore' sends real SMS through semaphore.co.
    provider: (process.env.SMS_PROVIDER ?? 'console') as 'console' | 'semaphore',
    semaphoreApiKey: process.env.SEMAPHORE_API_KEY ?? '',
    senderName: process.env.SMS_SENDER_NAME ?? '',
  },
  verification: { codeTtlSeconds: 600, maxAttempts: 5, resendCooldownSeconds: 30, maxSends: 5 },
};

if (config.sms.provider === 'semaphore' && !config.sms.semaphoreApiKey) {
  throw new Error('SMS_PROVIDER=semaphore needs SEMAPHORE_API_KEY');
}