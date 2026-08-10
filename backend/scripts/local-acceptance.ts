/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { randomUUID } from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AccessClaims } from '@dzongjuk/contracts';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message: string;
  requestId: string;
  error?: { code?: string; message?: string };
}

class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
    readonly payload: unknown,
  ) {
    super(message);
  }
}

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:8000/api/v1';
const jwtSecret = process.env.JWT_SECRET;
const internalServiceSecret = process.env.INTERNAL_SERVICE_SECRET;

if (process.env.NODE_ENV === 'production') throw new Error('Local acceptance tooling is disabled in production.');
if (!jwtSecret || jwtSecret.length < 32) throw new Error('JWT_SECRET must be loaded from the local .env file.');
if (!internalServiceSecret || internalServiceSecret.length < 32) throw new Error('INTERNAL_SERVICE_SECRET must be loaded from the local .env file.');

const jwt = new JwtService({
  secret: jwtSecret,
  signOptions: { expiresIn: '15m', issuer: 'dzongjuk-identity', audience: 'dzongjuk-services' },
});
const runId = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
const ids = {
  dcdd: '00000000-0000-4000-8000-000000000001',
  examHead: '00000000-0000-4000-8000-000000000002',
  committeeHead: '00000000-0000-4000-8000-000000000003',
  committeeMember: '00000000-0000-4000-8000-000000000004',
};

function accessToken(claims: Omit<AccessClaims, 'sessionId'>) {
  return jwt.sign({ ...claims, sessionId: randomUUID() });
}

const dcddToken = accessToken({
  sub: ids.dcdd,
  roles: ['dcdd'],
  permissions: [
    'exam.window.manage', 'registration.application.verify', 'attendance.mark',
    'committee.manage', 'score.rule.manage', 'result.declare', 'score.view',
    'question.assignment.manage', 'appeal.fee.manage', 'certificate.manage',
    'certificate.template.manage', 'certificate.issue', 'certificate.revoke',
  ],
  assurance: 'MFA',
});
const examHeadToken = accessToken({
  sub: ids.examHead,
  roles: ['exam_head'],
  permissions: ['question.secure.upload', 'question.secure.download', 'question.secure.publish'],
  assurance: 'MFA',
});
const committeeHeadToken = accessToken({
  sub: ids.committeeHead,
  roles: ['committee_head'],
  permissions: ['score.enter', 'score.submit', 'score.view', 'appeal.review'],
  assurance: 'MFA',
});
const chiefToken = accessToken({
  sub: '00000000-0000-4000-8000-000000000005',
  roles: ['chief_executive'],
  permissions: ['appeal.approve'],
  assurance: 'MFA',
});

async function request<T>(
  path: string,
  options: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.token) headers.set('authorization', `Bearer ${options.token}`);
  if (options.body !== undefined && !(options.body instanceof FormData)) headers.set('content-type', 'application/json');
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body instanceof FormData ? options.body : options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const payload = await response.json() as ApiEnvelope<T>;
  if (!response.ok || !payload.success) {
    throw new ApiError(response.status, payload.error?.code, `${path}: ${payload.error?.message ?? 'request failed'}`, payload);
  }
  return payload.data;
}

async function download(path: string, token: string) {
  const response = await fetch(`${baseUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}: ${path}`);
  return Buffer.from(await response.arrayBuffer());
}

