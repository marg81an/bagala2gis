// Все настройки читаются из переменных окружения при каждом обращении.
export const cfg = {
  get supabaseUrl() { return (process.env.SUPABASE_URL || '').replace(/\/+$/, ''); },
  get supabaseKey() { return process.env.SUPABASE_SERVICE_ROLE_KEY || ''; },
  get adminPassword() { return process.env.ADMIN_PASSWORD || ''; },
  get sessionSecret() { return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || 'dev-secret'; },
  get botToken() { return process.env.TELEGRAM_BOT_TOKEN || ''; },
  get botUsername() { return (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, ''); },
  get webhookSecret() { return process.env.TELEGRAM_WEBHOOK_SECRET || ''; },
  get baseUrl() { return (process.env.BASE_URL || '').replace(/\/+$/, ''); },
  get tz() { return process.env.TIMEZONE || 'Asia/Almaty'; },
  get isVercel() { return !!process.env.VERCEL; },
};
