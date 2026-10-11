import { shortReferences } from '@/lib/recordReferences';
export { shortReferences } from '@/lib/recordReferences';

export function addAppealReferences(appeals) {
  const requests = shortReferences(appeals.map(item => item.id), 'RE');
  const applications = shortReferences(appeals.map(item => item.applicationId), 'APP');
  return appeals.map(item => ({ ...item, requestReference: requests[item.id], applicationReference: applications[item.applicationId] }));
}
