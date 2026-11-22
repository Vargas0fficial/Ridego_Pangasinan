'use client';

import { useEffect, useState } from 'react';
import { Wallet } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { fmtDateTime, peso } from '@/lib/format';
import type { Earnings } from '@/lib/types';
import { EmptyState, Spinner } from '../ui';

function WeekChart({ week }: { week: Earnings['week'] }) {
  const max = Math.max(100, ...week.map((d) => d.earnings));
  const top = Math.ceil(max / 100) * 100;
  const W = 320;
  const H = 150;
  const pad = { l: 34, r: 6, t: 14, b: 22 };
  const bw = ((W - pad.l - pad.r) / week.length) * 0.5;
  const x = (i: number) => pad.l + ((W - pad.l - pad.r) / week.length) * (i + 0.5);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const todayIdx = week.length - 1;
  const bestIdx = week.reduce((b, d, i) => (d.earnings > week[b].earnings ? i : b), 0);

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Earnings for the last ${week.length} days`}>
        {[0, top / 2, top].map((v) => (
          <g key={v}>
            <line x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} stroke="rgb(var(--line))" strokeWidth="1" />
            <text x={pad.l - 6} y={y(v) + 3} textAnchor="end" fontSize="9" fill="rgb(var(--muted))">
              {v >= 1000 ? `${v / 1000}k` : v}
            </text>
          </g>
        ))}
        {week.map((d, i) => {
          const h = Math.max(d.earnings > 0 ? 3 : 0, H - pad.b - y(d.earnings));
          const isToday = i === todayIdx;
          return (
            <g key={d.date}>
              <title>{`${d.label}: ${peso(d.earnings)} from ${d.trips} trip${d.trips === 1 ? '' : 's'}`}</title>
              <rect x={x(i) - bw / 2} y={H - pad.b - h} width={bw} height={h} rx="4" fill="rgb(var(--primary))" opacity={isToday ? 1 : 0.55} />
              {(i === bestIdx && d.earnings > 0) || (isToday && d.earnings > 0) ? (
                <text x={x(i)} y={H - pad.b - h - 4} textAnchor="middle" fontSize="9" fontWeight="700" fill="rgb(var(--fg))">
                  {peso(d.earnings)}
                </text>
              ) : null}
              <text x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fontWeight={isToday ? 700 : 500} fill="rgb(var(--muted))">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </figure>
  );
}

export function EarningsTab() {
  const { ride } = useApp();
  const [data, setData] = useState<Earnings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    api<Earnings>('/api/rider/earnings')
      .then((d) => !stop && setData(d))
      .catch((e: Error) => !stop && setError(e.message));
    return () => {
      stop = true;
    };
  }, [ride?.status]);

  if (error) return <p className="p-6 text-center text-sm text-danger">{error}</p>;
  if (!data)
    return (
      <div className="grid h-full place-items-center text-muted">
        <Spinner size={26} />
      </div>
    );

  const weekTotal = data.week.reduce((s, d) => s + d.earnings, 0);
  const weekTrips = data.week.reduce((s, d) => s + d.trips, 0);

  return (
    <div className="mx-auto h-full max-w-xl space-y-4 overflow-y-auto p-4">
      <div className="card !bg-primary !p-5 !text-primary-on">
        <div className="text-sm font-semibold opacity-90">Today's earnings</div>
        <div className="font-display text-[44px] font-extrabold leading-tight">{peso(data.today.earnings)}</div>
        <div className="text-sm opacity-90">
          {data.today.trips} trip{data.today.trips === 1 ? '' : 's'} completed
        </div>
      </div>

      <section className="card !p-4">
        <div className="mb-2 flex items-end justify-between">
          <h3 className="font-display font-bold">Last 7 days</h3>
          <span className="text-sm text-muted">
            {peso(weekTotal)} · {weekTrips} trips
          </span>
        </div>
        <WeekChart week={data.week} />
      </section>

      <section>
        <h3 className="mb-2 font-display font-bold">Recent trips</h3>
        {data.recent.length === 0 ? (
          <EmptyState icon={<Wallet size={26} />} title="No trips yet" text="Complete a ride and your earnings will show up here." />
        ) : (
          <ul className="space-y-2">
            {data.recent.map((r) => (
              <li key={r.id} className="card flex items-center gap-3 !p-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">
                    {r.pickup} → {r.dropoff}
                  </div>
                  <div className="text-[13px] text-muted">
                    {fmtDateTime(r.at)} · {r.distanceKm.toFixed(1)} km
                  </div>
                </div>
                <div className="font-display font-extrabold text-primary-strong">{peso(r.earning)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
