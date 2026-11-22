'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { API_URL, ApiError, api, tokenStore } from '@/lib/api';
import type { ChatMessage, Offer, Ride, User } from '@/lib/types';

type Live = { lat: number; lng: number };
type Toast = { id: number; text: string; kind: 'info' | 'error' };

type Ctx = {
  user: User | null;
  ready: boolean;
  connected: boolean;
  socket: Socket | null;
  ride: Ride | null;
  offers: Offer[];
  /** Latest rider position for the ride in view (own GPS for riders, streamed for passengers). */
  livePos: Live | null;
  setLivePos: (p: Live | null) => void;
  signIn: (token: string, user: User) => void;
  signOut: () => void;
  setUser: (u: User) => void;
  setRide: (r: Ride | null) => void;
  clearRide: () => void;
  removeOffer: (rideId: string) => void;
  sync: () => Promise<void>;
  toast: (text: string, kind?: 'info' | 'error') => void;
  toasts: Toast[];
  fail: (err: unknown) => void;
};

const AppCtx = createContext<Ctx | null>(null);

export const useApp = (): Ctx => {
  const c = useContext(AppCtx);
  if (!c) throw new Error('useApp must be used inside AppProvider');
  return c;
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [ride, setRideState] = useState<Ride | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [livePos, setLivePos] = useState<Live | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const rideRef = useRef<Ride | null>(null);
  const toastId = useRef(0);

  const setRide = useCallback((r: Ride | null) => {
    rideRef.current = r;
    setRideState(r);
  }, []);

  const toast = useCallback((text: string, kind: 'info' | 'error' = 'info') => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const fail = useCallback(
    (err: unknown) => toast(err instanceof ApiError || err instanceof Error ? err.message : 'Something went wrong', 'error'),
    [toast],
  );

  const toOffer = (o: Omit<Offer, 'receivedAt'>): Offer => ({ ...o, receivedAt: Date.now() });

  const sync = useCallback(async () => {
    try {
      const { ride: r } = await api<{ ride: Ride | null }>('/api/rides/active');
      setRide(r);
      if (r?.riderLocation) setLivePos(r.riderLocation);
      if (!r) setLivePos(null);
    } catch {
      /* the next socket event will bring the state back */
    }
  }, [setRide]);

  // Boot: restore the session.
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setReady(true);
      return;
    }
    api<{ user: User }>('/api/auth/me')
      .then((r) => setUserState(r.user))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) tokenStore.clear();
      })
      .finally(() => setReady(true));
  }, []);

  const userId = user?.id;
  const role = user?.role;

  // Real-time connection, one per signed-in user.
  useEffect(() => {
    if (!userId) return;
    const token = tokenStore.get();
    if (!token) return;
    const s = io(API_URL, { auth: { token }, transports: ['websocket', 'polling'], reconnectionDelayMax: 5000 });
    setSocket(s);

    const resync = async () => {
      await sync();
      if (role === 'rider') {
        try {
          const { offers: list } = await api<{ offers: Omit<Offer, 'receivedAt'>[] }>('/api/rider/offers');
          setOffers(list.map(toOffer));
        } catch {
          /* ignore */
        }
      }
    };

    s.on('connect', () => {
      setConnected(true);
      void resync();
    });
    s.on('disconnect', () => setConnected(false));
    s.on('connect_error', () => setConnected(false));

    s.on('ride:update', (r: Ride) => {
      setRide(r);
      if (r.riderLocation) setLivePos(r.riderLocation);
      if (r.status === 'completed' || r.status === 'cancelled' || r.status === 'no_riders') {
        setOffers((o) => o.filter((x) => x.rideId !== r.id));
      }
    });
    s.on('ride:released', () => {
      setRide(null);
      setLivePos(null);
    });
    s.on('ride:request', (o: Omit<Offer, 'receivedAt'>) => {
      setOffers((list) => (list.some((x) => x.rideId === o.rideId) ? list : [...list, toOffer(o)]));
    });
    const drop = ({ rideId }: { rideId: string }) => setOffers((list) => list.filter((x) => x.rideId !== rideId));
    s.on('ride:request:expired', drop);
    s.on('ride:request:closed', drop);
    s.on('rider:location', (p: { rideId: string; lat: number; lng: number }) => {
      if (rideRef.current?.id === p.rideId) setLivePos({ lat: p.lat, lng: p.lng });
    });
    s.on('chat:message', (m: ChatMessage & { rideId: string }) => {
      const cur = rideRef.current;
      if (!cur || cur.id !== m.rideId) return;
      if (cur.messages.some((x) => x.at === m.at && x.text === m.text && x.from === m.from)) return;
      setRide({ ...cur, messages: [...cur.messages, { from: m.from, text: m.text, at: m.at }] });
    });

    return () => {
      s.removeAllListeners();
      s.disconnect();
      setSocket(null);
      setConnected(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, role]);

  const signIn = useCallback((token: string, u: User) => {
    tokenStore.set(token);
    setUserState(u);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    setUserState(null);
    setRide(null);
    setOffers([]);
    setLivePos(null);
  }, [setRide]);

  const value = useMemo<Ctx>(
    () => ({
      user,
      ready,
      connected,
      socket,
      ride,
      offers,
      livePos,
      setLivePos,
      signIn,
      signOut,
      setUser: setUserState,
      setRide,
      clearRide: () => {
        setRide(null);
        setLivePos(null);
      },
      removeOffer: (id: string) => setOffers((l) => l.filter((o) => o.rideId !== id)),
      sync,
      toast,
      toasts,
      fail,
    }),
    [user, ready, connected, socket, ride, offers, livePos, signIn, signOut, setRide, sync, toast, toasts, fail],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}