async function retry<T>(label: string, action: () => Promise<T>, retryCodes: string[]) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 15; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      if (!(error instanceof ApiError) || !error.code || !retryCodes.includes(error.code)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error(`${label} did not become ready: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
}

async function testTakerSession() {
  const credentials = {
    email: 'local.acceptance@dzongjuk.test',
    cid: 'LOCALCID2026',
    fullName: 'Local Acceptance Test Taker',
    password: 'LocalTestOnly!2026',
  };
  try {
    await request('/auth/register', { method: 'POST', body: credentials });
  } catch (error) {
    if (!(error instanceof ApiError) || error.code !== 'USER_DUPLICATE') throw error;
  }
  return request<{ accessToken: string; user: { id: string } }>('/auth/login', {
    method: 'POST',
    body: { identifier: credentials.email, password: credentials.password },
  });
}

async function activeOrLocalScoringRule() {
  interface Rule {
    id: string;
    code: string;
    status: 'DRAFT' | 'APPROVED' | 'RETIRED';
    minimumScore: string;
    maximumScore: string;
    increment: string;
    bands: Array<{ min: number; max: number; label: string }>;
    effectiveFrom: string;
    effectiveTo: string | null;
  }
  const now = Date.now();
  const rules = await request<Rule[]>('/scoring-rules', { token: dcddToken });
  const approved = rules.find((rule) => rule.status === 'APPROVED'
    && new Date(rule.effectiveFrom).getTime() <= now
    && (!rule.effectiveTo || new Date(rule.effectiveTo).getTime() > now));
  if (approved) return approved;

  let local = rules.find((rule) => rule.code === 'LOCAL_ACCEPTANCE_V1');
  if (!local) {
    local = await request<Rule>('/scoring-rules', {
      method: 'POST',
      token: dcddToken,
      body: {
        code: 'LOCAL_ACCEPTANCE_V1',
        name: 'Local acceptance only - not an official scoring rule',
        minimumScore: 0,
        maximumScore: 100,
        increment: 1,
        roundingDecimals: 2,
        effectiveFrom: new Date(now - 86_400_000).toISOString(),
        bands: [
          { min: 0, max: 49.999, label: 'LOCAL_NEEDS_DEVELOPMENT' },
          { min: 50, max: 100, label: 'LOCAL_PROFICIENT' },
        ],
      },
    });
  }
  return request<Rule>(`/scoring-rules/${local.id}/approve`, { method: 'POST', token: dcddToken });
}

function scoreFor(rule: { minimumScore: string; maximumScore: string; increment: string; bands: Array<{ min: number; max: number }> }) {
  const minimum = Number(rule.minimumScore);
  const maximum = Number(rule.maximumScore);
  const increment = Number(rule.increment);
  const preferredBand = rule.bands.find((band) => band.min <= maximum && band.max >= minimum);
  if (!preferredBand) throw new Error('The active scoring rule has no usable band.');
  const target = Math.max(minimum, Math.min(maximum, (preferredBand.min + preferredBand.max) / 2));
  return Number((minimum + Math.round((target - minimum) / increment) * increment).toFixed(3));
}

async function activeOrLocalAppealFee() {
  interface FeeRule {
    id: string;
    code: string;
    amountPerSkill: string;
    currency: string;
    status: 'DRAFT' | 'APPROVED' | 'RETIRED';
    effectiveFrom: string;
    effectiveTo: string | null;
  }
  const now = Date.now();
  const fees = await request<FeeRule[]>('/appeal-fees', { token: dcddToken });
  const approved = fees.find((fee) => fee.status === 'APPROVED'
    && new Date(fee.effectiveFrom).getTime() <= now
    && (!fee.effectiveTo || new Date(fee.effectiveTo).getTime() > now));
  if (approved) return approved;
  let local = fees.find((fee) => fee.code === 'LOCAL_APPEAL_FEE_V1');
  if (!local) {
    local = await request<FeeRule>('/appeal-fees', {
      method: 'POST',
      token: dcddToken,
      body: {
        code: 'LOCAL_APPEAL_FEE_V1',
        amountPerSkill: 1,
        currency: 'BTN',
        effectiveFrom: new Date(now - 86_400_000).toISOString(),
      },
    });
  }
  return request<FeeRule>(`/appeal-fees/${local.id}/approve`, { method: 'POST', token: dcddToken });
}

async function activeOrLocalCertificateTemplate() {
  interface Template {
    id: string; code: string; status: 'DRAFT' | 'APPROVED' | 'RETIRED'; testOnly: boolean;
    effectiveFrom: string; effectiveTo: string | null;
  }
  const now = Date.now();
  const templates = await request<Template[]>('/certificate-templates', { token: dcddToken });
  const approved = templates.find((template) => template.status === 'APPROVED'
    && new Date(template.effectiveFrom).getTime() <= now
    && (!template.effectiveTo || new Date(template.effectiveTo).getTime() > now));
  if (approved) return approved;
  let local = templates.find((template) => template.code === 'LOCAL_CERTIFICATE_V1');
  if (!local) {
    local = await request<Template>('/certificate-templates', {
      method: 'POST', token: dcddToken,
      body: {
        code: 'LOCAL_CERTIFICATE_V1', versionNumber: 1,
        title: 'Dzongjuk Local Acceptance Certificate',
        declarationText: 'This local test artifact confirms the published DSTS result shown below.',
        signatoryName: 'Local Acceptance Signatory', signatoryTitle: 'Test Environment Only',
        paperSize: 'A4', orientation: 'LANDSCAPE', validityMonths: 24, testOnly: true,
        effectiveFrom: new Date(now - 86_400_000).toISOString(),
      },
    });
  }
  return request<Template>(`/certificate-templates/${local.id}/approve`, { method: 'POST', token: dcddToken });
}

async function waitForCertificateNotification(token: string, certificateId: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const notifications = await request<Array<{ eventType: string; safeMetadata: { certificateId?: string } }>>('/notifications?limit=100', { token });
    const match = notifications.find((item) => item.eventType === 'CertificateIssued' && item.safeMetadata.certificateId === certificateId);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('CertificateIssued notification was not projected.');
}

async function waitForScoreRevisionNotification(token: string, appealId: string) {
  for (let attempt = 0; attempt < 15; attempt += 1) {
    const notifications = await request<Array<{ eventType: string; safeMetadata: { appealId?: string } }>>('/notifications?limit=100', { token });
    const match = notifications.find((item) => item.eventType === 'ScoreRevised' && item.safeMetadata.appealId === appealId);
    if (match) return match;
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  throw new Error('ScoreRevised notification was not projected.');
}

async function confirmAppealPayment(appeal: { id: string; payment: { amount: string; currency: string } }, suffix: string) {
  return request(`/appeals/${appeal.id}/payment/confirm`, {
    method: 'POST',
    headers: { 'x-internal-service-key': internalServiceSecret! },
    body: {
      gateway: 'LOCAL_ACCEPTANCE',
      externalTransactionId: `LOCAL-PAYMENT-${runId}-${suffix}`,
      amount: Number(appeal.payment.amount),
      currency: appeal.payment.currency,
      paidAt: new Date().toISOString(),
    },
  });
}

async function main() {
  await request('/exams');
  const testTaker = await testTakerSession();
  const now = Date.now();
  const exam = await request<{ id: string }>('/exams', {
    method: 'POST',
    token: dcddToken,
    body: {
      code: `LOCAL-${runId}`.slice(0, 40),
      title: 'Local End-to-End Acceptance Examination',
      examDate: new Date(now + 86_400_000).toISOString(),
      registrationStart: new Date(now - 3_600_000).toISOString(),
      registrationEnd: new Date(now + 3_600_000).toISOString(),
      capacity: 10,
      venue: 'Local Docker Environment',
      registrationFee: '0',
    },
  });
  await request(`/exams/${exam.id}/status`, { method: 'PATCH', token: dcddToken, body: { status: 'PUBLISHED' } });
  await request(`/exams/${exam.id}/status`, { method: 'PATCH', token: dcddToken, body: { status: 'REGISTRATION_OPEN' } });

  const applicationKey = `local-application-${runId}`;
  const application = await request<{ applicationId: string; status: string }>(`/applications/exam/${exam.id}`, {
    method: 'POST',
    token: testTaker.accessToken,
    headers: { 'idempotency-key': applicationKey },
    body: {
      identityKey: 'LOCALCID2026',
      profileSnapshot: { fullName: 'Local Acceptance Test Taker', source: 'LOCAL_ACCEPTANCE' },
    },
  });
  const applicationReplay = await request<{ applicationId: string }>(`/applications/exam/${exam.id}`, {
    method: 'POST', token: testTaker.accessToken, headers: { 'idempotency-key': applicationKey },
    body: { identityKey: 'LOCALCID2026', profileSnapshot: { source: 'REPLAY_SHOULD_NOT_REPLACE' } },
  });
  if (applicationReplay.applicationId !== application.applicationId) throw new Error('Application idempotency replay failed.');

  await request(`/applications/${application.applicationId}/start-review`, { method: 'POST', token: dcddToken });
  await request(`/applications/${application.applicationId}/verify`, { method: 'POST', token: dcddToken });
  await request(`/attendance/${application.applicationId}`, { method: 'PATCH', token: dcddToken, body: { absentSkills: [] } });
  await request(`/exams/${exam.id}/status`, { method: 'PATCH', token: dcddToken, body: { status: 'REGISTRATION_CLOSED' } });
  await request(`/exams/${exam.id}/status`, { method: 'PATCH', token: dcddToken, body: { status: 'IN_PROGRESS' } });

  await request('/question-papers/assignments', {
    method: 'POST', token: dcddToken, body: { examId: exam.id, userId: ids.examHead },
  });
  const pdf = Buffer.from('%PDF-1.4\n% Dzongjuk local acceptance document\n%%EOF\n', 'utf8');
  const form = new FormData();
  form.set('examId', exam.id);
  form.set('title', 'Local Acceptance Question Paper');
  form.set('skill', 'WRITING');
  form.set('accessAllowedFrom', new Date(now - 60_000).toISOString());
  form.set('accessAllowedUntil', new Date(now + 3_600_000).toISOString());
  form.set('questionPaper', new Blob([new Uint8Array(pdf)], { type: 'application/pdf' }), 'local-acceptance.pdf');
  const paper = await request<{ id: string }>('/question-papers', { method: 'POST', token: examHeadToken, body: form });
  const downloaded = await download(`/question-papers/${paper.id}/question-document`, examHeadToken);
  if (!downloaded.equals(pdf)) throw new Error('Encrypted question-paper round trip did not preserve the PDF bytes.');

  await request(`/exams/${exam.id}/committee`, {
    method: 'POST',
    token: dcddToken,
    body: { members: [
      { userId: ids.committeeHead, role: 'HEAD' },
      { userId: ids.committeeMember, role: 'MEMBER' },
    ] },
  });

  const rule = await activeOrLocalScoringRule();
  const score = scoreFor(rule);
  const sheet = await retry('eligibility projection', () => request<{ id: string }>(`/score-sheets/${application.applicationId}/draft`, {
    method: 'PUT', token: committeeHeadToken,
    body: { writing: score, reading: score, listening: score, speaking: score },
  }), ['ELIGIBILITY_NOT_CONFIRMED']);
  const scoreKey = `local-score-${runId}`;
  const submitted = await request<{ scoreSheetId: string; overallScore: string }>(`/score-sheets/${sheet.id}/submit`, {
    method: 'POST', token: committeeHeadToken, headers: { 'idempotency-key': scoreKey },
  });
  const submittedReplay = await request<{ scoreSheetId: string }>(`/score-sheets/${sheet.id}/submit`, {
    method: 'POST', token: committeeHeadToken, headers: { 'idempotency-key': scoreKey },
  });
  if (submittedReplay.scoreSheetId !== submitted.scoreSheetId) throw new Error('Score submission idempotency replay failed.');

  const declaration = await request<{ id: string }>(`/exams/${exam.id}/declare-results`, { method: 'POST', token: dcddToken });
  await request(`/exams/${exam.id}/status`, { method: 'PATCH', token: dcddToken, body: { status: 'RESULTS_DECLARED' } });
  await retry('result declaration projection', () => request(`/question-papers/${paper.id}/publish-sample`, {
    method: 'POST', token: examHeadToken,
  }), ['RESULTS_NOT_DECLARED']);

  const samples = await request<Array<{ id: string }>>('/sample-papers');
  const myResults = await request<Array<{ id: string }>>('/results/my', { token: testTaker.accessToken });
  if (!samples.some((sample) => sample.id === paper.id)) throw new Error('Published sample is missing from the public list.');
  if (!myResults.some((result) => result.id === sheet.id)) throw new Error('Published score is missing from the test taker results.');

  await activeOrLocalCertificateTemplate();
  const certificateKey = `local-certificate-${runId}`;
  const generated = await request<{ issuedCount: number; certificates: Array<{ id: string; verificationToken: string }> }>('/certificates/generate', {
    method: 'POST', token: dcddToken, headers: { 'idempotency-key': certificateKey }, body: { examId: exam.id },
  });
  const certificate = generated.certificates[0];
  if (!certificate || generated.issuedCount !== 1) throw new Error('Certificate generation did not issue exactly one certificate.');
  const generatedReplay = await request<{ certificates: Array<{ id: string }> }>('/certificates/generate', {
    method: 'POST', token: dcddToken, headers: { 'idempotency-key': certificateKey }, body: { examId: exam.id },
  });
  if (generatedReplay.certificates[0]?.id !== certificate.id) throw new Error('Certificate generation idempotency replay failed.');
  const certificatePdf = await download(`/certificates/${certificate.id}/file`, testTaker.accessToken);
  if (certificatePdf.subarray(0, 4).toString() !== '%PDF') throw new Error('Certificate download is not a valid PDF document.');
  const verification = await request<{ valid: boolean; certificateNumber: string }>(`/public/certificates/verify/${encodeURIComponent(certificate.verificationToken)}`);
  if (!verification.valid) throw new Error('New certificate did not pass public verification.');
  const otherTakerToken = accessToken({ sub: randomUUID(), roles: ['test_taker'], permissions: ['certificate.view_own'], assurance: 'LOCAL' });
  try {
    await download(`/certificates/${certificate.id}/file`, otherTakerToken);
    throw new Error('Another test taker downloaded a certificate they do not own.');
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('HTTP 403')) throw error;
  }
  await waitForCertificateNotification(testTaker.accessToken, certificate.id);

  await activeOrLocalAppealFee();
  const noChangeKey = `local-appeal-no-change-${runId}`;
  const noChangeAppeal = await request<{ id: string; payment: { amount: string; currency: string } }>('/appeals', {
    method: 'POST',
    token: testTaker.accessToken,
    headers: { 'idempotency-key': noChangeKey },
    body: { applicationId: application.applicationId, examId: exam.id, skills: ['WRITING'], reason: 'Local acceptance verifies the complete no-change appeal path.' },
  });
  const noChangeReplay = await request<{ id: string }>('/appeals', {
    method: 'POST',
    token: testTaker.accessToken,
    headers: { 'idempotency-key': noChangeKey },
    body: { applicationId: application.applicationId, examId: exam.id, skills: ['READING'], reason: 'This replay payload must not replace the original appeal.' },
  });
  if (noChangeReplay.id !== noChangeAppeal.id) throw new Error('Appeal submission idempotency replay failed.');
  await confirmAppealPayment(noChangeAppeal, 'NO-CHANGE');
  const noChangeCompleted = await request<{ status: string }>(`/appeals/${noChangeAppeal.id}/committee-review`, {
    method: 'POST', token: committeeHeadToken, body: { recommendation: 'NO_CHANGE', remarks: 'Offline re-evaluation found no score change.' },
  });
  if (noChangeCompleted.status !== 'COMPLETED') throw new Error('No-change appeal did not complete.');

  const revisionAppeal = await request<{ id: string; payment: { amount: string; currency: string } }>('/appeals', {
    method: 'POST',
    token: testTaker.accessToken,
    headers: { 'idempotency-key': `local-appeal-revision-${runId}` },
    body: { applicationId: application.applicationId, examId: exam.id, skills: ['READING'], reason: 'Local acceptance verifies approved immutable score revision application.' },
  });
  await confirmAppealPayment(revisionAppeal, 'REVISION');
  const revisedScore = score + Number(rule.increment) <= Number(rule.maximumScore)
    ? score + Number(rule.increment)
    : score - Number(rule.increment);
  await request(`/appeals/${revisionAppeal.id}/committee-review`, {
    method: 'POST', token: committeeHeadToken,
    body: { recommendation: 'REVISE', remarks: 'Offline re-evaluation recommends a selected-skill revision.', proposedScores: { READING: revisedScore } },
  });
  const approvedAppeal = await request<{ status: string }>(`/appeals/${revisionAppeal.id}/decision`, {
    method: 'POST', token: chiefToken, body: { decision: 'APPROVED', remarks: 'Local acceptance approves controlled score revision application.' },
  });
  if (approvedAppeal.status !== 'APPROVED_PENDING_SCORE_UPDATE') throw new Error('Approved appeal skipped the controlled score revision state.');
  const appealHistory = await request<Array<{ toStatus: string }>>(`/appeals/${revisionAppeal.id}/history`, { token: testTaker.accessToken });
  if (!appealHistory.some((entry) => entry.toStatus === 'APPROVED_PENDING_SCORE_UPDATE')) throw new Error('Appeal history is missing the privileged approval transition.');

  interface AppliedAppeal {
    status: string;
    scoreRevision: { version: number; status: string; scores: Record<string, number> };
    certificateUpdate: { supersededCount: number; replacementIssuanceRequired: boolean };
  }
  const revisionKey = `local-apply-revision-${runId}`;
  const appliedAppeal = await request<AppliedAppeal>(`/appeals/${revisionAppeal.id}/apply-revision`, {
    method: 'POST', token: chiefToken, headers: { 'idempotency-key': revisionKey },
  });
  if (appliedAppeal.status !== 'COMPLETED' || appliedAppeal.scoreRevision.version !== 2) {
    throw new Error('Approved appeal did not complete with immutable score version 2.');
  }
  if (appliedAppeal.scoreRevision.scores.READING !== revisedScore) throw new Error('Revised score version does not contain the approved reading score.');
  if (appliedAppeal.certificateUpdate.supersededCount !== 1 || !appliedAppeal.certificateUpdate.replacementIssuanceRequired) {
    throw new Error('The certificate tied to the previous score version was not superseded.');
  }
  const appliedReplay = await request<AppliedAppeal>(`/appeals/${revisionAppeal.id}/apply-revision`, {
    method: 'POST', token: chiefToken, headers: { 'idempotency-key': revisionKey },
  });
  if (appliedReplay.scoreRevision.version !== appliedAppeal.scoreRevision.version) throw new Error('Appeal score revision idempotency replay failed.');

  const revisedResults = await request<Array<{ id: string; status: string; currentVersion: number; score: { scores: Record<string, number> } }>>('/results/my', { token: testTaker.accessToken });
  const revisedResult = revisedResults.find((result) => result.id === sheet.id);
  if (!revisedResult || revisedResult.status !== 'REVISED' || revisedResult.currentVersion !== 2 || revisedResult.score.scores.READING !== revisedScore) {
    throw new Error('The revised result is not visible to its test taker.');
  }
  const supersededVerification = await request<{ valid: boolean; status: string }>(`/public/certificates/verify/${encodeURIComponent(certificate.verificationToken)}`);
  if (supersededVerification.valid || supersededVerification.status !== 'SUPERSEDED') throw new Error('The previous certificate remains publicly valid after score revision.');
  await waitForScoreRevisionNotification(testTaker.accessToken, revisionAppeal.id);

  const replacement = await request<{ issuedCount: number; certificates: Array<{ id: string; verificationToken: string }> }>('/certificates/generate', {
    method: 'POST', token: dcddToken, headers: { 'idempotency-key': `local-certificate-replacement-${runId}` }, body: { examId: exam.id },
  });
  const replacementCertificate = replacement.certificates[0];
  if (!replacementCertificate || replacement.issuedCount !== 1 || replacementCertificate.id === certificate.id) {
    throw new Error('Explicit replacement certificate generation failed.');
  }
  const replacementVerification = await request<{ valid: boolean; certificateNumber: string }>(`/public/certificates/verify/${encodeURIComponent(replacementCertificate.verificationToken)}`);
  if (!replacementVerification.valid) throw new Error('Replacement certificate did not pass public verification.');
  const certificateHistory = await request<Array<{ id: string; status: string; scoreVersionNumber: number }>>(`/certificates/${replacementCertificate.id}/history`, { token: testTaker.accessToken });
  if (!certificateHistory.some((item) => item.id === certificate.id && item.status === 'SUPERSEDED' && item.scoreVersionNumber === 1)
    || !certificateHistory.some((item) => item.id === replacementCertificate.id && item.status === 'ACTIVE' && item.scoreVersionNumber === 2)) {
    throw new Error('Certificate history does not preserve the superseded and replacement versions.');
  }
  await waitForCertificateNotification(testTaker.accessToken, replacementCertificate.id);

  process.stdout.write(`${JSON.stringify({
    success: true,
    runId,
    examId: exam.id,
    applicationId: application.applicationId,
    questionPaperId: paper.id,
    scoreSheetId: sheet.id,
    declarationId: declaration.id,
    supersededCertificateId: certificate.id,
    replacementCertificateId: replacementCertificate.id,
    certificateNumber: replacementVerification.certificateNumber,
    completedAppealId: noChangeAppeal.id,
    revisedAppealId: revisionAppeal.id,
    overallScore: submitted.overallScore,
    scoringRule: rule.code,
    note: 'LOCAL_ACCEPTANCE scoring is test-only and is not an official formula.',
  }, null, 2)}\n`);
}

main().catch((error) => {
  const details = error instanceof ApiError
    ? { status: error.status, code: error.code, message: error.message, payload: error.payload }
    : { message: error instanceof Error ? error.message : String(error) };
  process.stderr.write(`${JSON.stringify({ success: false, ...details }, null, 2)}\n`);
  process.exitCode = 1;
});
