/**
 * Accessibility utilities for keyboard navigation and ARIA
 */

/**
 * Keyboard shortcuts handler
 */
export function setupKeyboardShortcuts(handlers: {
  onPlayPause?: () => void;
  onStop?: () => void;
  onNext?: () => void;
  onPrev?: () => void;
}): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Ignore if typing in input/textarea
    const target = e.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }

    switch (e.key) {
      case ' ':
        if (handlers.onPlayPause) {
          e.preventDefault();
          handlers.onPlayPause();
        }
        break;
      case 's':
      case 'S':
        if (handlers.onStop) {
          e.preventDefault();
          handlers.onStop();
        }
        break;
      case 'n':
      case 'N':
        if (handlers.onNext) {
          e.preventDefault();
          handlers.onNext();
        }
        break;
      case 'p':
      case 'P':
        if (handlers.onPrev) {
          e.preventDefault();
          handlers.onPrev();
        }
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}

/**
 * Announce progress to screen readers
 */
export function announceProgress(
  current: number,
  total: number,
  isPlaying: boolean
): void {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', 'polite');
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = isPlaying
    ? `Playing chunk ${current} of ${total}`
    : `Paused at chunk ${current} of ${total}`;
  
  document.body.appendChild(announcement);
  setTimeout(() => document.body.removeChild(announcement), 1000);
}

/**
 * Focus management for errors
 */
export function focusError(errorElement: HTMLElement | null): void {
  if (errorElement) {
    errorElement.focus();
    errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

