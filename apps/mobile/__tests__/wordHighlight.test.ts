import { renderHook, act } from '@testing-library/react-native';
import {
  clearedHighlightedWord,
  logWordHighlightCleared,
  logWordHighlightSet,
  nextHighlightedWord,
} from '../src/reading/wordHighlight';
import { useWordHighlight } from '../src/reading/useWordHighlight';

describe('wordHighlight', () => {
  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('nextHighlightedWord returns the new word', () => {
    expect(nextHighlightedWord('hello', 'world')).toBe('world');
  });

  it('clearedHighlightedWord always returns null when a word was active', () => {
    expect(clearedHighlightedWord('hello', 'lookup_closed')).toBeNull();
    expect(clearedHighlightedWord(null, 'lookup_closed')).toBeNull();
  });

  it('logs set and clear events', () => {
    logWordHighlightSet('hello');
    logWordHighlightCleared('lookup_closed');

    expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] set word=hello');
    expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] cleared reason=lookup_closed');
  });

  describe('useWordHighlight', () => {
    it('tap word sets highlight', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.setHighlightedWord('hello');
      });

      expect(result.current.highlightedWord).toBe('hello');
      expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] set word=hello');
    });

    it('close meaning clears highlight', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.setHighlightedWord('hello');
      });
      act(() => {
        result.current.clearHighlightedWord('lookup_closed');
      });

      expect(result.current.highlightedWord).toBeNull();
      expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] cleared reason=lookup_closed');
    });

    it('tap second word replaces first highlight', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.setHighlightedWord('hello');
      });
      act(() => {
        result.current.setHighlightedWord('world');
      });

      expect(result.current.highlightedWord).toBe('world');
      expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] set word=world');
    });

    it('Back/Next clears highlight', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.setHighlightedWord('hello');
      });
      act(() => {
        result.current.clearHighlightedWord('navigation');
      });

      expect(result.current.highlightedWord).toBeNull();
      expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] cleared reason=navigation');
    });

    it('lookup error clears highlight', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.setHighlightedWord('hello');
      });
      act(() => {
        result.current.clearHighlightedWord('lookup_error');
      });

      expect(result.current.highlightedWord).toBeNull();
      expect(console.log).toHaveBeenCalledWith('[WORD_HIGHLIGHT] cleared reason=lookup_error');
    });

    it('does not log clear when already empty', () => {
      const { result } = renderHook(() => useWordHighlight());

      act(() => {
        result.current.clearHighlightedWord('lookup_closed');
      });

      expect(result.current.highlightedWord).toBeNull();
      expect(console.log).not.toHaveBeenCalledWith('[WORD_HIGHLIGHT] cleared reason=lookup_closed');
    });
  });
});
