/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Masters Service
 * System-wide master configuration management.
 */
import apiClient from './api';


export const masterService = {
  /** @returns {Promise<{data: import('@/constants/domain').MasterConfig}>} */
  getConfig: async () => {

    const { data } = await apiClient.get('/masters');
    return data;
  },

  /**
   * Update master configuration.
   * @param {Partial<import('@/constants/domain').MasterConfig>} payload
   */
  updateConfig: async (payload) => {

    const { data } = await apiClient.put('/masters', payload);
    return data;
  },

  /**
   * Get band level definitions.
   */
  getBandLevels: async () => {

    const { data } = await apiClient.get('/masters/band-levels');
    return data;
  },

  /**
   * Get notification templates.
   */
  getNotificationTemplates: async () => {

    const { data } = await apiClient.get('/masters/notification-templates');
    return data;
  },

  /**
   * Update notification templates.
   * @param {Object.<string, string>} templates
   */
  updateNotificationTemplates: async (templates) => {

    const { data } = await apiClient.put('/masters/notification-templates', { templates });
    return data;
  },
};
