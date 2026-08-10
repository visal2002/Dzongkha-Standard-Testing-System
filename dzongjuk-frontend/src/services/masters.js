/**
 * @fileoverview Masters Service
 * System-wide master configuration management.
 */
import apiClient, { USE_MOCK, mockDelay, mockResponse } from './api';
import { masterConfig } from '../data/mockData';

export const masterService = {
  /** @returns {Promise<{data: import('../types').MasterConfig}>} */
  getConfig: async () => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(masterConfig); }
    const { data } = await apiClient.get('/masters');
    return data;
  },

  /**
   * Update master configuration.
   * @param {Partial<import('../types').MasterConfig>} payload
   */
  updateConfig: async (payload) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse({ ...masterConfig, ...payload }, 'Configuration saved.'); }
    const { data } = await apiClient.put('/masters', payload);
    return data;
  },

  /**
   * Get band level definitions.
   */
  getBandLevels: async () => {
    if (USE_MOCK) { await mockDelay(200); return mockResponse(masterConfig.bandLevels); }
    const { data } = await apiClient.get('/masters/band-levels');
    return data;
  },

  /**
   * Get notification templates.
   */
  getNotificationTemplates: async () => {
    if (USE_MOCK) { await mockDelay(200); return mockResponse(masterConfig.notificationTemplates); }
    const { data } = await apiClient.get('/masters/notification-templates');
    return data;
  },

  /**
   * Update notification templates.
   * @param {Object.<string, string>} templates
   */
  updateNotificationTemplates: async (templates) => {
    if (USE_MOCK) { await mockDelay(); return mockResponse(templates, 'Templates updated.'); }
    const { data } = await apiClient.put('/masters/notification-templates', { templates });
    return data;
  },
};
