import { useState } from 'react';
import { Bell } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNotifications, useMarkAllRead, useMarkRead } from '@/features/notifications/api';
import { cn } from '@/lib/cn';

export function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const { data } = useNotifications();
  const markAll = useMarkAllRead();
  const markOne = useMarkRead();

  const items = data?.items ?? [];
  const unread = data?.meta?.unread ?? 0;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="card absolute right-0 z-20 mt-2 w-80 overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2">
                <span className="text-sm font-semibold text-slate-700">Notifications</span>
                {unread > 0 && (
                  <button onClick={() => markAll.mutate()} className="text-xs text-brand-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {items.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-slate-400">You're all caught up</p>
                ) : (
                  items.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.readAt && markOne.mutate(n.id)}
                      className={cn(
                        'block w-full border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50',
                        !n.readAt && 'bg-brand-50/40',
                      )}
                    >
                      <p className="text-sm font-medium text-slate-800">{n.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{n.body}</p>
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
