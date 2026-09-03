/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * @fileoverview Certificates Service
 * Certificate generation, listing, and QR verification.
 */
import apiClient from '@/services/api';
import { USE_MOCK_DATA } from '@/lib/env';
import { readSessionUser } from '@/lib/session';
import { createUuid } from '@/utils/uuid';
import {
  certificates as mockCertificates,
  examWindows as mockExamWindows,
  applications as mockApplications,
} from '@/mocks/mockData';

// Pulls the attachment filename out of a Content-Disposition header when the
// browser/CORS setup exposes it (the API must send Access-Control-Expose-Headers:
// Content-Disposition for a cross-origin build). Callers fall back to a default.
const filenameFromContentDisposition = (header) => {
  if (!header || typeof header !== 'string') return null;
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8) {
    try { return decodeURIComponent(utf8[1]); } catch { /* fall through to the plain form */ }
  }
  const plain = header.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : null;
};

const storedApplications = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem('dsts_mock_applications') || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const hashString = (value) => {
  let hash = 0;
  const text = String(value || 'DSTS');
  for (let i = 0; i < text.length; i += 1) hash = (hash * 31 + text.charCodeAt(i)) | 0;
  return Math.abs(hash);
};

// Deterministic demo band levels (4-8) derived from the candidate's CID, so a given
// person always sees the same certificate. A real deployment reads the declared,
// moderated band scores instead.
const deriveSkillScores = (seed) => {
  const h = hashString(seed);
  const pick = (n) => 4 + ((h >> (n * 3)) % 5);
  const scores = { LISTENING: pick(0), READING: pick(1), WRITING: pick(2), SPEAKING: pick(3) };
  const overall = Math.round((scores.LISTENING + scores.READING + scores.WRITING + scores.SPEAKING) / 4);
  return { scores, overall };
};

