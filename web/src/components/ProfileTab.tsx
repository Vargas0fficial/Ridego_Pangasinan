'use client';

import { useState } from 'react';
import { LogOut, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import type { User } from '@/lib/types';
import { Avatar, Rating, Spinner } from './ui';

export function ProfileTab() {
  const { user, setUser, signOut, fail, toast } = useApp();
  const [contacts, setContacts] = useState(user?.trustedContacts ?? []);
  const [busy, setBusy] = useState(false);
  if (!user) return null;
  const dirty = JSON.stringify(contacts) !== JSON.stringify(user.trustedContacts);

  const save = async () => {
    setBusy(true);
    try {
      const clean = contacts.filter((c) => c.name.trim() && c.phone.trim());
      const r = await api<{ user: User }>('/api/auth/contacts', { method: 'PUT', body: { contacts: clean } });
      setUser(r.user);
      setContacts(r.user.trustedContacts);
      toast('Trusted contacts saved');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto h-full max-w-xl space-y-4 overflow-y-auto p-4">
      <div className="card flex items-center gap-4 !p-4">
        <Avatar name={user.name} size={64} />
        <div>
          <div className="font-display text-xl font-extrabold">{user.name}</div>
          <div className="text-sm text-muted">{user.phone}</div>
          <Rating value={user.rating} count={user.ratingCount} />
        </div>
      </div>

      {user.role === 'rider' && user.vehicle && (
        <section className="card !p-4">
          <h3 className="font-display font-bold">My motorcycle</h3>
          <div className="mt-2 flex items-center justify-between">
            <div>
              <div className="font-semibold">{user.vehicle.model}</div>
              <div className="text-sm text-muted">{user.vehicle.color} · {user.completedRides.toLocaleString()} rides</div>
            </div>
            <div className="rounded-lg border-2 border-fg px-2.5 py-1 font-display font-extrabold tracking-wider">{user.vehicle.plate}</div>
          </div>
        </section>
      )}

      <section className="card !p-4">
        <h3 className="font-display font-bold">Trusted contacts</h3>
        <p className="mb-3 text-[13px] text-muted">They get your live trip link if you send an emergency alert. Up to 5.</p>
        <div className="space-y-2">
          {contacts.map((c, i) => (
            <div key={i} className="flex gap-2">
              <input className="input" placeholder="Name" aria-label="Contact name" value={c.name} onChange={(e) => setContacts((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
              <input className="input" placeholder="09XX XXX XXXX" aria-label="Contact phone" inputMode="tel" value={c.phone} onChange={(e) => setContacts((l) => l.map((x, j) => (j === i ? { ...x, phone: e.target.value } : x)))} />
              <button className="iconbtn flex-none" aria-label="Remove contact" onClick={() => setContacts((l) => l.filter((_, j) => j !== i))}>
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          {contacts.length < 5 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setContacts((l) => [...l, { name: '', phone: '' }])}>
              <Plus size={18} /> Add contact
            </button>
          )}
          {dirty && (
            <button className="btn btn-sm" onClick={save} disabled={busy}>
              {busy ? <Spinner /> : 'Save'}
            </button>
          )}
        </div>
      </section>

      <button className="btn btn-ghost" onClick={signOut}>
        <LogOut size={20} /> Log out
      </button>
    </div>
  );
}
