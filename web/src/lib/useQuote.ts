'use client';

import { useEffect, useState } from 'react';
import { api } from './api';
import type { Place, Quote } from './types';

/** Live fare quote for a pickup and destination. Pass enabled=false to clear it. */
export function useQuote(pickup: Place | null, dropoff: Place | null, enabled: boolean) {
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !pickup || !dropoff) {
      setQuote(null);
      setError('');
      return;
    }
    let stale = false;
    setLoading(true);
    setError('');
    api<Quote>('/api/rides/quote', { body: { pickup, dropoff } })
      .then((q) => !stale && setQuote(q))
      .catch((e: Error) => {
        if (stale) return;
        setQuote(null);
        setError(e.message);
      })
      .finally(() => !stale && setLoading(false));
    return () => {
      stale = true;
    };
  }, [pickup, dropoff, enabled]);

  return { quote, loading, error };
}
