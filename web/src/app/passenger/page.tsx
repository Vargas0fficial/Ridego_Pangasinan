'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Home, MessageCircle, Receipt, User } from 'lucide-react';
import { BottomNav, type NavItem } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { MotoNavIcon } from '@/components/ScooterIcon';
import { BookTab } from '@/components/passenger/BookTab';
import { HomeTab } from '@/components/passenger/HomeTab';
import { MessagesTab } from '@/components/passenger/MessagesTab';
import { ProfileTab } from '@/components/ProfileTab';
import { RidesTab } from '@/components/passenger/RidesTab';
import { Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import type { Place } from '@/lib/types';

type Tab = 'home' | 'book' | 'rides' | 'messages' | 'profile';

const NAV: NavItem<Tab>[] = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'book', label: 'Book', icon: MotoNavIcon },
  { id: 'rides', label: 'Rides', icon: Receipt },
  { id: 'messages', label: 'Messages', icon: MessageCircle },
  { id: 'profile', label: 'Profile', icon: User },
];

export default function PassengerPage() {
  const { user, ready, ride, unreadChat } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');
  const [dest, setDest] = useState<Place | null>(null);
  const consumeDest = useCallback(() => setDest(null), []);

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'passenger') router.replace('/rider');
  }, [ready, user, router]);

  // A ride that starts (or is restored after a reload) always brings the user to the live ride screen.
  const rideActive = !!ride && ['searching', 'accepted', 'arrived', 'ongoing', 'completed'].includes(ride.status);
  useEffect(() => {
    if (rideActive) setTab((t) => (t === 'home' || t === 'rides' || t === 'profile' ? 'book' : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, ride?.status === 'accepted']);

  if (!ready || !user || user.role !== 'passenger')
    return (
      <div className="grid h-full place-items-center text-muted">
        <Spinner size={28} />
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative min-h-0 flex-1">
        {tab === 'home' && (
          <HomeTab
            onBook={(d) => {
              if (d) setDest(d);
              setTab('book');
            }}
            onOpenRide={() => setTab('book')}
          />
        )}
        {tab === 'book' && <BookTab initialDest={dest} onConsumedDest={consumeDest} />}
        {tab === 'rides' && <RidesTab />}
        {tab === 'messages' && <MessagesTab />}
        {tab === 'profile' && <ProfileTab />}
      </main>
      <BottomNav items={NAV.map((i) => (i.id === 'messages' ? { ...i, badge: unreadChat || undefined } : i))} active={tab} onChange={setTab} />
    </div>
  );
}