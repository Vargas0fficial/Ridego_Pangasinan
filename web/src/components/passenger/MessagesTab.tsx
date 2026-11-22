'use client';

import { MessageCircle } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { ChatPanel } from '../ChatPanel';
import { EmptyState } from '../ui';

export function MessagesTab() {
  const { ride } = useApp();
  const live = ride && ride.rider && ['accepted', 'arrived', 'ongoing'].includes(ride.status);
  if (!ride || !live) return <EmptyState icon={<MessageCircle size={28} />} title="No active chat" text="When a rider accepts your ride, you can message them here." />;
  return (
    <div className="mx-auto h-full max-w-xl">
      <ChatPanel ride={ride} />
    </div>
  );
}
