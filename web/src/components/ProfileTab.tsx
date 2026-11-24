'use client';

import { useRef, useState } from 'react';
import { Camera, LogOut, Plus, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { squarePhoto } from '@/lib/image';
import type { User } from '@/lib/types';
import { Avatar, Rating, Spinner } from './ui';

export function ProfileTab() {
  const { user, setUser, signOut, fail, toast } = useApp();
  const [contacts, setContacts] = useState(user?.trustedContacts ?? []);
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
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

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const photo = await squarePhoto(file);
      const r = await api<{ user: User }>('/api/auth/photo', { method: 'PUT', body: { photo } });
      setUser(r.user);
      toast('Profile photo updated');
    } catch (e) {
      fail(e);
    } finally {
      setPhotoBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePhoto = async () => {
    setPhotoBusy(true);
    try {
      const r = await api<{ user: User }>('/api/auth/photo', { method: 'DELETE' });
      setUser(r.user);
      toast('Profile photo removed');
    } catch (e) {
      fail(e);
    } finally {
      setPhotoBusy(false);
    }
  };

  return (
    <div className="mx-auto h-full max-w-xl space-y-4 overflow-y-auto p-4">
      <div className="card flex items-center gap-4 !p-4">
        <div className="relative flex-none">
          <Avatar name={user.name} photo={user.photo} size={72} />
          <button
            className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-primary text-primary-on disabled:opacity-60"
            onClick={() => fileRef.current?.click()}
            disabled={photoBusy}
            aria-label={user.photo ? 'Change profile photo' : 'Add profile photo'}
          >
            {photoBusy ? <Spinner size={14} /> : <Camera size={16} />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </div>
        <div className="min-w-0">
          <div className="truncate font-display text-xl font-extrabold">{user.name}</div>
          <div className="text-sm text-muted">{user.phone}</div>
          <Rating value={user.rating} count={user.ratingCount} />
        </div>
      </div>

      {!user.photo ? (
        <section className="card !bg-primary-soft !p-4">
          <h3 className="font-display font-bold text-primary-strong">Add your photo</h3>
          <p className="mt-1 text-[13px] text-primary-strong">
            {user.role === 'rider'
              ? 'Passengers see your photo before they ride, so they know it is really you and not someone pretending to be your rider.'
              : 'Your rider sees your photo when they pick you up, so they know they are meeting the right person.'}
          </p>
          <button className="btn btn-sm mt-3" onClick={() => fileRef.current?.click()} disabled={photoBusy}>
            {photoBusy ? <Spinner /> : <Camera size={18} />} Choose a photo
          </button>
        </section>
      ) : (
        <button className="btn btn-ghost btn-sm" onClick={removePhoto} disabled={photoBusy}>
          <Trash2 size={18} /> Remove photo
        </button>
      )}

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