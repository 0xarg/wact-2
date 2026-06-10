// just logging events to the console for now — swap this for a real
// PostHog/Segment client once we know what we're actually building toward
import type { TrackEvent } from "./types";

export function track(
  event: TrackEvent,
  props?: Record<string, unknown>
): void {
  console.log(`event: ${event}`, props ?? {});
}
