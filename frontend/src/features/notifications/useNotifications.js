/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview useNotifications — Notification data hook
 *
 * Fetches and manages notifications for the current user.
 * Decouples the Header component from direct mockData imports.
 */
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from '@/features/notifications/api';

/**
 * @returns {{
 *   notifications: import('@/constants/domain').Notification[],
 *   unreadCount: number,
 *   loading: boolean,
 *   markAsRead: (id: string) => void,
 *   markAllAsRead: () => void,
 *   refresh: () => void,
 * }}
 */
export function useNotifications(limit = 20) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError('');
      const [result, total] = await Promise.all([notificationService.getUserNotifications(user.id, limit), notificationService.getUnreadCount()]);
      setHasMore((result?.data ?? []).length === limit);
      setUnreadCount(Number(total?.data?.unreadCount ?? 0));
      setNotifications((result?.data ?? []).map(item => ({ ...item, read: Boolean(item.readAt), type: notificationType(item.eventType) })));
    } catch {
      setError('Could not load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  const loadMore = useCallback(async () => {
    if (loading || !user?.id) return;
    setLoading(true);
    setError('');
    try {
      const result = await notificationService.getUserNotifications(user.id, limit, notifications.length);
      const items = result?.data ?? [];
      setHasMore(items.length === limit);
      setNotifications(previous => [...previous, ...items.filter(item => !previous.some(n => n.id === item.id)).map(item => ({ ...item, read: Boolean(item.readAt), type: notificationType(item.eventType) }))]);
    } catch { setError('Could not load more notifications. Please try again.'); }
    finally { setLoading(false); }
  }, [loading, user?.id, limit, notifications.length]);

  useEffect(() => {
    setNotifications([]);
    setUnreadCount(0);
    fetchNotifications();
    // Keep the full-page list stable while the user browses older pages.
    const timer = limit === 20 ? setInterval(fetchNotifications, 30000) : null;
    window.addEventListener('notifications-changed', fetchNotifications);
    return () => { if (timer) clearInterval(timer); window.removeEventListener('notifications-changed', fetchNotifications); };
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    const wasUnread = notifications.some(item => item.id === id && !item.read);
    if (wasUnread) setUnreadCount(count => Math.max(0, count - 1));
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    try {
      await notificationService.markAsRead(id);
      window.dispatchEvent(new Event('notifications-changed'));
    } catch {
      if (wasUnread) setUnreadCount(count => count + 1);
      setError('Could not mark the notification as read. Please try again.');
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await notificationService.markAllAsRead(user?.id);
      window.dispatchEvent(new Event('notifications-changed'));
      return true;
    } catch {
      // Refetch to get accurate state
      await fetchNotifications();
      setError('Could not mark notifications as read. Please try again.');
      return false;
    }
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}

function notificationType(eventType = '') {
  if (eventType.includes('Rejected') || eventType.includes('Revoked') || eventType.includes('Absent')) return 'error';
  if (eventType.includes('Returned') || eventType.includes('Waitlisted') || eventType.includes('Revision')) return 'warning';
  if (eventType.includes('Verified') || eventType.includes('Issued') || eventType.includes('Completed')) return 'success';
  return 'info';
}

export default useNotifications;
