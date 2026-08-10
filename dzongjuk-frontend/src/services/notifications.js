/**
 * @fileoverview Notifications Service
 * In-app notification management.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { notifications } from '../data/mockData';

export const notificationService = {
  /**
   * Get all notifications for a specific user.
   * @param {string} userId
   * @param {number} [limit=20]
   */
  getUserNotifications: async (userId, limit = 20) => {
    if (USE_MOCK) {
      await mockDelay(300);
      return mockResponse(notifications.filter(n => n.userId === userId).slice(0, limit));
    }
    const { data } = await apiClient.get(`/notifications?limit=${limit}`);
    return data;
  },

  /**
   * Mark a single notification as read.
   * @param {string} id
   */
  markAsRead: async (id) => {
    if (USE_MOCK) { await mockDelay(150); return mockResponse({ id, read: true }); }
    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },

  /**
   * Mark all notifications as read for the current user.
   * @param {string} userId
   */
  markAllAsRead: async (userId) => {
    if (USE_MOCK) { await mockDelay(300); return mockResponse(null, 'All marked as read.'); }
    const { data } = await apiClient.post('/notifications/read-all');
    return data;
  },

  /**
   * Delete a notification.
   * @param {string} id
   */
  delete: async (id) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(null, 'Deleted.'); }
    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },
};
