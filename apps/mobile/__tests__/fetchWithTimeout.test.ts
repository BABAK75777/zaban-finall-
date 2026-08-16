import { fetchWithTimeout, RequestTimeoutError } from '../src/utils/fetchWithTimeout';

describe('fetchWithTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('resolves when fetch completes before timeout', async () => {
    const mockResponse = { ok: true } as Response;
    jest.spyOn(global, 'fetch').mockResolvedValue(mockResponse);

    const promise = fetchWithTimeout('https://example.test', { method: 'GET' }, 5_000, 'test');
    await expect(promise).resolves.toBe(mockResponse);
  });

  it('rejects with RequestTimeoutError when fetch exceeds timeout', async () => {
    jest.spyOn(global, 'fetch').mockImplementation((_url, init) => {
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });

    const promise = fetchWithTimeout('https://example.test', { method: 'GET' }, 1_000, 'test_op');
    jest.advanceTimersByTime(1_001);

    await expect(promise).rejects.toMatchObject({
      name: 'RequestTimeoutError',
      operation: 'test_op',
    });
  });
});
