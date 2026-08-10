/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { AppealStatus, ApplicationStatus, CertificateStatus, ExamStatus, Skill } from '@dzongjuk/contracts';
import { IS_PUBLIC } from '../libs/security/src/security.decorators';
import { SamplePapersController } from '../apps/assessment-content-service/src/assessment.controller';
import { AppealsController } from '../apps/appeal-certificate-service/src/appeal.controller';
import { CertificatesController, PublicCertificatesController } from '../apps/appeal-certificate-service/src/certificate.controller';

describe('authoritative workflow contracts', () => {
  it('contains exactly the four BRD examination skills', () => {
    expect(Object.values(Skill)).toEqual(['WRITING', 'READING', 'LISTENING', 'SPEAKING']);
  });

  it('keeps absence and waitlisting as explicit application states', () => {
    expect(ApplicationStatus.Absent).toBe('ABSENT');
    expect(ApplicationStatus.Waitlisted).toBe('WAITLISTED');
  });

  it('separates result declaration from archival', () => {
    expect(ExamStatus.ResultsDeclared).not.toBe(ExamStatus.Archived);
  });

  it('keeps published sample listing and downloads public', () => {
    const listHandler = Reflect.get(SamplePapersController.prototype, 'list') as (...args: unknown[]) => unknown;
    const downloadHandler = Reflect.get(SamplePapersController.prototype, 'download') as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(IS_PUBLIC, listHandler)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, downloadHandler)).toBe(true);
  });

  it('does not treat privileged appeal approval as completed score revision', () => {
    expect(AppealStatus.ApprovedPendingScoreUpdate).not.toBe(AppealStatus.Completed);
  });

  it('keeps ordinary appeal submission authenticated while allowing internal-key payment transport', () => {
    const paymentHandler = Reflect.get(AppealsController.prototype, 'confirmPayment') as (...args: unknown[]) => unknown;
    const submitHandler = Reflect.get(AppealsController.prototype, 'submit') as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(IS_PUBLIC, paymentHandler)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, submitHandler)).not.toBe(true);
  });

  it('exposes only signed certificate verification publicly while protecting owner records and files', () => {
    const verifyHandler = Reflect.get(PublicCertificatesController.prototype, 'verify') as (...args: unknown[]) => unknown;
    const mineHandler = Reflect.get(CertificatesController.prototype, 'my') as (...args: unknown[]) => unknown;
    const fileHandler = Reflect.get(CertificatesController.prototype, 'file') as (...args: unknown[]) => unknown;
    expect(Reflect.getMetadata(IS_PUBLIC, verifyHandler)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, mineHandler)).not.toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, fileHandler)).not.toBe(true);
  });

  it('preserves explicit terminal certificate lifecycle states', () => {
    expect(CertificateStatus.Revoked).not.toBe(CertificateStatus.Expired);
    expect(CertificateStatus.Superseded).not.toBe(CertificateStatus.Revoked);
  });
});
