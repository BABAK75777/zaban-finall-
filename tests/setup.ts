/**
 * Vitest setup file
 * Configure test environment
 */

import { vi } from 'vitest';

// Mock window.EventSource if not available in jsdom
if (typeof window !== 'undefined' && !window.EventSource) {
  (window as any).EventSource = class MockEventSource {
    url: string;
    onopen: ((event: Event) => void) | null = null;
    onerror: ((event: Event) => void) | null = null;
    readyState: number = 0;
    
    constructor(url: string) {
      this.url = url;
    }
    
    close() {
      // Mock implementation
    }
    
    addEventListener(type: string, listener: EventListener) {
      // Mock implementation
    }
  };
}

