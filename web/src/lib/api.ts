export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, '');

const TOKEN_KEY = 'ridego_token';

export const tokenStore = {
  get: (): string | null => {
    try {
      return typeof window === 'undefined' ? null : window.localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string) => {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage blocked: the session just will not survive a reload */
    }
  },
  clear: () => {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  },
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(API_URL + path, {
      method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Can't reach the RideGo Pangasinan server. Check your connection and try again.");
  }
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Something went wrong. Please try again.');
  return data as T;
}
