/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Scores Service
 * Band score entry and retrieval for examination committees.
 */
import apiClient from './api';
import { createUuid } from '../utils/uuid';

const normalizeExamScore = sheet => {
  const latest = sheet.versions?.[0] || {};
  const values = latest.scores || sheet.draftScores || {};
  return {
    ...sheet,
    writing: Number(values.WRITING ?? values.writing ?? 0),
    reading: Number(values.READING ?? values.reading ?? 0),
    listening: Number(values.LISTENING ?? values.listening ?? 0),
    speaking: Number(values.SPEAKING ?? values.speaking ?? 0),
    average: Number(latest.overallScore ?? 0),
    bandLabel: latest.bandLabel || 'Pending',
    cefrLevel: latest.cefrLevel || 'Pending',
    status: String(sheet.status || '').toLowerCase(),
    testTakerName: sheet.testTakerName || `Application ${sheet.applicationId.slice(0, 8)}`,
  };
};

export const scoreService = {
  /** @returns {Promise<{data: import('../types').BandScore[]}>} */
  getAll: async () => {

    const { data } = await apiClient.get('/scores');
    return data;
  },

  /**
   * @param {string} examId
   * @returns {Promise<{data: import('../types').BandScore[]}>}
   */
  getByExam: async (examId) => {

    const { data } = await apiClient.get(`/exams/${examId}/scores`);
    const scores = data?.data ?? data;
    return { data: Array.isArray(scores) ? scores.map(normalizeExamScore) : [] };
  },

    getCandidates: async examId => {

    const { data } = await apiClient.get(`/exams/${examId}/candidates`);
    const candidates = data?.data ?? data;
    return { data: Array.isArray(candidates) ? candidates.map(candidate => ({
      ...candidate,
      applicationId: String(candidate.applicationId || candidate.id || ''),
      id: candidate.applicationId || candidate.id,
      testTakerName: candidate.testTakerName || (candidate.applicationId ? `Candidate ${candidate.applicationId.slice(0, 8)}` : `Candidate ${candidate.id}`),
      cid: candidate.identityKey || candidate.testTakerUserId,
      status: String(candidate.status || '').toLowerCase(),
      scoreStatus: String(candidate.scoreSheet?.status || 'PENDING').toLowerCase(),
    })) : [] };
  },

  /**
   * Get scores for the current test taker.
   * @param {string} userId
   */
  getMyScores: async (userId) => {

    const { data } = await apiClient.get('/results/my');
    return data;
  },

  getMyScore: async (userId) => scoreService.getMyScores(userId),

  /**
   * Submit band scores for a batch of applicants.
   * @param {string} examId
   * @param {Array<{applicationId: string, writing: number, reading: number, listening: number, speaking: number}>} scores
   */
  submit: async (examId, scores) => {

    const responses = await Promise.all(scores.map(async ({ applicationId, ...values }) => {
      const { data: draftEnvelope } = await apiClient.put(`/score-sheets/${applicationId}/draft`, values);
      const draft = draftEnvelope?.data ?? draftEnvelope;
      const { data: submitEnvelope } = await apiClient.post(
        `/score-sheets/${draft.id}/submit`, null,
        { headers: { 'Idempotency-Key': createUuid() } },
      );
      return submitEnvelope?.data ?? submitEnvelope;
    }));
    return { data: responses };
  },

  /**
   * Update a specific score entry.
   * @param {string} id
   * @param {Partial<import('../types').BandScore>} payload
   */
  update: async (id, payload) => {

    const { data } = await apiClient.put(`/scores/${id}`, payload);
    return data;
  },

  /**
   * Publish scores for an exam (makes them visible to test takers).
   * @param {string} examId
   */
  publish: async (examId) => {

    const { data } = await apiClient.post(`/exams/${examId}/declare-results`);
    return data;
  },

  /**
   * Get committee setup for an exam.
   * @param {string} examId
   */
  getCommittee: async (examId) => {

    const { data } = await apiClient.get(`/exams/${examId}/committee`);
    const committee = data?.data ?? data;
    return { data: committee ? {
      ...committee,
      members: (committee.members || []).map(member => ({ ...member, isHead: member.role === 'HEAD' })),
    } : null };
  },

  /**
   * Save committee member assignments for an exam.
   * @param {string} examId
   * @param {string[]} userIds
   */
  saveCommittee: async (examId, userIds) => {

    const members = userIds.map((userId, index) => ({ userId, role: index === 0 ? 'HEAD' : 'MEMBER' }));
    const { data } = await apiClient.put(`/exams/${examId}/committee`, { members });
    return data;
  },

  /**
   * Get dashboard statistics for a role.
   * @param {string} role
   */
  getDashboardStats: async (role) => {

    const { data } = await apiClient.get(`/dashboard/stats?role=${role}`);
    return data;
  },
};
