'use client';

import type { Ride } from '@/lib/types';
import { ChatPanel } from './ChatPanel';
import { Modal } from './ui';

export function ChatModal({ ride, onClose, title }: { ride: Ride; onClose: () => void; title: string }) {
  return (
    <Modal title={title} onClose={onClose}>
      <div className="-mx-5 h-[58vh] border-t border-line">
        <ChatPanel ride={ride} />
      </div>
    </Modal>
  );
}
