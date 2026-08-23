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
import { useAuth } from '../context/AuthContext';
import { notificationService } from '../services/notifications';

/**
 * @returns {{
 *   notifications: import('../types/index').Notification[],
 *   unreadCount: number,
 *   loading: boolean,
 *   markAsRead: (id: string) => void,
 *   markAllAsRead: () => void,
 *   refresh: () => void,
 * }}
 */
export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const result = await notificationService.getUserNotifications(user.id);
      setNotifications((result?.data ?? []).map(item => ({ ...item, read: Boolean(item.readAt), type: notificationType(item.eventType) })));
    } catch {
      // Silently fail — notifications are non-critical
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (id) => {
    setNotifications(prev =>
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
    try {
      await notificationService.markAsRead(id);
    } catch {
      // Revert on failure
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: false } : n)
      );
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try {
      await notificationService.markAllAsRead(user?.id);
    } catch {
      // Refetch to get accurate state
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    loading,
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
