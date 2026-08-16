import { requestAiGenerate } from '../src/ai/aiLanguageChange';
import { resolveAiLanguageAcceptAction } from '../src/ai/aiLanguageChange';
import { fetchWithTimeout } from '../src/utils/fetchWithTimeout';
import { IN_PROGRESS_DIALOG_MESSAGE } from '../src/dictionary/languageAvailability';

jest.mock('../src/utils/fetchWithTimeout', () => ({
  fetchWithTimeout: jest.fn(),
  RequestTimeoutError: class RequestTimeoutError extends Error {},
}));

const mockedFetch = fetchWithTimeout as jest.MockedFunction<typeof fetchWithTimeout>;

function activePayload(overrides: Partial<{ targetLanguage: string }> = {}) {
  return {
    prompt: 'hello',
    cefrLevel: 'A2' as const,
    tone: 0.5,
    textLength: 0.35,
    targetLanguage: 'en-US',
    targetLanguageName: 'English — United States',
    targetLocale: 'en-US',
    targetLanguageInstruction: 'Write in American English.',
    ...overrides,
  };
}

describe('Practice language central AI guard', () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it('blocks unavailable Practice languages without calling /ai/generate', async () => {
    for (const id of ['fr-FR', 'de-DE', 'en-GB', 'es-ES', 'it-IT', 'ru-RU', 'ja-JP']) {
      mockedFetch.mockClear();
      const result = await requestAiGenerate('https://example.test', activePayload({ targetLanguage: id }));
      expect(result).toEqual({
        blocked: true,
        text: '',
        userMessage: IN_PROGRESS_DIALOG_MESSAGE,
      });
      expect(mockedFetch).not.toHaveBeenCalled();
    }
  });

  it('allows active Practice languages through to network', async () => {
    mockedFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, text: 'Generated text.' }),
    } as never);

    const result = await requestAiGenerate(
      'https://example.test',
      activePayload({ targetLanguage: 'tr-TR' })
    );
    expect(result).toEqual({ blocked: false, text: 'Generated text.' });
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    expect(mockedFetch.mock.calls[0][0]).toContain('/ai/generate');
  });

  it('Accept action is noop for In Progress Practice language', () => {
    expect(
      resolveAiLanguageAcceptAction({
        savedLanguageId: 'en-US',
        acceptedLanguageId: 'fr-FR',
        hasGeneratedText: true,
      })
    ).toBe('noop');
  });
});
