import { getById, updateLink } from "./store";
import { fetchMetadata } from "./metadata";
import { track } from "./track";

export async function runBackgroundFetch(id: string): Promise<void> {
  const link = getById(id);
  if (!link) return;

  updateLink(id, { status: "fetching", updatedAt: Date.now() });

  const start = Date.now();
  let success = false;
  let errorCode: string | undefined;

  try {
    const result = await fetchMetadata(link.url);
    updateLink(id, {
      status: "done",
      title: result.title,
      description: result.description,
      image: result.image,
      updatedAt: Date.now(),
    });
    success = true;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error";
    // slugify the error message so it's usable as a property value in analytics
    // (not pretty, but good enough to group failures by type)
    errorCode = message.replace(/[^a-z0-9_]/gi, "_").toLowerCase().slice(0, 40);
    updateLink(id, {
      status: "failed",
      error: message,
      updatedAt: Date.now(),
    });
  }

  track("metadata_fetch_completed", {
    url: link.url,
    success,
    duration_ms: Date.now() - start,
    ...(errorCode ? { error_code: errorCode } : {}),
  });
}
