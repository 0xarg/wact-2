interface RetryConfig {
  maxAttempts: number;
  backoffMs: number[];
  timeoutMs: number;
}

// 1s/2s/4s felt like a reasonable default — long enough to ride out a blip
// in the upstream service, short enough that the user isn't waiting forever
const DEFAULT_CONFIG: RetryConfig = {
  maxAttempts: 3,
  backoffMs: [1000, 2000, 4000],
  timeoutMs: 5000,
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  config: Partial<RetryConfig> = {}
): Promise<Response> {
  const { maxAttempts, backoffMs, timeoutMs } = { ...DEFAULT_CONFIG, ...config };

  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const timerId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timerId);

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const waitSeconds = parseInt(retryAfterHeader ?? "2", 10) || 2;
        console.log(`[retry] 429 rate limited, waiting ${waitSeconds}s before retry ${attempt + 1}/${maxAttempts}`);
        await delay(waitSeconds * 1000);
        lastError = new Error(`Rate limited (429)`);
        continue;
      }

      if (response.status >= 500) {
        const waitMs = backoffMs[Math.min(attempt, backoffMs.length - 1)];
        console.log(`[retry] ${response.status} server error, backing off ${waitMs}ms before retry ${attempt + 1}/${maxAttempts}`);
        await delay(waitMs);
        lastError = new Error(`Server error (${response.status})`);
        continue;
      }

      // 4xx (except 429) are non-retryable
      if (response.status >= 400) {
        throw new Error(`Client error (${response.status}) — not retrying`);
      }

      return response;
    } catch (err) {
      clearTimeout(timerId);

      if (err instanceof Error && err.name === "AbortError") {
        console.log(`[retry] Request timed out after ${timeoutMs}ms, retry ${attempt + 1}/${maxAttempts}`);
        lastError = new Error(`Request timed out after ${timeoutMs}ms`);
        // No additional delay for timeouts — the timeout itself was the wait
        continue;
      }

      // Non-retryable client errors re-thrown immediately
      if (err instanceof Error && err.message.includes("not retrying")) {
        throw err;
      }

      // Network errors are retryable
      const waitMs = backoffMs[Math.min(attempt, backoffMs.length - 1)];
      console.log(`[retry] Network error, backing off ${waitMs}ms before retry ${attempt + 1}/${maxAttempts}`);
      await delay(waitMs);
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Request failed after maximum retries");
}
