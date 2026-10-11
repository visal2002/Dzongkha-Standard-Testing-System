import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { reportService, getReportQuery } from './api';
const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('@/services/api', () => ({ default: api }));
beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());
describe('report export contract', () => {
  it.each([['summary','summary'],['registration','applications'],['reg-summary','applications'],['verification','applications'],['band-dist','scores'],['appeal-track','appeals'],['cert-validity','certificates'],['exam-schedule','examinations']])('maps %s to %s', (id, dataset) => expect(getReportQuery(id).dataset).toBe(dataset));
  it('rejects unknown reports and scopes registration to its selected window', () => {
    expect(() => getReportQuery('not-a-report')).toThrow();
    expect(getReportQuery('registration','exam-1').filters).toEqual([{field:'examId',operator:'eq',value:'exam-1'}]);
  });
  it.each(['csv','xlsx','pdf'])('uses the backend %s enum and unwraps the job ID', async format => {
    api.post.mockResolvedValue({data:{data:{id:'job-1',status:'QUEUED'}}});
    expect(await reportService.createExport(format,getReportQuery('reg-summary'))).toMatchObject({id:'job-1'});
    expect(api.post).toHaveBeenCalledWith('/reports/jobs',{format:format.toUpperCase(),query:{dataset:'applications',fields:[]}});
  });
  it('polls queued/running jobs until the artifact is ready', async () => {
    api.get.mockResolvedValueOnce({data:{data:{status:'QUEUED'}}}).mockResolvedValueOnce({data:{data:{status:'RUNNING'}}}).mockResolvedValueOnce({data:{data:{id:'job-1',status:'COMPLETED'}}});
    expect(await reportService.waitForExport('job-1',{pollIntervalMs:0})).toMatchObject({status:'COMPLETED'});
    expect(api.get).toHaveBeenCalledTimes(3);
  });
  it.each(['FAILED','EXPIRED'])('does not download a %s job', async status => {
    api.get.mockResolvedValue({data:{data:{status}}});
    await expect(reportService.waitForExport('job-1')).rejects.toThrow();
  });
  it('handles missing job IDs and bounded polling timeouts', async () => {
    await expect(reportService.waitForExport(undefined)).rejects.toThrow('job ID');
    await expect(reportService.waitForExport('job-1',{timeoutMs:0})).rejects.toThrow('longer than expected');
  });
});
