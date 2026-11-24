'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Loader2, Star, X } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { initials } from '@/lib/format';

export function Toasts() {
  const { toasts } = useApp();
  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[2000] flex flex-col items-center gap-2 px-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`rg-fade pointer-events-auto flex max-w-md items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-lg ${
            t.kind === 'error' ? 'bg-danger text-white' : 'bg-[rgb(var(--chip))] text-[rgb(var(--chip-fg))]'
          }`}
        >
          {t.kind === 'error' ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
          {t.text}
        </div>
      ))}
    </div>
  );
}

export const Spinner = ({ size = 18 }: { size?: number }) => <Loader2 size={size} className="animate-spin" aria-label="Loading" />;

/** Profile photo when there is one, initials otherwise. With `zoomable`, tapping the photo shows it large so you can match it to the person in front of you. */
export function Avatar({ name, size = 44, photo, zoomable = false }: { name: string; size?: number; photo?: string | null; zoomable?: boolean }) {
  const [open, setOpen] = useState(false);
  if (!photo) {
    return (
      <span
        className="grid flex-none place-items-center rounded-full bg-primary-soft font-display font-bold text-primary-strong"
        style={{ width: size, height: size, fontSize: size * 0.38 }}
        aria-hidden
      >
        {initials(name)}
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  const img = <img src={photo} alt={`${name}'s photo`} width={size} height={size} className="flex-none rounded-full bg-primary-soft object-cover" style={{ width: size, height: size }} />;
  if (!zoomable) return img;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex-none rounded-full" aria-label={`View ${name}'s photo`}>
        {img}
      </button>
      {open && (
        <Modal title={name} onClose={() => setOpen(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo} alt={`${name}'s photo`} className="mx-auto aspect-square w-full max-w-[320px] rounded-3xl object-cover" />
          <p className="mt-3 text-center text-sm text-muted">Check that this is the person you meet.</p>
        </Modal>
      )}
    </>
  );
}

export function Rating({ value, count }: { value: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-bold">
      <Star size={14} className="fill-amber text-amber" aria-hidden />
      {value ? value.toFixed(1) : 'New'}
      {count !== undefined && <span className="font-medium text-muted">({count.toLocaleString()})</span>}
    </span>
  );
}

/** Pinned bottom panel over the map. Tap the handle to collapse it and see the whole map. */
export function Sheet({ children, className = '' }: { children: ReactNode; className?: string }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div
      className={`rg-rise absolute inset-x-0 bottom-0 z-[500] mx-auto w-full max-w-xl overflow-y-auto rounded-t-[28px] bg-surface px-4 shadow-sheet ${collapsed ? '' : 'max-h-[78%]'} ${className}`}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 14px)' }}
    >
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? 'Show details' : 'Hide details to see the map'}
        className="mx-auto flex w-full flex-col items-center gap-0.5 pb-2 pt-2"
      >
        <span className="h-1.5 w-10 rounded-full bg-line" aria-hidden />
        {collapsed ? (
          <span className="flex items-center gap-1 text-xs font-bold text-muted">
            <ChevronUp size={14} /> Show details
          </span>
        ) : (
          <ChevronDown size={16} className="text-muted" aria-hidden />
        )}
      </button>
      {/* hidden (not unmounted) so typed text, like the trip PIN, survives a collapse */}
      <div hidden={collapsed}>{children}</div>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  tone = 'default',
}: {
  title: string;
  onClose?: () => void;
  children: ReactNode;
  tone?: 'default' | 'danger';
}) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rg-fade fixed inset-0 z-[1500] flex items-end justify-center bg-black/55 sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div
        className="rg-rise max-h-[92%] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-surface p-5 shadow-sheet sm:rounded-[28px]"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className={`font-display text-xl font-extrabold tracking-tight ${tone === 'danger' ? 'text-danger' : ''}`}>{title}</h2>
          {onClose && (
            <button className="iconbtn" onClick={onClose} aria-label="Close">
              <X size={20} />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-semibold text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function EmptyState({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-primary-soft text-primary-strong">{icon}</div>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      <p className="max-w-xs text-sm text-muted">{text}</p>
    </div>
  );
}

export function ConnectionDot() {
  const { connected } = useApp();
  return (
    <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold leading-none text-muted" title={connected ? 'Live updates on' : 'Reconnecting…'}>
      <span className={`h-2 w-2 rounded-full ${connected ? 'bg-primary' : 'bg-amber'}`} />
      {connected ? 'Connected' : 'Reconnecting…'}
    </span>
  );
}