/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Questions Service
 * Question paper upload and retrieval.
 */
import apiClient from './api';



const fileSizeToBytes = (value) => {
  const match = String(value || '').match(/^([\d.]+)\s*(KB|MB)$/i);
  if (!match) return 0;
  return Math.round(Number(match[1]) * (match[2].toUpperCase() === 'MB' ? 1024 * 1024 : 1024));
};

const unwrap = payload => payload?.data ?? payload;
const unwrapList = payload => {
  const value = unwrap(payload);
  return Array.isArray(value) ? value : [];
};

const formatBytes = value => {
  const bytes = Number(value || 0);
  if (!bytes) return '0 KB';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

export const normalizeQuestionPaper = paper => {
  const documents = Array.isArray(paper?.documents) ? paper.documents : [];
  const questionDocument = documents.find(document => document.type === 'QUESTION_PAPER');
  const answerDocument = documents.find(document => document.type === 'ANSWER_SHEET');
  const skill = String(paper?.skill || '').toUpperCase();

  return {
    ...paper,
    skill,
    skillLabel: skill ? `${skill.charAt(0)}${skill.slice(1).toLowerCase()}` : 'Unspecified',
    status: String(paper?.status || 'READY').toUpperCase(),
    documents,
    questionDocument,
    answerDocument,
    fileName: questionDocument?.originalName || 'Question paper.pdf',
    fileSize: formatBytes(questionDocument?.sizeBytes),
    hasAnswerSheet: Boolean(answerDocument),
    isEncrypted: documents.some(document => document.encrypted) || documents.length > 0,
    uploadedAt: paper?.createdAt || paper?.uploadedAt,
    uploadedByName: paper?.uploadedByName || 'Authorised examiner',
  };
};

const toSamplePaper = paper => ({
  ...paper,
  status: 'SAMPLE_PUBLISHED',
  createdAt: paper.createdAt || paper.uploadedAt,
  documents: Array.isArray(paper.documents) ? paper.documents : [
    {
      id: `${paper.id}-question`,
      type: 'QUESTION_PAPER',
      originalName: paper.fileName || `${paper.id}.pdf`,
      sizeBytes: fileSizeToBytes(paper.fileSize),
      encrypted: true,
      scanStatus: 'CLEAN',
    },
    ...(paper.hasAnswerSheet ? [{
      id: `${paper.id}-answer`,
      type: 'ANSWER_SHEET',
      originalName: `${paper.id}-answer-sheet.pdf`,
      sizeBytes: 256 * 1024,
      encrypted: true,
      scanStatus: 'CLEAN',
    }] : []),
  ],
});

export const questionService = {
  /** @returns {Promise<{data: import('@/constants/domain').QuestionPaper[]}>} */
  getAll: async () => {

    const { data } = await apiClient.get('/questions');
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  /**
   * @param {string} examId
   */
  getByExam: async (examId) => {

    const { data } = await apiClient.get(`/questions?examId=${examId}`);
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  /** @param {string} id */
  getById: async (id) => {

    const { data } = await apiClient.get(`/questions/${id}`);
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  /**
   * Get sample papers (publicly available).
   */
  getSamples: async () => {

    const { data } = await apiClient.get('/sample-papers');
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  downloadSample: async (id, type = 'question') => {

    return apiClient.get(`/sample-papers/${id}/${type}`, { responseType: 'blob' });
  },

  getPapers: async () => questionService.getAll(),

  /**
   * The Exam Head's own assignments, split into skills already uploaded and
   * skills still pending, per assigned exam. Powers the dashboard's live
   * pending-upload status - `getAll()` only ever returns exams that already have
   * a paper, so an assignment with nothing uploaded yet is otherwise invisible.
   * @returns {Promise<{data: Array<{examId: string, skillsUploaded: string[], skillsPending: string[]}>>}
   */
  getMyAssignments: async () => {

    const { data } = await apiClient.get('/questions/assignments/mine');
    return { data: unwrapList(data) };
  },

  /**
   * Upload a new question paper.
   * @param {FormData|object} payload
   */
  upload: async (payload) => {

    const formData = payload instanceof FormData ? payload : new FormData();
    if (!(payload instanceof FormData)) {
      formData.set('examId', payload.examId);
      formData.set('skill', payload.skill);
      formData.set('title', payload.title);
      formData.set('accessAllowedFrom', new Date(payload.accessAllowedFrom).toISOString());
      formData.set('accessAllowedUntil', new Date(payload.accessAllowedUntil).toISOString());
      formData.set('questionPaper', payload.paperFile);
      if (payload.answerSheetFile) formData.set('answerSheet', payload.answerSheetFile);
    }
    // Axios detects FormData and supplies the browser-generated multipart boundary.
    const { data } = await apiClient.post('/questions', formData);
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  /**
   * Publish a question paper (makes it accessible on exam day).
   * @param {string} id
   */
  publish: async (id) => {

    const { data } = await apiClient.patch(`/questions/${id}/publish`);
    return data;
  },

  publishSample: async (id) => {

    const { data } = await apiClient.post(`/questions/${id}/publish-sample`);
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  downloadDocument: async (id, type = 'question') => {

    const endpoint = type === 'answer' ? 'answer-document' : 'question-document';
    return apiClient.get(`/questions/${id}/${endpoint}`, { responseType: 'blob' });
  },

  /** @param {string} id */
  delete: async (id) => {

    const { data } = await apiClient.delete(`/questions/${id}`);
    return data;
  },

  uploadPaper: async (formData) => questionService.upload(formData),
  deletePaper: async (id) => questionService.delete(id),
};
