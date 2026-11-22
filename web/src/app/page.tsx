'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Bike, MapPinned, ShieldCheck, Wallet } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useApp } from '@/context/AppContext';
import { PLACES } from '@/lib/places';

export default function Landing() {
  const { user, ready } = useApp();
  const router = useRouter();
  useEffect(() => {
    if (ready && user) router.replace(`/${user.role}`);
  }, [ready, user, router]);

  const towns = PLACES.filter((p) => p.kind === 'town');

  return (
    <div className="h-full overflow-y-auto">
    <main className="flex min-h-full flex-col px-5" style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/login" className="text-sm font-bold text-primary-strong">
          Log in
        </Link>
      </header>

      <section className="mt-10 flex-1">
        <p className="sec-title">Your Ride. Your Way. Pangasinan.</p>
        <h1 className="mt-2 font-display text-[40px] font-extrabold leading-[1.05] tracking-tight">
          Ride Anywhere
          <br />
          in <span className="text-primary">Pangasinan.</span>
        </h1>
        <p className="mt-4 max-w-md text-[17px] text-muted">
          Book a motorcycle ride in seconds. Real riders from Dagupan to Alaminos, fair peso fares, and a Safety Center on every trip.
        </p>

        <div className="mt-7 space-y-3">
          <Link href="/register?role=passenger" className="btn">
            <MapPinned size={20} /> Book a ride
          </Link>
          <Link href="/register?role=rider" className="btn btn-ghost">
            <Bike size={20} /> Drive with RideGo Pangasinan
          </Link>
        </div>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Wallet, t: 'Fair fares', s: '₱40 base + ₱11.50 per km' },
            { icon: ShieldCheck, t: 'Built-in safety', s: 'Trip PIN, live trip link, SOS' },
            { icon: Bike, t: 'Live tracking', s: 'Watch your rider on the map' },
          ].map(({ icon: Icon, t, s }) => (
            <li key={t} className="card">
              <Icon size={22} className="text-primary" />
              <div className="mt-2 font-display font-bold">{t}</div>
              <div className="text-[13px] text-muted">{s}</div>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <div className="sec-title mb-2">Now serving</div>
          <div className="flex flex-wrap gap-2">
            {towns.map((t) => (
              <span key={t.id} className="chip">
                {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>
    </main>
    </div>
  );
}
