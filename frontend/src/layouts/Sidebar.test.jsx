import { describe, expect, it } from 'vitest';
import { MATRIX_ROLES } from '@/features/rbac/accessMatrix';
import { navigationFor } from './Sidebar';

const paths = user => navigationFor(user).flatMap(item => item.children || [item]).map(item => item.to);
describe('Role-scoped live sidebar', () => {
  it.each(['dcdd'])('offers Committee Setup to %s only with its live grant', role => {
    expect(paths({role,roles:[role],permissions:['committee.manage']})).toContain('/scores/committee');
    expect(paths({role,roles:[role],permissions:[]})).not.toContain('/scores/committee');
  });
  it('hides Committee Setup from the Chief even with an old grant', () => {
    expect(paths({role:'exam_head',roles:['exam_head'],permissions:['committee.manage']})).not.toContain('/scores/committee');
  });
  it.each(MATRIX_ROLES)('%s cannot gain unrelated menu items through wildcard permissions', role => {
    const reference = paths(role);
    const live = paths({role, roles:[role], permissions:['*']});
    live.forEach(path => expect(reference).toContain(path));
    expect(new Set(live).size).toBe(live.length);
  });
  it('combines assigned staff roles without duplicate destinations', () => {
    const user = {role:'chief_executive',roles:['chief_executive','committee_member'],permissions:['appeal.approve','appeal.review','score.view','report.run']};
    expect(paths(user)).toEqual(expect.arrayContaining(['/appeals','/scores/band-scores','/reports']));
    expect(paths(user).filter(path=>path==='/appeals')).toHaveLength(1);
    expect(paths(user)).not.toContain('/admin/users');
  });
  it('does not offer approval tools when the approval grant is removed', () => {
    expect(paths({role:'exam_head',roles:['exam_head'],permissions:['appeal.view']})).not.toContain('/appeals');
  });
  it('does not expose any navigation before a session exists', () => {
    expect(navigationFor(null)).toEqual([]);
  });
});
