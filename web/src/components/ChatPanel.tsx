'use client';

import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { fmtTime } from '@/lib/format';
import type { Ride } from '@/lib/types';
import { Spinner } from './ui';

const QUICK_PASSENGER = ["I'm here na po", 'Pa-wait po, palabas na ako', 'Saan po kayo?'];
const QUICK_RIDER = ['Malapit na po ako', 'Nandito na po ako sa pickup', 'Saan po kayo exactly?'];

export function ChatPanel({ ride }: { ride: Ride }) {
  const { user, socket, setRide, fail } = useApp();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const me = user?.role ?? 'passenger';
  const open = ['accepted', 'arrived', 'ongoing'].includes(ride.status);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [ride.messages.length]);

  const send = (value: string) => {
    const t = value.trim();
    if (!t || !socket || sending) return;
    setSending(true);
    socket.emit('chat:send', { rideId: ride.id, text: t }, (res: { ok: boolean; error?: string }) => {
      setSending(false);
      if (!res.ok) fail(new Error(res.error ?? 'Could not send message'));
      else setText('');
    });
  };

  const quick = me === 'rider' ? QUICK_RIDER : QUICK_PASSENGER;
  const other = me === 'rider' ? ride.passenger : ride.rider;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {ride.messages.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">
            Say hi to {other?.name.split(' ')[0] ?? 'your ride partner'}. Messages are only available during the ride.
          </p>
        )}
        {ride.messages.map((m, i) => {
          const mine = m.from === me;
          return (
            <div key={i} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[15px] ${mine ? 'rounded-br-md bg-primary text-primary-on' : 'rounded-bl-md border border-line bg-surface2'}`}>
                {m.text}
                <div className={`mt-0.5 text-[10px] ${mine ? 'text-primary-on/70' : 'text-muted'}`}>{fmtTime(m.at)}</div>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>
      {open ? (
        <div className="border-t border-line p-3">
          <div className="mb-2 flex gap-2 overflow-x-auto">
            {quick.map((q) => (
              <button key={q} className="chip" onClick={() => send(q)}>
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(text);
            }}
          >
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={500} aria-label="Message" />
            <button className="btn !w-14 !min-h-[48px] flex-none !rounded-[14px] !px-0" aria-label="Send message" disabled={!text.trim() || sending}>
              {sending ? <Spinner /> : <Send size={20} />}
            </button>
          </form>
        </div>
      ) : (
        <p className="border-t border-line p-4 text-center text-sm text-muted">This ride has ended, so the chat is closed.</p>
      )}
    </div>
  );
}
