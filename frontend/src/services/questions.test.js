import { beforeEach, describe, expect, it, vi } from 'vitest';
import apiClient from './api';
import { questionService } from './questions';

vi.mock('./api', () => ({
  default: {
    post: vi.fn(),
  },
}));

describe('question paper upload contract', () => {
  beforeEach(() => {
    apiClient.post.mockReset();
    apiClient.post.mockResolvedValue({ data: { data: { id: 'paper-1', documents: [] } } });
  });

  it('sends the primary PDF in the backend-supported file field', async () => {
    const paperFile = new File(['%PDF-test'], 'question-paper.pdf', { type: 'application/pdf' });

    await questionService.uploadPaper({
      examId: '11111111-1111-4111-8111-111111111111',
      skill: 'Writing',
      title: 'Writing examination',
      accessAllowedFrom: '2026-08-16T08:00:00+06:00',
      accessAllowedUntil: '2026-08-16T18:00:00+06:00',
      paperFile,
      answerSheetFile: null,
    });

    const [, body, config] = apiClient.post.mock.calls[0];
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('file')).toBe(paperFile);
    expect(body.has('questionPaper')).toBe(false);
    expect(config).toEqual({ headers: { 'Content-Type': 'multipart/form-data' } });
  });
});
