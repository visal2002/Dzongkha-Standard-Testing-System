import { displayReportReferences } from '../../../apps/reporting-service/src/display-references';
import { ReportDataset } from '../../../apps/reporting-service/src/entities';
const applicationId = '53d74291-1aa3-4953-8524-d6114d43499c';
const appealId = '10dde42a-a79e-41d0-88fd-1d9475c3d35d';
describe('downloadable report references', () => {
  it('shortens application/request references without mutating source rows or unrelated identifiers', () => {
    const rows = [{ resourceId: appealId, appealId, applicationId, examId: applicationId }];
    expect(displayReportReferences(ReportDataset.Appeals, rows)).toEqual([{ resourceId: 'RE-10DDE42A', appealId: 'RE-10DDE42A', applicationId: 'APP-53D74291', examId: applicationId }]);
    expect(rows[0].resourceId).toBe(appealId);
    expect(displayReportReferences(ReportDataset.Applications, [{resourceId:applicationId}])[0].resourceId).toBe('APP-53D74291');
  });
  it('preserves human-readable and absent references and non-application resources', () => {
    const rows = [{ resourceId: applicationId, applicationId: 'APP-2025-0001', appealId: null, registrationNumber: 'ཀ-༢༦-༠༠༡' }];
    expect(displayReportReferences(ReportDataset.Scores, rows)).toEqual(rows);
  });
  it('extends collisions consistently across application fields and rows', () => {
    const first = '12345678-aaaa-4000-8000-000000000001', second = '12345678-bbbb-4000-8000-000000000002';
    expect(displayReportReferences(ReportDataset.Applications, [{resourceId:first,applicationId:first},{resourceId:second,applicationId:second}])).toEqual([
      {resourceId:'APP-12345678AA',applicationId:'APP-12345678AA'}, {resourceId:'APP-12345678BB',applicationId:'APP-12345678BB'},
    ]);
  });
});
