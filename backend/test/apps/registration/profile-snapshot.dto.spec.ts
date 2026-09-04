/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * DSTS-04: validation of the registration profileSnapshot.
 *
 * Both SubmitApplicationDto and ResubmitApplicationDto declared profileSnapshot as a
 * bare `@IsObject()`, so any JSON at all was written into the jsonb column and read
 * back later - including by certificateProfile(), which feeds fullName, cid and
 * dateOfBirth onto an issued certificate.
 *
 * These tests drive the real global ValidationPipe from platform.ts
 * (whitelist + forbidNonWhitelisted + transform), so what passes here is what passes
 * over HTTP.
 */

import { ArgumentMetadata, BadRequestException, ValidationPipe } from '@nestjs/common';
import { ResubmitApplicationDto, SubmitApplicationDto } from '../../../apps/registration-service/src/dtos';

// Mirrors bootstrapService()'s app.useGlobalPipes(...) exactly.
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

const submitMeta: ArgumentMetadata = { type: 'body', metatype: SubmitApplicationDto, data: '' };
const resubmitMeta: ArgumentMetadata = { type: 'body', metatype: ResubmitApplicationDto, data: '' };

/** Exactly what frontend ApplicationForm.jsx submits. */
const validProfile = () => ({
  fullName: 'Tenzin Dorji',
  cid: '11009988776',
  dateOfBirth: '1998-05-01',
  gender: 'Male',
  email: 'tenzin.dorji@example.bt',
  phone: '+975 17123456',
  dzongkhag: 'Thimphu',
  gewog: 'Chang',
  education: "Bachelor's Degree",
  institution: 'Royal University of Bhutan',
  employmentStatus: 'Employed',
  organization: 'Dzongkha Development Commission',
});

const submit = (profileSnapshot: unknown) => pipe.transform({ identityKey: 'CID-10701000001', profileSnapshot }, submitMeta);
const resubmit = (profileSnapshot: unknown) => pipe.transform({ profileSnapshot }, resubmitMeta);

/** The validation messages raised for a payload, or [] when it was accepted. */
async function messagesFor(run: () => Promise<unknown>) {
  try {
    await run();
    return [];
  } catch (error) {
    const response = (error as BadRequestException).getResponse() as { message?: string | string[] };
    return Array.isArray(response.message) ? response.message : [String(response.message)];
  }
}

const rejects = (run: () => Promise<unknown>) => expect(run()).rejects.toBeInstanceOf(BadRequestException);

// ─── the legitimate workflows still work ─────────────────────────────────────

describe('valid profiles are accepted', () => {
  it('accepts a complete submission from the application form', async () => {
    const result = (await submit(validProfile())) as SubmitApplicationDto;
    expect(result.profileSnapshot.fullName).toBe('Tenzin Dorji');
    expect(result.profileSnapshot.cid).toBe('11009988776');
    // Kept as the submitted string, not transformed into a Date - certificateProfile()
    // checks `typeof dateOfBirth === 'string'` before it reaches a certificate.
    expect(result.profileSnapshot.dateOfBirth).toBe('1998-05-01');
  });

  it('accepts the minimum the certificate pipeline needs', async () => {
    await expect(submit({ fullName: 'Tenzin Dorji', cid: '11009988776', dateOfBirth: '1998-05-01' })).resolves.toBeDefined();
  });

  it('accepts a resubmission, which is how a returned application is corrected', async () => {
    const result = (await resubmit(validProfile())) as ResubmitApplicationDto;
    expect(result.profileSnapshot.fullName).toBe('Tenzin Dorji');
  });

  it('accepts the prefixed CID form that already exists in the data', async () => {
    await expect(submit({ ...validProfile(), cid: 'CID-10701000001' })).resolves.toBeDefined();
  });

  it('accepts the alternate contact spellings the service layer reads as fallbacks', async () => {
    await expect(submit({ ...validProfile(), phone: undefined, contactNo: '17123456' })).resolves.toBeDefined();
    await expect(submit({ ...validProfile(), phone: undefined, mobileNo: '17123456' })).resolves.toBeDefined();
  });

  it('accepts an omitted optional organization', async () => {
    const profile = validProfile();
    delete (profile as Partial<typeof profile>).organization;
    await expect(submit(profile)).resolves.toBeDefined();
  });
});

// ─── the fields certificate generation depends on ────────────────────────────

describe('fields printed onto a certificate are required', () => {
  it.each(['fullName', 'cid', 'dateOfBirth'])('rejects a profile with no %s', async (field) => {
    const profile: Record<string, unknown> = validProfile();
    delete profile[field];
    expect(await messagesFor(() => submit(profile))).toContainEqual(expect.stringContaining(field));
  });

  it('rejects a fullName that is only whitespace padding beyond the limit', async () => {
    await rejects(() => submit({ ...validProfile(), fullName: 'x'.repeat(161) }));
  });

  it('rejects a single-character fullName', async () => {
    await rejects(() => submit({ ...validProfile(), fullName: 'T' }));
  });

  it('rejects a non-string fullName', async () => {
    await rejects(() => submit({ ...validProfile(), fullName: { toString: 'evil' } }));
    await rejects(() => submit({ ...validProfile(), fullName: 12345 }));
  });

  it.each([
    ['a CID with punctuation that would print onto a certificate', '1100/9988<script>'],
    ['a CID with a newline', '11009988\n776'],
    ['a CID that is too short', '119'],
    ['a CID beyond the column limit', '1'.repeat(65)],
  ])('rejects %s', async (_label, cid) => {
    await rejects(() => submit({ ...validProfile(), cid }));
  });
});

