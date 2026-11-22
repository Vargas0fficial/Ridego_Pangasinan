'use client';

import { useMemo, useState } from 'react';
import { Building2, LocateFixed, MapPin, Search } from 'lucide-react';
import { PLACES, toPlace } from '@/lib/places';
import type { Place } from '@/lib/types';
import { Modal } from './ui';

/** Search the curated Pangasinan places, or use the current location / a map tap. */
export function PlacePicker({
  title,
  onPick,
  onClose,
  onUseLocation,
  onPickOnMap,
}: {
  title: string;
  onPick: (p: Place) => void;
  onClose: () => void;
  onUseLocation?: () => void;
  onPickOnMap?: () => void;
}) {
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PLACES.filter((p) => !s || p.label.toLowerCase().includes(s) || p.sub.toLowerCase().includes(s));
  }, [q]);

  return (
    <Modal title={title} onClose={onClose}>
      <div className="relative">
        <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input autoFocus className="input !pl-10" placeholder="Search town or place in Pangasinan" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search places" />
      </div>
      <div className="mt-3 flex gap-2">
        {onUseLocation && (
          <button className="chip" onClick={onUseLocation}>
            <LocateFixed size={15} /> My location
          </button>
        )}
        {onPickOnMap && (
          <button className="chip" onClick={onPickOnMap}>
            <MapPin size={15} /> Pick on map
          </button>
        )}
      </div>
      <ul className="mt-3 max-h-[46vh] divide-y divide-line overflow-y-auto">
        {list.map((p) => (
          <li key={p.id}>
            <button className="flex w-full items-center gap-3 py-3 text-left" onClick={() => onPick(toPlace(p))}>
              <span className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-primary-soft text-primary-strong">
                {p.kind === 'poi' ? <Building2 size={19} /> : <MapPin size={19} />}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{p.label}</span>
                <span className="block text-[13px] text-muted">{p.sub}</span>
              </span>
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-8 text-center text-sm text-muted">No match. Try “Pick on map” to drop a pin anywhere in Pangasinan.</li>}
      </ul>
    </Modal>
  );
}
