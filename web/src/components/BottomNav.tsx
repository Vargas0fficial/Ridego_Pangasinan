'use client';

import type { LucideIcon } from 'lucide-react';

export type NavItem<T extends string> = { id: T; label: string; icon: LucideIcon; badge?: number };

export function BottomNav<T extends string>({ items, active, onChange }: { items: NavItem<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <nav
      className="z-[900] flex-none border-t border-line bg-surface"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Main navigation"
    >
      <ul className="mx-auto flex max-w-xl">
        {items.map(({ id, label, icon: Icon, badge }) => {
          const on = id === active;
          return (
            <li key={id} className="flex-1">
              <button
                onClick={() => onChange(id)}
                aria-current={on ? 'page' : undefined}
                className={`relative flex min-h-[60px] w-full flex-col items-center justify-center gap-1 text-[11px] font-bold transition ${
                  on ? 'text-primary' : 'text-muted'
                }`}
              >
                <span className={`grid h-7 w-12 place-items-center rounded-full transition ${on ? 'bg-primary-soft' : ''}`}>
                  <Icon size={21} strokeWidth={on ? 2.5 : 2} />
                </span>
                {label}
                {!!badge && (
                  <span className="absolute right-[24%] top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
