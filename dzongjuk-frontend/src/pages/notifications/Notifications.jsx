import { useState } from 'react';
import { Bell, CheckCheck, Trash2, Filter } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Badge, { StatusBadge } from '../../components/ui/Badge';
import { notificationService } from '../../services/notifications';
import { useApi } from '../../hooks/useApi';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_COLORS = {
  success: 'border-l-emerald-400 bg-emerald-500/5',
  warning: 'border-l-amber-400 bg-amber-500/5',
  error: 'border-l-red-400 bg-red-500/5',
  info: 'border-l-blue-400 bg-blue-500/5',
};

export default function Notifications() {
  const { user } = useAuth();
  const { data: apiNotifs, loading, setData: setNotifs } = useApi(notificationService.getAll);
  const notifs = apiNotifs || [];
  const unread = notifs.filter(n => !n.read);

  const markAll = async () => {
    try {
      await notificationService.markAllRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
      toast.success('All notifications marked as read');
    } catch {
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    }
  };

  const dismiss = async (id) => {
    try {
      await notificationService.dismiss(id);
    } finally {
      setNotifs(prev => prev.filter(n => n.id !== id));
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        subtitle="System alerts, status updates, and activity notifications"
        breadcrumbs={[{ label: 'Notifications' }]}
        icon={<Bell size={18} />}
        action={
          <div className="flex gap-2">
            {unread.length > 0 && (
              <Button variant="secondary" size="sm" icon={<CheckCheck size={13} />} onClick={markAll}>Mark all read</Button>
            )}
          </div>
        }
      />

      {unread.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="gold" dot>{unread.length} unread</Badge>
        </div>
      )}

      <div className="space-y-2">
        {notifs.length === 0 ? (
          <div className="text-center py-16 text-text-muted">
            <Bell size={40} className="mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium text-text-primary">No notifications</p>
            <p className="text-xs mt-1">You're all caught up!</p>
          </div>
        ) : notifs.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.03 }}
            className={[
              'flex items-start gap-3 p-4 border border-l-4 rounded-xl transition-all',
              TYPE_COLORS[n.type] || 'border-l-[var(--color-surface-border)] bg-surface-card',
              !n.read ? 'border-surface-border' : 'border-surface-border/40 opacity-60',
            ].join(' ')}
          >
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.read ? (n.type === 'success' ? 'bg-emerald-400' : n.type === 'warning' ? 'bg-amber-400' : n.type === 'error' ? 'bg-red-400' : 'bg-blue-400') : 'bg-transparent'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary">{n.title}</p>
              <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{n.message}</p>
              <p className="text-[10px] text-text-muted mt-1">{new Date(n.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!n.read && (
                <button
                  onClick={() => setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x))}
                  className="text-[10px] text-text-muted hover:text-text-primary px-2 py-1 rounded transition-colors"
                >
                  Mark read
                </button>
              )}
              <button onClick={() => dismiss(n.id)} className="p-1 hover:bg-[var(--color-surface-border)] rounded transition-colors">
                <Trash2 size={12} className="text-text-muted" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
