/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Questions Service
 * Question paper upload and retrieval.
 */
import apiClient from '@/services/api';
import { USE_MOCK_DATA } from '@/lib/env';
import { readSessionUser } from '@/lib/session';
import { recordAuditEvent } from '@/services/audit';
import { questionPapers as mockQuestionPaperFixtures, examWindows as mockExamWindows } from '@/mocks/mockData';

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

// ─── Mock persistence ──────────────────────────────────────────────────────────
// Mirrors the created/patches/deleted pattern used by exams/api.js and
// registration/api.js: the fixture array is reset to its literal contents on every
// refresh, so runtime uploads, status changes and deletions are mirrored into
// localStorage and merged back on every read.
const MOCK_STORE_KEY = 'dsts_mock_question_papers';
const emptyMockStore = () => ({ created: [], patches: {}, deleted: [] });

const readMockStore = () => {
  if (!USE_MOCK_DATA || typeof localStorage === 'undefined') return emptyMockStore();
  try {
    const parsed = JSON.parse(localStorage.getItem(MOCK_STORE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return emptyMockStore();
    return {
      created: Array.isArray(parsed.created) ? parsed.created : [],
      patches: parsed.patches && typeof parsed.patches === 'object' ? parsed.patches : {},
      deleted: Array.isArray(parsed.deleted) ? parsed.deleted : [],
    };
  } catch {
    return emptyMockStore();
  }
};

const writeMockStore = (store) => {
  try {
    localStorage.setItem(MOCK_STORE_KEY, JSON.stringify(store));
  } catch {
    // storage unavailable or over quota — the change still shows for this session
  }
};

/**
 * Fixture papers reshaped into the documents[]-based shape `normalizeQuestionPaper`
 * expects from the real API. The access window is computed fresh from "now" every
 * call rather than baked in once, so a fixture paper is always open TODAY (the
 * BRD §5.4.2 BR-3 exam-day window is otherwise tied to a fixed exam date that would
 * age out of reach the first time the demo runs on a later day). The remaining
 * fixtures keep their own exam's 08:00-18:00 window, closed outside the real exam day.
 */
const seedMockPapers = () => {
  const now = new Date();
  return mockQuestionPaperFixtures.map((paper, index) => {
    const exam = mockExamWindows.find(e => e.id === paper.examId);
    const examDate = exam?.examDate ? new Date(exam.examDate) : null;
    let from = null;
    let until = null;
    if (index === 0) {
      from = new Date(now.getTime() - 60 * 60 * 1000);
      until = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    } else if (examDate && !Number.isNaN(examDate.getTime())) {
      from = new Date(examDate);
      from.setHours(8, 0, 0, 0);
      until = new Date(from.getTime() + 10 * 60 * 60 * 1000);
    }
    const questionBytes = fileSizeToBytes(paper.fileSize);
    return {
      id: paper.id,
      examId: paper.examId,
      title: paper.title,
      skill: String(paper.skill || '').toUpperCase(),
      status: paper.status === 'sample_published' ? 'SAMPLE_PUBLISHED' : paper.status === 'published' ? 'READY' : String(paper.status || 'READY').toUpperCase(),
      accessAllowedFrom: from ? from.toISOString() : null,
      accessAllowedUntil: until ? until.toISOString() : null,
      createdAt: paper.uploadedAt,
      uploadedByName: paper.uploadedByName,
      documents: [
        { id: `${paper.id}-question`, type: 'QUESTION_PAPER', originalName: paper.fileName, sizeBytes: questionBytes, encrypted: paper.isEncrypted !== false, scanStatus: 'CLEAN' },
        ...(paper.hasAnswerSheet ? [{
          id: `${paper.id}-answer`,
          type: 'ANSWER_SHEET',
          originalName: paper.fileName.replace(/\.pdf$/i, '-answer-sheet.pdf'),
          sizeBytes: Math.round(questionBytes * 0.3) || 256 * 1024,
          encrypted: true,
          scanStatus: 'CLEAN',
        }] : []),
      ],
    };
  });
};

/** Fixtures + locally created papers, with any saved status changes applied. */
const allMockPapers = () => {
  const { created, patches, deleted } = readMockStore();
  return [...created, ...seedMockPapers()]
    .filter(paper => !deleted.includes(paper.id))
    .map(paper => ({ ...paper, ...(patches[paper.id] || {}) }));
};

const buildMockPdfBlob = label => new Blob(
  [`%PDF-1.4\n% Mock document (${label}) generated for DSTS demo mode - no real content.\n%%EOF`],
  { type: 'application/pdf' },
);

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

export const questionService = {
  /** @returns {Promise<{data: import('@/constants/domain').QuestionPaper[]}>} */
  getAll: async () => {
    if (USE_MOCK_DATA) return { data: allMockPapers().map(normalizeQuestionPaper) };

    const { data } = await apiClient.get('/questions');
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  /**
   * @param {string} examId
   */
  getByExam: async (examId) => {
    if (USE_MOCK_DATA) return { data: allMockPapers().filter(paper => paper.examId === examId).map(normalizeQuestionPaper) };

    const { data } = await apiClient.get(`/questions?examId=${examId}`);
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      const found = allMockPapers().find(paper => paper.id === id);
      return { data: found ? normalizeQuestionPaper(found) : null };
    }

    const { data } = await apiClient.get(`/questions/${id}`);
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  /**
   * Get sample papers (publicly available).
   */
  getSamples: async () => {
    if (USE_MOCK_DATA) return { data: allMockPapers().filter(paper => paper.status === 'SAMPLE_PUBLISHED').map(normalizeQuestionPaper) };

    const { data } = await apiClient.get('/sample-papers');
    return { data: unwrapList(data).map(normalizeQuestionPaper) };
  },

  downloadSample: async (id, type = 'question') => {
    if (USE_MOCK_DATA) return { data: buildMockPdfBlob(`${id}-${type}`) };

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
    if (USE_MOCK_DATA) {
      const SKILLS = ['WRITING', 'READING', 'LISTENING', 'SPEAKING'];
      const papers = allMockPapers();
      // Mock mode has no real per-Exam-Head assignment record, so "assigned" is
      // approximated as "has at least one paper uploaded for this exam already" -
      // otherwise every exam window in the system would show up as pending.
      const assignments = mockExamWindows
        .map(exam => {
          const uploaded = [...new Set(papers.filter(paper => paper.examId === exam.id).map(paper => paper.skill))];
          return { examId: exam.id, skillsUploaded: uploaded, skillsPending: SKILLS.filter(skill => !uploaded.includes(skill)) };
        })
        .filter(item => item.skillsUploaded.length > 0);
      return { data: assignments };
    }

    const { data } = await apiClient.get('/questions/assignments/mine');
    return { data: unwrapList(data) };
  },

  /**
   * Upload a new question paper.
   * @param {FormData|object} payload
   */
  upload: async (payload) => {
    if (USE_MOCK_DATA) {
      const me = readSessionUser();
      const now = new Date().toISOString();
      const id = `QP-MOCK-${Date.now()}`;
      const paperFile = payload.paperFile;
      const answerSheetFile = payload.answerSheetFile;
      const created = {
        id,
        examId: payload.examId,
        title: payload.title,
        skill: String(payload.skill || '').toUpperCase(),
        status: 'READY',
        accessAllowedFrom: new Date(payload.accessAllowedFrom).toISOString(),
        accessAllowedUntil: new Date(payload.accessAllowedUntil).toISOString(),
        createdAt: now,
        uploadedByName: me?.name || 'Exam Head',
        documents: [
          { id: `${id}-question`, type: 'QUESTION_PAPER', originalName: paperFile?.name || `${id}.pdf`, sizeBytes: paperFile?.size || 0, encrypted: true, scanStatus: 'CLEAN' },
          ...(answerSheetFile ? [{ id: `${id}-answer`, type: 'ANSWER_SHEET', originalName: answerSheetFile.name, sizeBytes: answerSheetFile.size || 0, encrypted: true, scanStatus: 'CLEAN' }] : []),
        ],
      };
      const store = readMockStore();
      store.created.push(created);
      writeMockStore(store);
      recordAuditEvent({
        action: 'Question Paper Uploaded',
        source: 'assessment-content-service',
        resourceId: id,
        actorUserId: me?.userId || me?.id,
        role: me?.roleName || 'Exam Head',
        status: 'Success',
      });
      return { data: normalizeQuestionPaper(created) };
    }

    const formData = payload instanceof FormData ? payload : new FormData();
    if (!(payload instanceof FormData)) {
      formData.set('examId', payload.examId);
      formData.set('skill', payload.skill);
      formData.set('title', payload.title);
      formData.set('accessAllowedFrom', new Date(payload.accessAllowedFrom).toISOString());
      formData.set('accessAllowedUntil', new Date(payload.accessAllowedUntil).toISOString());
      // The assessment API accepts `file` as the primary document field. Using
      // this alias also avoids strict DTO validation treating `questionPaper`
      // as an unexpected text property in older deployed service builds.
      formData.set('file', payload.paperFile);
      if (payload.answerSheetFile) formData.set('answerSheet', payload.answerSheetFile);
    }
    // Override the API client's JSON default. Axios then preserves FormData and
    // lets the browser add the multipart boundary instead of JSON-serializing it.
    const { data } = await apiClient.post('/questions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  /**
   * Publish a question paper (makes it accessible on exam day).
   * @param {string} id
   */
  publish: async (id) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.patches[id] = { ...(store.patches[id] || {}), status: 'PUBLISHED' };
      writeMockStore(store);
      const updated = allMockPapers().find(paper => paper.id === id);
      return { data: updated ? normalizeQuestionPaper(updated) : null };
    }

    const { data } = await apiClient.patch(`/questions/${id}/publish`);
    return data;
  },

  publishSample: async (id) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.patches[id] = { ...(store.patches[id] || {}), status: 'SAMPLE_PUBLISHED' };
      writeMockStore(store);
      recordAuditEvent({ action: 'Question Paper Published to Samples', source: 'assessment-content-service', resourceId: id, status: 'Success' });
      const updated = allMockPapers().find(paper => paper.id === id);
      return { data: updated ? normalizeQuestionPaper(updated) : null };
    }

    const { data } = await apiClient.post(`/questions/${id}/publish-sample`);
    return { data: normalizeQuestionPaper(unwrap(data)) };
  },

  downloadDocument: async (id, type = 'question') => {
    if (USE_MOCK_DATA) {
      const paper = allMockPapers().find(item => item.id === id);
      if (!paper) return Promise.reject({ message: 'Question paper not found.' });
      const from = paper.accessAllowedFrom ? new Date(paper.accessAllowedFrom) : null;
      const until = paper.accessAllowedUntil ? new Date(paper.accessAllowedUntil) : null;
      const now = new Date();
      if ((from && now < from) || (until && now > until)) {
        return Promise.reject({ message: 'This document can only be opened during its scheduled access window.' });
      }
      return { data: buildMockPdfBlob(`${id}-${type}`) };
    }

    const endpoint = type === 'answer' ? 'answer-document' : 'question-document';
    return apiClient.get(`/questions/${id}/${endpoint}`, { responseType: 'blob' });
  },

  /** @param {string} id */
  delete: async (id) => {
    if (USE_MOCK_DATA) {
      const store = readMockStore();
      store.created = store.created.filter(paper => paper.id !== id);
      if (!store.deleted.includes(id)) store.deleted.push(id);
      delete store.patches[id];
      writeMockStore(store);
      recordAuditEvent({ action: 'Question Paper Deleted', source: 'assessment-content-service', resourceId: id, status: 'Success' });
      return { success: true };
    }

    const { data } = await apiClient.delete(`/questions/${id}`);
    return data;
  },

  uploadPaper: async (formData) => questionService.upload(formData),
  deletePaper: async (id) => questionService.delete(id),
};
