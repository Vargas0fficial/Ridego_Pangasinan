'use client';

import { useState } from 'react';
import { ChevronRight, Headphones, Flag, Phone, Share2, ShieldAlert, Check } from 'lucide-react';
import { api } from '@/lib/api';
import { useApp } from '@/context/AppContext';
import { getPosition } from '@/lib/hooks';
import type { Ride } from '@/lib/types';
import { Modal, Spinner } from './ui';

type View = 'menu' | 'emergency' | 'sent' | 'support' | 'report';

const REPORT_REASONS = ['Unsafe driving', 'Rider did not follow route', 'Wrong fare', 'Rude behavior', 'Vehicle did not match', 'Other'];

export function SafetyCenter({ ride, onClose }: { ride: Ride | null; onClose: () => void }) {
  const { fail, toast, livePos, user } = useApp();
  const [view, setView] = useState<View>('menu');
  const [busy, setBusy] = useState(false);
  const [alertId, setAlertId] = useState<string | null>(null);
  const [notified, setNotified] = useState(0);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');

  const activeRide = ride && ['accepted', 'arrived', 'ongoing'].includes(ride.status) ? ride : null;

  const sendEmergency = async () => {
    setBusy(true);
    try {
      const pos = livePos ?? (await getPosition(3500));
      const r = await api<{ id: string; notified: number }>('/api/safety/emergency', {
        body: { rideId: activeRide?.id, lat: pos?.lat, lng: pos?.lng },
      });
      setAlertId(r.id);
      setNotified(r.notified ?? 0);
      setView('sent');
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const cancelAlert = async () => {
    if (!alertId) return;
    setBusy(true);
    try {
      await api(`/api/safety/emergency/${alertId}/cancel`, { method: 'POST', body: {} });
      toast('Alert cancelled');
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const shareTrip = async () => {
    if (!activeRide?.shareToken) return;
    const url = `${window.location.origin}/track/${activeRide.shareToken}`;
    const text = `Follow my RideGo Pangasinan trip live: ${url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'My RideGo Pangasinan trip', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Trip link copied. Send it to someone you trust.');
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast(`Copy this link: ${url}`);
    }
  };

  const submitReport = async (type: 'report' | 'support') => {
    const why = type === 'support' ? 'Support request' : reason;
    if (!why) return toast('Pick what went wrong', 'error');
    if (type === 'support' && details.trim().length < 3) return toast('Tell us how we can help', 'error');
    setBusy(true);
    try {
      await api('/api/safety/report', { body: { rideId: ride?.id, type, reason: why, details: details.trim() || undefined } });
      toast(type === 'support' ? 'Message sent to RideGo Pangasinan support' : 'Report sent. Salamat for telling us.');
      onClose();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  if (view === 'emergency') {
    return (
      <Modal title="Send emergency alert?" tone="danger" onClose={() => setView('menu')}>
        <p className="text-sm text-muted">
          We will share your live location{activeRide ? ' and trip link' : ''} with RideGo Pangasinan safety
          {user?.trustedContacts.length ? ` and your ${user.trustedContacts.length} trusted contact(s)` : ''}. Use this only if you are in danger.
        </p>
        <a href="tel:911" className="btn btn-ghost mt-4">
          <Phone size={18} /> Call 911 now
        </a>
        <button className="btn btn-danger mt-3" onClick={sendEmergency} disabled={busy}>
          {busy ? <Spinner /> : <ShieldAlert size={20} />} Yes, send alert
        </button>
        <button className="btn btn-ghost mt-3" onClick={() => setView('menu')} disabled={busy}>
          No, go back
        </button>
      </Modal>
    );
  }

  if (view === 'sent') {
    return (
      <Modal title="Alert sent" onClose={onClose}>
        <div className="flex items-start gap-3 rounded-2xl bg-primary-soft p-4 text-primary-strong">
          <Check size={22} className="mt-0.5 flex-none" />
          <p className="text-sm font-semibold">
            RideGo Pangasinan safety has your location.{' '}
            {notified > 0 ? `${notified} trusted contact(s) were notified.` : 'Add trusted contacts in Profile so family gets alerts too.'}
          </p>
        </div>
        <a href="tel:911" className="btn btn-danger mt-4">
          <Phone size={18} /> Call 911
        </a>
        <button className="btn btn-ghost mt-3" onClick={cancelAlert} disabled={busy}>
          {busy ? <Spinner /> : "I'm safe, cancel alert"}
        </button>
      </Modal>
    );
  }

  if (view === 'support' || view === 'report') {
    const isReport = view === 'report';
    return (
      <Modal title={isReport ? 'Report a problem' : 'Contact support'} onClose={() => setView('menu')}>
        {isReport && (
          <div className="mb-3 flex flex-wrap gap-2">
            {REPORT_REASONS.map((r) => (
              <button key={r} className={`chip ${reason === r ? 'on' : ''}`} aria-pressed={reason === r} onClick={() => setReason(r)}>
                {r}
              </button>
            ))}
          </div>
        )}
        <textarea
          className="input min-h-[110px]"
          placeholder={isReport ? 'What happened? (optional)' : 'How can we help?'}
          value={details}
          maxLength={1000}
          onChange={(e) => setDetails(e.target.value)}
        />
        <button className="btn mt-4" onClick={() => submitReport(isReport ? 'report' : 'support')} disabled={busy}>
          {busy ? <Spinner /> : 'Send'}
        </button>
      </Modal>
    );
  }

  const rows = [
    { icon: ShieldAlert, title: 'Emergency', sub: 'Alert safety and trusted contacts', danger: true, onClick: () => setView('emergency'), disabled: false },
    {
      icon: Share2,
      title: 'Share trip',
      sub: activeRide?.shareToken ? 'Let someone follow your ride live' : 'Available during your ride',
      onClick: shareTrip,
      disabled: !activeRide?.shareToken,
    },
    { icon: Headphones, title: 'Contact support', sub: 'Chat with the RideGo Pangasinan team', onClick: () => setView('support'), disabled: false },
    { icon: Flag, title: 'Report a problem', sub: 'Tell us what went wrong', onClick: () => setView('report'), disabled: false },
  ];

  return (
    <Modal title="Safety Center" onClose={onClose}>
      <ul className="space-y-2.5">
        {rows.map(({ icon: Icon, title, sub, danger, onClick, disabled }) => (
          <li key={title}>
            <button
              onClick={onClick}
              disabled={disabled}
              className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition disabled:opacity-50 ${
                danger ? 'border-danger/40 bg-danger-soft' : 'border-line bg-surface2'
              }`}
            >
              <span className={`grid h-11 w-11 flex-none place-items-center rounded-xl ${danger ? 'bg-danger text-white' : 'bg-primary-soft text-primary-strong'}`}>
                <Icon size={21} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block font-display font-bold ${danger ? 'text-danger' : ''}`}>{title}</span>
                <span className="block text-[13px] text-muted">{sub}</span>
              </span>
              <ChevronRight size={18} className="text-muted" />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
