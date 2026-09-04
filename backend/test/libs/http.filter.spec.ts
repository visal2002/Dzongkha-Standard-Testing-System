/*
 * Email: ambhutan@gmail.com | hello@aakash-pradhan.com
 * Website: ambhutan.com | aakash-pradhan.com
 * Phone: +975 - 1750 - 5267
 */

/**
 * `ApiExceptionFilter.catch()` was extracted into named helpers (`normalizedBody`,
 * `validationMessage`, `logIfUnexpected`, `errorPayload`) to bring its cyclomatic
 * complexity under the project's ESLint limit. No branch or output shape changed;
 * these tests pin the exact response envelope for every exception shape it handles.
 */
import { ArgumentsHost, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { ApiExceptionFilter, DomainException } from '../../libs/common/src/http';

const host = (request: unknown, response: { status: jest.Mock }) =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  }) as unknown as ArgumentsHost;

const makeResponse = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  return { status, json };
};

describe('ApiExceptionFilter', () => {
  const request = { method: 'POST', originalUrl: '/api/v1/exams', id: 'req-1' };

  it('maps a DomainException to its declared code, message, status and details', () => {
    const filter = new ApiExceptionFilter();
    const response = makeResponse();
    filter.catch(new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404, { examId: 'exam-1' }), host(request, response));

    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'EXAM_NOT_FOUND', message: 'Examination not found.', requestId: 'req-1', details: { examId: 'exam-1' } },
    });
  });

  it('joins class-validator array messages and falls back to a generic HTTP_<status> code', () => {
    const filter = new ApiExceptionFilter();
    const response = makeResponse();
    filter.catch(new BadRequestException({ message: ['name must not be empty', 'email must be valid'] }), host(request, response));

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: {
        code: 'HTTP_400',
        message: 'name must not be empty; email must be valid',
        requestId: 'req-1',
        details: {},
      },
    });
  });

  it('reports a string HttpException response body as the message, with no code/details to read', () => {
    const filter = new ApiExceptionFilter();
    const response = makeResponse();
    filter.catch(new HttpException('Forbidden', HttpStatus.FORBIDDEN), host(request, response));

    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'HTTP_403', message: 'Forbidden', requestId: 'req-1', details: {} },
    });
  });

  it('treats a non-HttpException as a 500 with the generic message, and logs it', () => {
    const filter = new ApiExceptionFilter();
    const errorSpy = jest.spyOn((filter as unknown as { logger: { error: () => void } }).logger, 'error').mockImplementation(() => undefined);
    const response = makeResponse();
    filter.catch(new Error('unexpected failure'), host(request, response));

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.', requestId: 'req-1', details: {} },
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('POST /api/v1/exams failed [requestId=req-1]'),
      expect.any(String),
    );
  });

  it('does not log a deliberate HttpException', () => {
    const filter = new ApiExceptionFilter();
    const errorSpy = jest.spyOn((filter as unknown as { logger: { error: () => void } }).logger, 'error').mockImplementation(() => undefined);
    filter.catch(new DomainException('EXAM_NOT_FOUND', 'Examination not found.', 404), host(request, makeResponse()));

    expect(errorSpy).not.toHaveBeenCalled();
  });
});
