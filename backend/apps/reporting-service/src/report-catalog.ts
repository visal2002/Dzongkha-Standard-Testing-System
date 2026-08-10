/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

import { ReportDataset, ReportResourceType } from './entities';

export interface ReportDatasetDefinition {
  resourceType: ReportResourceType;
  defaultFields: string[];
  fields: string[];
}

const common = ['resourceId', 'examId', 'status', 'occurredAt'];

export const REPORT_CATALOG: Record<ReportDataset, ReportDatasetDefinition> = {
  [ReportDataset.Applications]: { resourceType: ReportResourceType.Application, defaultFields: common, fields: [...common, 'applicationId'] },
  [ReportDataset.Scores]: { resourceType: ReportResourceType.Score, defaultFields: [...common, 'overallScore', 'bandLabel', 'cefrLevel'], fields: [...common, 'applicationId', 'version', 'overallScore', 'bandLabel', 'cefrLevel', 'writing', 'reading', 'listening', 'speaking'] },
  [ReportDataset.Appeals]: { resourceType: ReportResourceType.Appeal, defaultFields: common, fields: [...common, 'appealId', 'applicationId', 'outcome', 'skills'] },
  [ReportDataset.Certificates]: { resourceType: ReportResourceType.Certificate, defaultFields: [...common, 'certificateNumber', 'issuedAt', 'validUntil'], fields: [...common, 'certificateNumber', 'issuedAt', 'validUntil', 'version'] },
  [ReportDataset.Examinations]: { resourceType: ReportResourceType.Examination, defaultFields: [...common, 'code', 'title', 'examDate'], fields: [...common, 'code', 'title', 'examDate', 'registrationStart', 'registrationEnd', 'capacity', 'venue'] },
  [ReportDataset.Committees]: { resourceType: ReportResourceType.Committee, defaultFields: [...common, 'memberCount'], fields: [...common, 'committeeId', 'memberCount', 'headUserId'] },
};

export const DASHBOARD_METRICS = [
  'totalApplications', 'pendingApplications', 'verifiedApplications', 'waitlistedApplications',
  'totalScores', 'publishedScores', 'activeAppeals', 'totalCertificates', 'activeCertificates',
  'scheduledExaminations', 'configuredCommittees',
];
