/**
 * API Client - Production-ready fetch wrapper with timeout, error handling, and TypeScript types
 */

const API_TIMEOUT_MS = 10000; // 10 seconds

export interface ApiError {
  status: number;
  message: string;
  details?: unknown;
}

export class ApiClientError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.status = status;
    this.details = details;
  }
}

let envCheckLogged = false;
let cachedBaseUrl: string | null = null;

/**
 * Get the runtime API base URL with automatic hostname detection
 * 
 * Behavior:
 * - Production: Uses VITE_API_URL if set (required)
 * - Development/Local: ALWAYS derives from window.location (ignores VITE_API_URL)
 *   - If page is http://192.168.86.190:3000 → API becomes http://192.168.86.190:3001
 *   - If page is http://localhost:3000 → API becomes http://localhost:3001
 * 
 * This ensures mobile devices on LAN can connect correctly.
 * 
 * IMPORTANT: After changing .env.local, you MUST restart the Vite dev server
 * for the changes to take effect.
 */
export function getBaseUrl(): string {
  // Return cached value if available (computed once per session)
  if (cachedBaseUrl !== null) {
    return cachedBaseUrl;
  }

  const env = (import.meta as any).env;
  const isDev = env.DEV ?? false;
  const envUrl = env.VITE_API_URL;
  
  // Production mode: require and use VITE_API_URL
  if (!isDev) {
    if (!envUrl || !envUrl.trim()) {
      const errorMsg = 
        'VITE_API_URL environment variable is required in production.\n' +
        'Set VITE_API_URL in your production environment.';
      console.error('❌', errorMsg);
      throw new Error('VITE_API_URL environment variable is required in production.');
    }
    cachedBaseUrl = envUrl.replace(/\/$/, '');
    
    if (!envCheckLogged) {
      console.log('[API Base] Production mode:', {
        apiBase: cachedBaseUrl,
        source: 'VITE_API_URL environment variable'
      });
      envCheckLogged = true;
    }
    return cachedBaseUrl;
  }
  
  // Development mode: ALWAYS derive from window.location (ignore VITE_API_URL)
  // This ensures mobile devices on LAN work correctly
  if (typeof window === 'undefined') {
    // SSR/Node context: Cannot determine hostname, throw error
    const errorMsg = 
      'Cannot determine API base URL in server-side context. ' +
      'getBaseUrl() must be called from browser context in development mode.';
    console.error('❌', errorMsg);
    throw new Error(errorMsg);
  }
  
  // Development mode: Use relative /api paths (proxied by Vite to backend)
  // This ensures same-origin requests, avoids CORS, and prevents mixed-content issues
  // Vite proxy handles: /api/* -> http://192.168.86.190:3001/*
  cachedBaseUrl = '/api';
  
  if (!envCheckLogged) {
    const hasEnvUrl = envUrl && envUrl.trim();
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    console.log('[API Base] Development mode:', {
      pageHostname: hostname,
      pageProtocol: protocol,
      apiBase: cachedBaseUrl,
      viteApiUrlFromEnv: hasEnvUrl ? envUrl : '(not set, ignored)',
      note: 'Using relative /api paths (proxied by Vite to http://192.168.86.190:3001)'
    });
    
    // Runtime assertion log for debugging
    if (isDev) {
      console.log('[API Base] Runtime assertion:', {
        hostname,
        protocol,
        apiBase: cachedBaseUrl,
        source: 'Vite proxy (/api)'
      });
    }
    
    envCheckLogged = true;
  }
  
  return cachedBaseUrl;
}

/**
 * Core request function with timeout and error handling
 */
