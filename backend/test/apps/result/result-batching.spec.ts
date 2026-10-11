/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `getExamScores`, `myResults` and `certificateResults` each used to issue one
 * `ScoreVersionEntity` query per score sheet inside a `Promise.all`. They now
 * resolve every sheet's versions in a single batched query, matched in memory.
 * These pin the batching (query count) and the per-sheet shape it must preserve.
 */
import { ConfigService } from '@nestjs/config';
import { AccessClaims, ScoreSheetStatus } from '@dzongjuk/contracts';
import { ResultService } from '../../../apps/result-service/src/result.service';
import { IdentityClientService } from '../../../apps/result-service/src/identity-client.service';
import { ScoringService } from '../../../apps/result-service/src/scoring.service';
import {
  EligibilityStatus,
  ScoreSheetEntity,
  ScoreVersionEntity,
} from '../../../apps/result-service/src/entities';

const uuid = () => `20000000-0000-4000-8000-${Math.random().toString().slice(2, 14).padEnd(12, '0')}`;

const config = new ConfigService({ PRIVILEGED_ASSURANCE_LEVELS: 'MFA', INTERNAL_SERVICE_SECRET: 'a'.repeat(32) });
const identityClient = { nameFor: jest.fn(), namesFor: jest.fn().mockResolvedValue(new Map()), applicationProfilesFor: jest.fn().mockResolvedValue(new Map()) } as unknown as IdentityClientService;

const managerActor: AccessClaims = { sub: uuid(), sessionId: uuid(), roles: ['identity_admin'], permissions: ['*'], assurance: 'MFA' };

const sheet = (id: string, applicationId: string, currentVersion: number, status = ScoreSheetStatus.Published) =>
  Object.assign(new ScoreSheetEntity(), {
    id, examId: 'exam-1', applicationId, committeeId: 'committee-1', enteredByUserId: uuid(),
    draftScores: { WRITING: 6, READING: 6, LISTENING: 6, SPEAKING: 6 }, status, currentVersion,
  });

const version = (scoreSheetId: string, versionNumber: number) =>
  Object.assign(new ScoreVersionEntity(), {
    id: uuid(), scoreSheetId, versionNumber,
    scores: { WRITING: 6, READING: 6, LISTENING: 6, SPEAKING: 6 },
    overallScore: '6.0', bandLabel: 'MEDIUM', cefrLevel: 'B2', scoringRuleId: uuid(),
    source: 'ORIGINAL', createdByUserId: uuid(),
  });

