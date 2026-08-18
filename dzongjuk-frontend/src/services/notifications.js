/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Notifications Service
 * In-app notification management.
 */
import apiClient from './api';


export const notificationService = {
  getAll: async (limit = 50) => notificationService.getUserNotifications(undefined, limit),

  /**
   * Get all notifications for a specific user.
   * @param {string} userId
   * @param {number} [limit=20]
   */
  getUserNotifications: async (userId, limit = 20) => {

    const { data } = await apiClient.get(`/notifications?limit=${limit}`);
    return data;
  },

  /**
   * Mark a single notification as read.
   * @param {string} id
   */
  markAsRead: async (id) => {

    const { data } = await apiClient.patch(`/notifications/${id}/read`);
    return data;
  },

  /**
   * Mark all notifications as read for the current user.
   * @param {string} userId
   */
  markAllAsRead: async (userId) => {

    const { data } = await apiClient.post('/notifications/read-all');
    return data;
  },

  markAllRead: async () => notificationService.markAllAsRead(),

  /**
   * Delete a notification.
   * @param {string} id
   */
  delete: async (id) => {

    const { data } = await apiClient.delete(`/notifications/${id}`);
    return data;
  },

  dismiss: async (id) => notificationService.delete(id),
};
