/**
 * Resilient fetch utility with exponential backoff retries.
 * Prevents transient "Failed to fetch" errors during server restarts or network blips.
 */
export async function safeFetch(
  url: string,
  options?: RequestInit,
  retries = 3,
  delay = 500
): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.status >= 500 && i < retries - 1) {
        await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
        continue;
      }
      return res;
    } catch (err) {
      if (i === retries - 1) {
        throw err;
      }
      await new Promise((r) => setTimeout(r, delay * Math.pow(2, i)));
    }
  }
  return fetch(url, options);
}