const addYears = (date, years) => {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const buildCertificateFromApplication = (app) => {
  const me = readSessionUser();
  const exam = mockExamWindows.find((e) => e.id === app.examId);
  const { scores, overall } = deriveSkillScores(app.cid || app.identityKey || app.id);
  const issued = new Date();
  return {
    id: `CERT-${app.id}`,
    examId: app.examId,
    applicationId: app.id,
    certificateNumber: `DSTS-${issued.getFullYear()}-${String((hashString(app.id) % 9000) + 1000)}`,
    holderName: app.testTakerName || me?.name || 'Test Taker',
    cid: app.cid || app.identityKey || me?.cid || '',
    dob: app.dob || app.profileSnapshot?.dateOfBirth || me?.dateOfBirth || null,
    registrationNumber: app.registrationNumber || '',
    dstsNumber: `K${String(me?.userId || '0000').padStart(4, '0')}`,
    dateOfExamination: exam?.examDate || null,
    examTitle: exam?.title || app.examId,
    scoreSnapshot: { scores, overallScore: overall },
    bandLabel: `Level ${overall}`,
    cefrLevel: `Level ${overall}`,
    overallLevel: overall,
    issuedAt: issued.toISOString(),
    validUntil: addYears(issued, 3).toISOString(),
    verificationToken: `DSTS-CERT-${app.id}-VERIFY`,
    status: 'ACTIVE',
    photo: me?.photo || null,
    downloadCount: 0,
  };
};

/** Certificates for whoever is signed in - one per non-cancelled exam application. */
const currentUserCertificates = () => {
  const me = readSessionUser();
  if (!me) return [];
  const seen = new Set();
  return [...storedApplications(), ...mockApplications]
    .filter((a) => {
      const status = String(a.status || '').toLowerCase();
      const mine = a.testTakerId === me.id || a.testTakerUserId === me.id
        || a.cid === me.cid || a.identityKey === me.cid;
      return mine && !['cancelled', 'returned'].includes(status);
    })
    .filter((a) => (seen.has(a.id) ? false : seen.add(a.id)))
    .map(buildCertificateFromApplication);
};

const allMockCertificates = () => [...currentUserCertificates(), ...mockCertificates];

export const certificateService = {
  /** @returns {Promise<{data: import('@/constants/domain').Certificate[]}>} */
  getAll: async () => {
    if (USE_MOCK_DATA) return { data: allMockCertificates() };

    const { data } = await apiClient.get('/certificates');
    return data;
  },

  /**
   * @param {string} userId
   */
  getByUser: async (userId) => {
    if (USE_MOCK_DATA) return { data: currentUserCertificates() };

    const { data } = await apiClient.get('/certificates/my');
    return data;
  },

  /** @param {string} id */
  getById: async (id) => {
    if (USE_MOCK_DATA) {
      const found = allMockCertificates().find((c) => c.id === id || c.certificateNumber === id);
      return { data: found ?? null };
    }

    const { data } = await apiClient.get(`/certificates/${id}`);
    return data;
  },

  /**
   * Generate certificates for all eligible applicants of an exam.
   * @param {string} examId
   */
  generateBatch: async (examId) => {
    if (USE_MOCK_DATA) {
      const issued = allMockCertificates().filter((c) => c.examId === examId).length;
      return { data: { issuedCount: issued, examId } };
    }

    const { data } = await apiClient.post('/certificates/generate', { examId }, { headers: { 'Idempotency-Key': createUuid() } });
    return data;
  },

  /**
   * Verify a certificate via its QR token.
   * @param {string} token
   */
  verifyQr: async (token) => {
    if (USE_MOCK_DATA) {
      const match = allMockCertificates().find((c) => c.verificationToken === token);
      return {
        data: match
          ? { valid: true, certificateNumber: match.certificateNumber, status: match.status, validUntil: match.validUntil }
          : { valid: false },
      };
    }

    const { data } = await apiClient.get(`/public/certificates/verify/${encodeURIComponent(token)}`);
    return data;
  },

  verify: async (token) => certificateService.verifyQr(token),

  /**
   * Increment the download count for a certificate. In mock mode the certificate is
   * rendered client-side on the print route, so this is a no-op there.
   * @param {string} id
   */
  download: async (id) => {
    if (USE_MOCK_DATA) return { data: null };

    return apiClient.get(`/certificates/${id}/file`, { responseType: 'blob' });
  },

  recordDownload: async (id) => certificateService.download(id),

  /**
   * Self-service download of the signed-in Test Taker's most recently issued
   * certificate as a PDF blob. The backend (GET /certificates/download) re-renders
   * it from the stored result snapshot, redacts the template's demo name, overlays
   * the real holder name and stamps a fresh verification QR, then streams it as an
   * attachment. Returns the blob plus the server-suggested filename.
   * @returns {Promise<{ blob: Blob, filename: string }>}
   */
  downloadOwn: async () => {
    if (USE_MOCK_DATA) {
      throw new Error('Certificate PDF download needs the live backend. In demo mode, open the print view instead.');
    }
    const response = await apiClient.get('/certificates/download', { responseType: 'blob' });
    return {
      blob: response.data,
      filename: filenameFromContentDisposition(response.headers?.['content-disposition']) || 'Certificate.pdf',
    };
  },

  /**
   * Master Configuration - every certificate template version (Draft/Approved/Retired),
   * newest version first per code.
   * @returns {Promise<{data: Array}>}
   */
  listTemplates: async () => {

    const { data } = await apiClient.get('/certificate-templates');
    return data;
  },

  /**
   * Create a new draft template version. Takes effect only once approved via
   * approveTemplate - certificate generation always reads the active Approved version.
   * @param {Object} payload
   */
  createTemplate: async (payload) => {

    const { data } = await apiClient.post('/certificate-templates', payload);
    return data;
  },

  /** @param {string} id */
  approveTemplate: async (id) => {

    const { data } = await apiClient.post(`/certificate-templates/${id}/approve`);
    return data;
  },
};
