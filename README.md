# Link Saver

Save-for-later reading list — paste a URL, it shows up in the list, and a background job goes and fetches a title/description for it (think link unfurling, like what WhatsApp or Slack do when you drop a link in a chat).

## Running it

You need two things running at once:

```bash
npm install

# terminal 1 — the mock metadata service
node mock-metadata-service.js   # http://localhost:4000

# terminal 2 — the app
npm run dev                      # http://localhost:3000
```

Then open http://localhost:3000, paste a URL (has to start with `http://` or `https://`), and watch it go from "Pending" → "Fetching" → "Done" (or "Failed", since the metadata service fails about 40% of the time on purpose).

## How it's put together

- `lib/store.ts` — the "database." It's an in-memory `Map` right now (see notes below), with helpers for create/update/find-by-url/get-all.
- `lib/retry.ts` — `fetchWithRetry`, a small wrapper around `fetch` that handles timeouts, retries with backoff, and rate-limit headers. Used by anything that talks to the metadata service.
- `lib/metadata.ts` — calls `GET /metadata?url=...` on the mock service through `fetchWithRetry`.
- `lib/backgroundFetch.ts` — the actual "go fetch the metadata and update the record" logic, run after a link is created.
- `lib/track.ts` — fake analytics, logs to console.
- `app/api/links/route.ts` — `POST` to save a new link, `GET` to list everything.
- `app/api/links/[id]/route.ts` — `GET` a single link.
- `app/page.tsx` + `app/components/LinkCard.tsx` — the UI.

## A few notes on how I approached this

**The metadata service is the whole point.** It's deliberately flaky — random 500s, 429s with `Retry-After`, and timeouts — so most of the effort went into `lib/retry.ts`. It does 3 attempts with 1s/2s/4s backoff, a 5s timeout per attempt (via `AbortController`), honors `Retry-After` on 429s instead of guessing a wait time, and treats 4xx (other than 429) as non-retryable since retrying a bad request 3 times is just noise.

**The POST handler doesn't wait for the fetch.** It checks if the URL already exists (409 if so — that's the idempotency check, and also what stops double-submits from creating duplicate cards), creates the record as `pending`, kicks off `runBackgroundFetch()` *without awaiting it*, and returns 201 immediately. The actual fetch — which could take several seconds if it has to retry — happens after the response is already on its way back to the client. The frontend just polls every 3 seconds and picks up the status change.

**In-memory store, obviously not real.** It's a `Map<string, SavedLink>`. In a real version this would be Firestore, with the `url` itself used as (part of) the doc id so the idempotency check is basically free instead of a linear scan. I left a comment in `store.ts` about this.

**Polling instead of websockets/SSE.** 3 seconds felt like a fine tradeoff for "feels live enough" without adding more moving parts. With Firestore this would just be a `onSnapshot` listener instead.

## What's not here / what I'd do differently with more time

- No tests — would normally at least cover the retry logic and the idempotency path, since those are the parts most likely to silently break
- No queue for the background fetch — right now it's just an unawaited async function in the same process. If this restarted mid-fetch, that link would be stuck in "fetching" forever. A real version needs Cloud Tasks/BullMQ + a way to recover stuck jobs
- No auth / multi-tenancy — every link is global. Real version scopes everything to a `tenantId`
- The mock service doesn't return an `image`, so the `image` field on `SavedLink` is unused for now — kept it in the type since the real metadata service presumably returns one

## Analytics events

Three events, currently just logged to the console (`lib/track.ts`). In a real app these would go to PostHog or Segment.

**`link_submitted`** — `{ url, is_duplicate, timestamp }`
Fires on every submit attempt, including duplicates. Useful for funnel numbers and for seeing how often people are resubmitting links they already saved.

**`metadata_fetch_completed`** — `{ url, success, duration_ms, error_code? }`
Fires when the background fetch finishes either way. This is basically the health check for the metadata integration — success rate, how long things take (including retries), and which errors show up most.

**`link_card_viewed`** — `{ link_id, status, has_metadata }`
Fires when a card renders. The point is to see whether the metadata we worked hard to fetch (with all that retry logic) is actually getting in front of users, vs. links that get saved and never looked at again.
