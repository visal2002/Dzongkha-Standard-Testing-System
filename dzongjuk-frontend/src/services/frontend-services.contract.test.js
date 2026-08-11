/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { describe, expect, it } from 'vitest';
import { authService } from './auth';
import { adminService } from './admin';
import { attendanceService } from './attendance';
import { certificateService } from './certificates';
import { questionService } from './questions';

const expectPdf = async (blob) => {
  expect(blob).toBeInstanceOf(Blob);
  expect(blob.type).toBe('application/pdf');
  const signature = new TextDecoder().decode((await blob.arrayBuffer()).slice(0, 5));
  expect(signature).toBe('%PDF-');
};

describe('authentication contract', () => {
  it('accepts the local acceptance credentials in mock mode', async () => {
    const result = await authService.login('local.acceptance@dzongjuk.test', 'LocalTestOnly!2026');

    expect(result).toMatchObject({
      success: true,
      user: {
        email: 'local.acceptance@dzongjuk.test',
        role: 'test_taker',
      },
    });
    expect(result.token).toEqual(expect.any(String));
  });
});

describe('administration and attendance contracts', () => {
  it('returns roles with a permission map', async () => {
    const response = await adminService.getRoles();

    expect(response.data.length).toBeGreaterThan(0);
    response.data.forEach(role => {
      expect(role).toMatchObject({
        id: expect.any(String),
        name: expect.any(String),
        code: expect.any(String),
        permissions: expect.any(Object),
      });
    });
  });

  it('returns eligible applicants and supports marking an absence', async () => {
    const response = await attendanceService.getEligible();

    expect(response.data.length).toBeGreaterThan(0);
    expect(response.data[0]).toMatchObject({
      id: expect.any(String),
      testTakerName: expect.any(String),
      registrationNumber: expect.any(String),
    });

    const marked = await attendanceService.markAbsent(response.data[0].id, ['Writing']);
    expect(marked.data).toMatchObject({
      applicationId: response.data[0].id,
      present: false,
      absentSkills: ['Writing'],
    });
  });
});

describe('certificate service contract', () => {
  it('returns certificate records with every field required by the list view', async () => {
    const response = await certificateService.getByUser('USR-LOCAL-ACCEPTANCE');

    expect(response.data.length).toBeGreaterThan(0);
    response.data.forEach(certificate => {
      expect(certificate).toMatchObject({
        id: expect.any(String),
        holderName: expect.any(String),
        registrationNumber: expect.any(String),
        certificateNumber: expect.any(String),
        status: expect.any(String),
        verificationToken: expect.any(String),
        scoreSnapshot: {
          scores: expect.any(Object),
        },
      });
    });
  });

  it('returns a stable public verification response', async () => {
    const certificates = await certificateService.getAll();
    const certificate = certificates.data[0];
    const response = await certificateService.verifyQr(certificate.verificationToken);

    expect(response.data).toEqual(expect.objectContaining({
      valid: expect.any(Boolean),
      certificateNumber: certificate.certificateNumber,
      status: certificate.status,
      issuedAt: expect.any(String),
      validUntil: expect.any(String),
    }));
  });

  it('downloads a valid PDF payload', async () => {
    const certificates = await certificateService.getAll();
    const response = await certificateService.download(certificates.data[0].id);

    await expectPdf(response.data);
  });
});

describe('sample question-paper service contract', () => {
  it('normalizes every published paper into document records used by the page', async () => {
    const response = await questionService.getSamples();

    expect(response.data.length).toBeGreaterThan(0);
    response.data.forEach(paper => {
      expect(paper.status).toBe('SAMPLE_PUBLISHED');
      expect(paper.documents).toEqual(expect.any(Array));
      expect(paper.documents.find(document => document.type === 'QUESTION_PAPER')).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          originalName: expect.any(String),
          sizeBytes: expect.any(Number),
        }),
      );
    });
  });

  it('downloads a valid sample-paper PDF payload', async () => {
    const samples = await questionService.getSamples();
    const response = await questionService.downloadSample(samples.data[0].id);

    await expectPdf(response.data);
  });
});
