/**
 * Fetch with automatic retry on failure.
 * Retries on network errors and 5xx responses.
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 2,
  delayMs = 1500
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options)

      // Don't retry on client errors (4xx) — only on server errors (5xx)
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        return res
      }

      // Server error — retry if we have attempts left
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)))
        continue
      }

      return res
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, delayMs * (attempt + 1)))
        continue
      }
    }
  }

  throw lastError || new Error('Fetch failed after retries')
}
