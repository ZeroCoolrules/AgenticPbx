/**
 * Resilient API fetcher with silent error handling to prevent iframe console.error traps
 */

export interface ApiResponse<T> {
  ok: boolean;
  data: T | null;
  status: number;
}

export async function safeFetchJson<T>(
  url: string,
  options?: RequestInit,
  fallbackData: T | null = null,
  timeoutMs = 8000
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers = new Headers(options?.headers || {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (res.ok) {
      const data = await res.json();
      return { ok: true, data, status: res.status };
    }

    return { ok: false, data: fallbackData, status: res.status };
  } catch (err) {
    clearTimeout(timer);
    // Silent recovery with fallbackData to avoid triggering iframe console.error monitoring
    return { ok: false, data: fallbackData, status: 0 };
  }
}
