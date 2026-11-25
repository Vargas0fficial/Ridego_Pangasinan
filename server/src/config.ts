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
    fare: { base: 25, perKm: 7, min: 35, serviceFeeRate: 0.15 },
  /** Optional raincoat (kapote) the rider brings when it is raining at the pickup. The rider keeps all of it. */
  raincoatPrice: 49,
  weather: {
    apiUrl: (process.env.WEATHER_API_URL ?? 'https://api.open-meteo.com/v1/forecast').replace(/\/$/, ''),
    // For demos and testing: 'rain' always rains, 'clear' never does. Leave empty to use the real weather.
    override: (['rain', 'clear'].includes(process.env.WEATHER_OVERRIDE ?? '') ? process.env.WEATHER_OVERRIDE : '') as 'rain' | 'clear' | '',
  },
  dispatch: { offerSeconds: 15, wavesKm: [5, 10, 20], maxOffersPerWave: 10 },
  maxTripKm: 80,
  mail: {
    // 'console' prints the email instead of sending it. 'brevo' sends real email through Brevo's HTTP API.
    provider: (process.env.MAIL_PROVIDER ?? 'console') as 'console' | 'brevo',
    brevoApiKey: process.env.BREVO_API_KEY ?? '',
    fromEmail: process.env.MAIL_FROM_EMAIL ?? '',
    fromName: process.env.MAIL_FROM_NAME ?? 'RideGo Pangasinan',
  },
  verification: { codeTtlSeconds: 600, maxAttempts: 5, resendCooldownSeconds: 30, maxSends: 5 },
};

if (config.mail.provider === 'brevo' && (!config.mail.brevoApiKey || !config.mail.fromEmail)) {
  throw new Error('MAIL_PROVIDER=brevo needs BREVO_API_KEY and MAIL_FROM_EMAIL');
}