// ─── dates ───────────────────────────────────────────────────────────────────

describe('dateOfBirth is a real, plausible calendar date', () => {
  it.each([
    ['a non-existent calendar day', '2026-02-31'],
    ['a month out of range', '1998-13-01'],
    ['a free-text date', 'the first of May'],
    ['a date before 1900', '1899-12-31'],
    ['a timestamp rather than a date', '1998-05-01T00:00:00.000Z'],
  ])('rejects %s', async (_label, dateOfBirth) => {
    await rejects(() => submit({ ...validProfile(), dateOfBirth }));
  });

  it('rejects a date of birth in the future', async () => {
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    await rejects(() => submit({ ...validProfile(), dateOfBirth: nextYear }));
  });

  it('accepts an ordinary date of birth', async () => {
    await expect(submit({ ...validProfile(), dateOfBirth: '1970-01-01' })).resolves.toBeDefined();
  });
});

// ─── unexpected and oversized structures ─────────────────────────────────────

describe('unexpected and oversized structures are rejected', () => {
  it('rejects an unknown property rather than storing it', async () => {
    expect(await messagesFor(() => submit({ ...validProfile(), unexpectedField: 'anything' }))).toContainEqual(
      expect.stringContaining('unexpectedField'),
    );
  });

  it('rejects a prototype-pollution style key', async () => {
    await rejects(() => submit({ ...validProfile(), constructor: { prototype: {} } }));
  });

  it('rejects a nested object where a string belongs', async () => {
    await rejects(() => submit({ ...validProfile(), institution: { name: 'nested' } }));
  });

  it('rejects an array in place of the profile', async () => {
    await rejects(() => submit([{ fullName: 'Tenzin Dorji' }]));
  });

  it('rejects a string in place of the profile', async () => {
    await rejects(() => submit('fullName=Tenzin'));
  });

  it('rejects a null profile', async () => {
    await rejects(() => submit(null));
  });

  // Every field is length-bounded, so the accepted object cannot grow without limit
  // no matter how large the request body is.
  it('rejects an oversized value in every bounded field', async () => {
    const oversized = 'x'.repeat(100_000);
    for (const field of ['fullName', 'gender', 'dzongkhag', 'gewog', 'education', 'institution', 'employmentStatus', 'organization']) {
      await rejects(() => submit({ ...validProfile(), [field]: oversized }));
    }
  });

  it('rejects an oversized email address', async () => {
    await rejects(() => submit({ ...validProfile(), email: `${'a'.repeat(250)}@example.bt` }));
  });

  it('rejects a deeply nested payload smuggled through a known field', async () => {
    let nested: unknown = 'leaf';
    for (let depth = 0; depth < 500; depth += 1) nested = { nested };
    await rejects(() => submit({ ...validProfile(), organization: nested }));
  });
});

// ─── contact fields ──────────────────────────────────────────────────────────

describe('contact fields are validated', () => {
  it.each([
    ['not-an-email'],
    ['tenzin@'],
    ['@example.bt'],
  ])('rejects the malformed email %s', async (email) => {
    await rejects(() => submit({ ...validProfile(), email }));
  });

  it.each([
    ['a phone with letters', '+975 CALL-ME'],
    ['a phone that is too short', '123'],
    ['a phone beyond the limit', `+975${'1'.repeat(40)}`],
  ])('rejects %s', async (_label, phone) => {
    await rejects(() => submit({ ...validProfile(), phone }));
  });

  it('accepts the phone formats the form produces', async () => {
    for (const phone of ['17123456', '+975 17123456', '+975-17-123-456', '(02) 322345']) {
      await expect(submit({ ...validProfile(), phone })).resolves.toBeDefined();
    }
  });
});

// ─── resubmission is validated the same way ──────────────────────────────────

describe('resubmission is held to the same rules', () => {
  it('rejects an unknown property on resubmission', async () => {
    await rejects(() => resubmit({ ...validProfile(), unexpectedField: 'anything' }));
  });

  it('rejects a resubmission missing the certificate fields', async () => {
    await rejects(() => resubmit({ gender: 'Male' }));
  });

  it('does not accept identityKey as a way to change the immutable identity', async () => {
    // ResubmitApplicationDto has no top-level identityKey, so forbidNonWhitelisted
    // rejects an attempt to supply one.
    await expect(
      pipe.transform({ identityKey: 'CID-99999999999', profileSnapshot: validProfile() }, resubmitMeta),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
