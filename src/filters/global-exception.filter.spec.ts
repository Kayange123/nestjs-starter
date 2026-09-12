import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  afterEach(() => jest.restoreAllMocks());
  it.each([
    new BadRequestException(),
    new UnauthorizedException(),
    new ForbiddenException(),
    new NotFoundException(),
    new Error('private database secret'),
  ])('keeps body and HTTP status aligned for %s', (error) => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const response = {
      getHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({ url: '/users', method: 'GET' }),
      }),
    } as unknown as ArgumentsHost;
    new GlobalExceptionFilter('production').catch(error, host);
    expect(response.json.mock.calls[0][0].statusCode).toBe(
      response.status.mock.calls[0][0],
    );
    expect(JSON.stringify(response.json.mock.calls)).not.toContain(
      'private database secret',
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain(
      'private database secret',
    );
  });
});
