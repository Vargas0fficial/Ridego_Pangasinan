'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Car, Home, Inbox, User, Wallet } from 'lucide-react';
import { BottomNav, type NavItem } from '@/components/BottomNav';
import { Header } from '@/components/Header';
import { ProfileTab } from '@/components/ProfileTab';
import { ActiveTab } from '@/components/rider/ActiveTab';
import { EarningsTab } from '@/components/rider/EarningsTab';
import { RiderHomeTab } from '@/components/rider/HomeTab';
import { RequestModal } from '@/components/rider/RequestModal';
import { RequestsTab } from '@/components/rider/RequestsTab';
import { Spinner } from '@/components/ui';
import { useApp } from '@/context/AppContext';
import { useRiderGps } from '@/lib/riderHooks';

type Tab = 'home' | 'requests' | 'active' | 'earnings' | 'profile';

export default function RiderPage() {
  const { user, ready, ride, offers, socket, setLivePos, unreadChat } = useApp();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('home');

  useEffect(() => {
    if (!ready) return;
    if (!user) router.replace('/login');
    else if (user.role !== 'rider') router.replace('/passenger');
  }, [ready, user, router]);

  const hasRide = !!ride && ['accepted', 'arrived', 'ongoing', 'completed'].includes(ride.status);
  const online = !!user?.isOnline;

  // Real GPS while online.
  useRiderGps({ enabled: online, socket, onPos: setLivePos });

  // Restored or newly accepted ride: jump to it.
  useEffect(() => {
    if (hasRide) setTab((t) => (t === 'home' || t === 'requests' ? 'active' : t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id]);

  if (!ready || !user || user.role !== 'rider')
    return (
      <div className="grid h-full place-items-center text-muted">
        <Spinner size={28} />
      </div>
    );

  const nav: NavItem<Tab>[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'requests', label: 'Requests', icon: Inbox, badge: offers.length || undefined },
    { id: 'active', label: 'Active Ride', icon: Car, badge: unreadChat || (hasRide ? 1 : undefined) },
    { id: 'earnings', label: 'Earnings', icon: Wallet },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const showOffer = online && !hasRide ? offers[0] : undefined;

  return (
    <div className="flex h-full flex-col">
      <Header />
      <main className="relative min-h-0 flex-1">
        {tab === 'home' && <RiderHomeTab onGoActive={() => setTab('active')} />}
        {tab === 'requests' && <RequestsTab online={online} />}
        {tab === 'active' && <ActiveTab />}
        {tab === 'earnings' && <EarningsTab />}
        {tab === 'profile' && <ProfileTab />}
      </main>
      <BottomNav items={nav} active={tab} onChange={setTab} />
      {showOffer && <RequestModal key={showOffer.rideId} offer={showOffer} onAccepted={() => setTab('active')} />}
    </div>
  );
}