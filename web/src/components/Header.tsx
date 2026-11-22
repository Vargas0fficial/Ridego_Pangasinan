'use client';

import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { BrandName, LogoMark } from './Logo';
import { SafetyCenter } from './SafetyCenter';
import { ConnectionDot } from './ui';

export function Header() {
  const { ride } = useApp();
  const [open, setOpen] = useState(false);
  return (
    <>
      <header
        className="z-[900] flex flex-none items-center justify-between gap-3 border-b border-line bg-surface px-4 pb-2.5"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <LogoMark size={38} className="flex-none" />
          <div className="min-w-0">
            <BrandName className="block truncate text-[17px] leading-tight" />
            <ConnectionDot />
          </div>
        </div>
        <button
          className="iconbtn !h-10 !w-10 flex-none border-danger/30 bg-danger-soft text-danger"
          onClick={() => setOpen(true)}
          aria-label="Open Safety Center"
          title="Safety Center"
        >
          <ShieldCheck size={20} />
        </button>
      </header>
      {open && <SafetyCenter ride={ride} onClose={() => setOpen(false)} />}
    </>
  );
}