/**
 * HTTP layer for PSX scraping — port of psxdata/scrapers/base.py._request.
 *
 * Plain fetch against the AJAX endpoints with standard PSX headers, a per-request
 * timeout, and exponential-backoff retry on 5xx / network errors. 4xx fails fast.
 */
import {
  BASE_URL,
  ENDPOINTS,
  MAX_RETRIES,
  REQUEST_HEADERS,
  REQUEST_TIMEOUT_MS,
  RETRY_DELAYS_MS,
} from './constants'

type EndpointName = keyof typeof ENDPOINTS

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

/**
 * Build a full URL for a named endpoint, with an optional path suffix
 * (e.g. trading_board + "/REG/main").
 */
export function buildUrl(endpoint: EndpointName, suffix = ''): string {
  return BASE_URL + ENDPOINTS[endpoint] + suffix
}

/**
 * GET a PSX URL with retry + timeout. Returns the response body as text.
 * Throws after exhausting retries, or immediately on a 4xx.
 */
export async function psxGet(url: string): Promise<string> {
  let lastErr: unknown

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: REQUEST_HEADERS,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cache: 'no-store',
      })

      if (res.status >= 500) {
        lastErr = new Error(`PSX server error ${res.status} on ${url}`)
        if (attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAYS_MS[attempt - 1])
          continue
        }
        throw lastErr
      }
      if (res.status >= 400) {
        // 4xx — client error, no retry (e.g. invalid board / unknown endpoint)
        throw new Error(`PSX returned ${res.status} on ${url}`)
      }
      return await res.text()
    } catch (err) {
      // Re-throw 4xx immediately; retry network/timeout errors.
      if (err instanceof Error && /returned 4\d\d/.test(err.message)) throw err
      lastErr = err
      if (attempt < MAX_RETRIES) {
        await sleep(RETRY_DELAYS_MS[attempt - 1])
        continue
      }
    }
  }

  throw lastErr instanceof Error
    ? lastErr
    : new Error(`PSX unreachable after ${MAX_RETRIES} attempts: ${url}`)
}

/** GET a PSX endpoint that returns JSON. */
export async function psxGetJson<T>(endpoint: EndpointName, suffix = ''): Promise<T> {
  const text = await psxGet(buildUrl(endpoint, suffix))
  return JSON.parse(text) as T
}
