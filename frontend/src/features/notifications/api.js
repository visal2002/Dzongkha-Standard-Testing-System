/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Notifications Service
 * In-app notification management.
 */
import apiClient from '@/services/api';
import { MOCK_DATA_ALLOWED, USE_MOCK_DATA } from '@/lib/env';
import { notifications as notificationFixtures } from '@/mocks/mockData';

// The API returns an eventType and a readAt timestamp; useNotifications derives the
// display type and the read flag from those. The fixtures store the derived values
// instead, so they are mapped back to the wire shape here rather than teaching the
// hook about two different formats.
const EVENT_TYPES = {
  success: 'ApplicationVerified',
  warning: 'ApplicationReturned',
  error: 'ApplicationRejected',
  info: 'GeneralAnnouncement',
};

const toWireShape = (fixture) => ({
  id: fixture.id,
  userId: fixture.userId,
  title: fixture.title,
  message: fixture.message,
  eventType: EVENT_TYPES[fixture.type] || EVENT_TYPES.info,
  readAt: fixture.read ? fixture.createdAt : null,
  createdAt: fixture.createdAt,
});

// Mutable session state so marking as read and dismissing behave like the real API.
// Every demonstration role sees the same list: scoping to the signed-in user is the
// backend's job, driven by the token subject rather than by anything sent from here.
let mockNotifications = MOCK_DATA_ALLOWED ? notificationFixtures.map(toWireShape) : [];

export const notificationService = {
  getAll: async (limit = 50) => notificationService.getUserNotifications(undefined, limit),

  /**
   * Get all notifications for a specific user.
   * @param {string} userId
   * @param {number} [limit=20]
   */
  getUserNotifications: async (userId, limit = 20) => {
    if (USE_MOCK_DATA) {
      return { data: mockNotifications.slice(0, limit) };
    }

    const { data } = await apiClient.get(`/notifications?limit=${limit}`);
    return data;
  },

  /**
   * Mark a single notification as read.
   * @param {string} id
   */
  markAsRead: async (id) => {
    if (USE_MOCK_DATA) {
      mockNotifications = mockNotifications.map(item => (
        item.id === id ? { ...item, readAt: item.readAt || new Date().toISOString() } : item
      ));
      return { success: true };
    }

    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },

  /**
   * Mark all notifications as read for the current user.
   * @param {string} userId
   */
  markAllAsRead: async (userId) => {
    if (USE_MOCK_DATA) {
      const readAt = new Date().toISOString();
      mockNotifications = mockNotifications.map(item => ({ ...item, readAt: item.readAt || readAt }));
      return { success: true };
    }

    const { data } = await apiClient.post('/notifications/read-all');
    return data;
  },

  markAllRead: async () => notificationService.markAllAsRead(),

  /**
   * Delete a notification.
   * @param {string} id
   */
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      mockNotifications = mockNotifications.filter(item => item.id !== id);
      return { success: true };
    }

    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },

  dismiss: async (id) => notificationService.delete(id),
};