async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;

  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT_MS);

  try {
    // Only inject auth headers if auth mode is "jwt"
    const env = (import.meta as any).env;
    const authMode = env.VITE_AUTH_MODE || 'guest';
    let authHeaders: Record<string, string> = {};
    
    if (authMode === 'jwt') {
      try {
        const authModule = await import('./auth');
        authHeaders = authModule.getAuthHeaders();
      } catch {
        // Auth module not available, continue without auth
      }
    }

    const requestHeaders: HeadersInit = {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...headers,
    };

    const requestInit: RequestInit = {
      method,
      headers: requestHeaders,
      signal: controller.signal,
    };

    if (body !== undefined && body !== null) {
      requestInit.body = JSON.stringify(body);
    }

    const response = await fetch(url, requestInit);
    clearTimeout(timeoutId);

    // Try to parse JSON response
    let jsonData: unknown;
    const contentType = response.headers.get('content-type');
    const isJson = contentType?.includes('application/json');

    if (isJson) {
      try {
        jsonData = await response.json();
      } catch (parseError) {
        throw new ApiClientError(
          response.status,
          `Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          { originalStatus: response.status }
        );
      }
    } else {
      // For non-JSON responses, try to get text
      const text = await response.text();
      jsonData = text ? { message: text } : null;
    }

    // Check if response is successful (2xx status)
    if (!response.ok) {
      const errorMessage =
        (jsonData as { message?: string })?.message ||
        (jsonData as { error?: string })?.error ||
        `Request failed with status ${response.status}`;
      
      throw new ApiClientError(response.status, errorMessage, jsonData);
    }

    return jsonData as T;
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiClientError(
        408,
        `Request timeout after ${API_TIMEOUT_MS}ms`,
        { path, method }
      );
    }

    // Re-throw ApiClientError as-is
    if (error instanceof ApiClientError) {
      throw error;
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const diagnosticMsg = 
        `Network error: Unable to connect to API at ${baseUrl}\n` +
        `Possible causes:\n` +
        `1. Backend server is not running (start it with: npm run dev in backend folder)\n` +
        `2. Wrong port in VITE_API_URL (check .env.local)\n` +
        `3. Backend is running on a different port\n` +
        `4. Firewall blocking the connection\n` +
        `Check console for backend server logs to confirm it's running.`;
      console.error('❌', diagnosticMsg);
      throw new ApiClientError(
        0,
        `Network error: Unable to connect to API at ${baseUrl}. See console for diagnosis.`,
        { originalError: error.message, path, baseUrl }
      );
    }

    // Unknown error
    throw new ApiClientError(
      0,
      error instanceof Error ? error.message : 'Unknown error occurred',
      { originalError: error, path, method }
    );
  }
}

/**
 * API Client with typed helper methods
 */
export const api = {
  /**
   * Generic request method (includes auth headers)
   */
  request: request,

  /**
   * GET request (includes auth headers)
   */
  get: <T = unknown>(path: string, headers?: Record<string, string>): Promise<T> => {
    return request<T>('GET', path, undefined, headers);
  },

  /**
   * POST request (includes auth headers)
   */
  post: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> => {
    return request<T>('POST', path, body, headers);
  },

  /**
   * PUT request (includes auth headers)
   */
  put: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> => {
    return request<T>('PUT', path, body, headers);
  },

  /**
   * PATCH request (includes auth headers)
   */
  patch: <T = unknown>(
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> => {
    return request<T>('PATCH', path, body, headers);
  },

  /**
   * DELETE request (includes auth headers)
   */
  delete: <T = unknown>(path: string, headers?: Record<string, string>): Promise<T> => {
    return request<T>('DELETE', path, undefined, headers);
  },
};

/**
 * Health check endpoint
 */
export interface HealthCheckResponse {
  ok: boolean;
}

export const getHealth = (): Promise<HealthCheckResponse> => {
  return api.get<HealthCheckResponse>('/health');
};

/**
 * Voice catalog endpoint
 */
export interface VoiceInfo {
  id: string;
  lang: string;
  gender: string;
  tags: string[];
  description?: string;
}

export interface PresetInfo {
  id: string;
  name: string;
  description: string;
}

export interface VoiceCatalogResponse {
  ok: boolean;
  voices: VoiceInfo[];
  presets: PresetInfo[];
}

export const getVoiceCatalog = (): Promise<VoiceCatalogResponse> => {
  return api.get<VoiceCatalogResponse>('/tts/voices');
};

/**
 * Auth endpoints
 */
export interface SignupRequest {
  email: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  ok: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    plan: string;
  };
}

export const signup = (data: SignupRequest): Promise<AuthResponse> => {
  return api.post<AuthResponse>('/auth/signup', data);
};

export const login = (data: LoginRequest): Promise<AuthResponse> => {
  return api.post<AuthResponse>('/auth/login', data);
};

export const logout = (): Promise<{ ok: boolean }> => {
  return api.post<{ ok: boolean }>('/auth/logout');
};

export interface MeResponse {
  ok: boolean;
  user: {
    id: string;
    email: string;
    plan: string;
    status: string;
  };
  quotaLimits: {
    charsPerDay: number;
    chunksPerDay: number;
    sessionsPerDay: number;
    maxCharsPerRequest: number;
    maxSessionsPerHour: number;
  };
  usage: {
    charsGenerated: number;
    chunksGenerated: number;
    secondsAudioEst: number;
    requests: number;
    cacheHitRate: number;
    geminiFailures: number;
  };
}

export const getMe = (): Promise<MeResponse> => {
  return api.get<MeResponse>('/auth/me');
};

/**
 * Usage dashboard endpoint
 */
export interface DashboardResponse {
  ok: boolean;
  usage: {
    charsGenerated: number;
    charsLimit: number;
    chunksGenerated: number;
    chunksLimit: number;
    sessionsToday: number;
    sessionsLimit: number;
    secondsAudioEst: number;
    requests: number;
    cacheHitRate: number;
    geminiFailures: number;
    avgLatencyMs: number;
  };
  sessions: {
    total: number;
    completed: number;
    errors: number;
    recent: Array<{
      id: string;
      sessionKey: string;
      totalChunks: number;
      createdAt: string;
      lastActiveAt: string;
      status: string;
    }>;
  };
  plan: string;
  quotaLimits: {
    charsPerDay: number;
    chunksPerDay: number;
    sessionsPerDay: number;
    maxCharsPerRequest: number;
    maxSessionsPerHour: number;
  };
}

export const getDashboard = (): Promise<DashboardResponse> => {
  return api.get<DashboardResponse>('/usage/dashboard');
};