describe('ResultService batched version lookups', () => {
  it('getExamScores fetches all versions in one query and groups them per sheet, newest first', async () => {
    const sheetA = sheet('sheet-a', 'app-a', 2);
    const sheetB = sheet('sheet-b', 'app-b', 1);
    // The repository's `order: { versionNumber: 'DESC' }` is real TypeORM behaviour
    // this mock cannot execute, so the fixture is pre-sorted the way Postgres would
    // return it - versionsBySheet groups by push order and relies on that ordering.
    const versionsFind = jest.fn().mockResolvedValue([
      version('sheet-a', 2), version('sheet-a', 1), version('sheet-b', 1),
    ]);
    const versions = { find: versionsFind, findBy: jest.fn() } as unknown as never;
    const sheets = { find: jest.fn().mockResolvedValue([sheetA, sheetB]) } as unknown as never;
    const committees = { findOneBy: jest.fn().mockResolvedValue(null) } as unknown as never;
    const members = { existsBy: jest.fn() } as unknown as never;
    const eligibility = {} as never;

    const service = new ResultService({} as never, {} as ScoringService, config, identityClient, committees, members, eligibility, sheets, versions);
    (identityClient.applicationProfilesFor as jest.Mock).mockResolvedValueOnce(new Map([
      ['app-a', { name: 'QA Candidate', registrationNumber: 'ཀ-༢༦-༠༠༡' }],
      ['app-b', { name: 'Legacy Candidate', registrationNumber: 'DSTS-2026-38F2A5AE' }],
    ]));

    const result = await service.getExamScores('exam-1', managerActor);

    expect(versionsFind).toHaveBeenCalledTimes(1);
    expect(result.find((r) => r.id === 'sheet-a')!.versions.map((v: ScoreVersionEntity) => v.versionNumber)).toEqual([2, 1]);
    expect(result.find((r) => r.id === 'sheet-b')!.versions.map((v: ScoreVersionEntity) => v.versionNumber)).toEqual([1]);
    expect(result.find(r => r.id === 'sheet-a')).toMatchObject({ registrationNumber: 'ཀ-༢༦-༠༠༡', testTakerName: 'QA Candidate' });
    expect(result.find(r => r.id === 'sheet-b')).toMatchObject({ registrationNumber: 'DSTS-2026-38F2A5AE', testTakerName: 'Legacy Candidate' });
  });

  it('getExamScores gives a sheet with no versions an empty array, not undefined', async () => {
    const sheetA = sheet('sheet-a', 'app-a', 0);
    const versions = { find: jest.fn().mockResolvedValue([]), findBy: jest.fn() } as unknown as never;
    const sheets = { find: jest.fn().mockResolvedValue([sheetA]) } as unknown as never;
    const committees = { findOneBy: jest.fn().mockResolvedValue(null) } as unknown as never;
    const members = { existsBy: jest.fn() } as unknown as never;

    const service = new ResultService({} as never, {} as ScoringService, config, identityClient, committees, members, {} as never, sheets, versions);
    const result = await service.getExamScores('exam-1', managerActor);
    expect(result[0].versions).toEqual([]);
    expect(result[0].registrationNumber).toBeNull();
  });

  it('myResults matches each sheet to the version its currentVersion actually points at', async () => {
    const sheetA = sheet('sheet-a', 'app-a', 2);
    // Two versions on the same sheet: only the one matching currentVersion must be picked.
    const versionsFindBy = jest.fn().mockResolvedValue([version('sheet-a', 1), version('sheet-a', 2)]);
    const versions = { find: jest.fn(), findBy: versionsFindBy } as unknown as never;
    const sheets = { findBy: jest.fn().mockResolvedValue([sheetA]) } as unknown as never;
    const eligibility = { findBy: jest.fn().mockResolvedValue([{ applicationId: 'app-a', testTakerUserId: 'user-1' }]) } as unknown as never;

    const service = new ResultService({} as never, {} as ScoringService, config, identityClient, {} as never, {} as never, eligibility, sheets, versions);
    const result = await service.myResults('user-1');

    expect(versionsFindBy).toHaveBeenCalledTimes(1);
    expect(result[0].score?.versionNumber).toBe(2);
  });

  it('myResults returns an empty list without querying score sheets when the candidate has none', async () => {
    const eligibility = { findBy: jest.fn().mockResolvedValue([]) } as unknown as never;
    const sheets = { findBy: jest.fn() } as unknown as never;
    const service = new ResultService({} as never, {} as ScoringService, config, identityClient, {} as never, {} as never, eligibility, sheets, {} as never);

    expect(await service.myResults('user-1')).toEqual([]);
    expect((sheets as { findBy: jest.Mock }).findBy).not.toHaveBeenCalled();
  });

  it('uses the published version scoring rule to provide skill standards without changing raw scores', async () => {
    const current = version('sheet-a', 1);
    current.scores = {WRITING:28,READING:36.5,LISTENING:33.5,SPEAKING:46.5};
    const scoring = {ruleForRevision:jest.fn().mockResolvedValue({bands:[{min:27,max:33.5,standard:5},{min:34,max:40.5,standard:6},{min:45,max:47.5,standard:8}]})} as unknown as ScoringService;
    const manager = {};
    const service = new ResultService({manager} as never,scoring,config,identityClient,{} as never,{} as never,{findBy:jest.fn().mockResolvedValue([{applicationId:'app-a',testTakerUserId:'user-1'}])} as never,{findBy:jest.fn().mockResolvedValue([sheet('sheet-a','app-a',1)])} as never,{findBy:jest.fn().mockResolvedValue([current])} as never);
    const [result] = await service.certificateResults('exam-1','a'.repeat(32));
    expect(result.scores).toEqual(current.scores);
    expect(result.skillStandards).toEqual({WRITING:5,READING:6,LISTENING:5,SPEAKING:8});
    expect(scoring.ruleForRevision).toHaveBeenCalledWith(manager,current.scoringRuleId);
  });

  it('certificateResults raises CERTIFICATE_RESULT_INCOMPLETE when a sheet has no matching current version', async () => {
    const sheetA = sheet('sheet-a', 'app-a', 3); // currentVersion 3, but no version 3 exists below
    const dataSource = {
      getRepository: jest.fn().mockReturnValue({ findOneBy: jest.fn().mockResolvedValue({ examId: 'exam-1' }) }),
    } as unknown as never;
    const versions = { find: jest.fn(), findBy: jest.fn().mockResolvedValue([version('sheet-a', 1)]) } as unknown as never;
    const sheets = { findBy: jest.fn().mockResolvedValue([sheetA]) } as unknown as never;
    const eligibility = { findBy: jest.fn().mockResolvedValue([{ applicationId: 'app-a', testTakerUserId: 'user-1', status: EligibilityStatus.Eligible }]) } as unknown as never;

    const service = new ResultService(dataSource, {} as ScoringService, config, identityClient, {} as never, {} as never, eligibility, sheets, versions);
    await expect(service.certificateResults('exam-1', 'a'.repeat(32)))
      .rejects.toMatchObject({ response: { code: 'CERTIFICATE_RESULT_INCOMPLETE' } });
  });
});
