import { randomUUID } from "crypto";
import { createLink, findByUrl, getAll } from "@/lib/store";
import { runBackgroundFetch } from "@/lib/backgroundFetch";
import { track } from "@/lib/track";
import type { SavedLink } from "@/lib/types";

export async function GET(): Promise<Response> {
  return Response.json(getAll());
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("url" in body) ||
    typeof (body as Record<string, unknown>).url !== "string"
  ) {
    return Response.json({ error: "Missing or invalid 'url' field" }, { status: 400 });
  }

  const url = (body as Record<string, string>).url.trim();

  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return Response.json(
      { error: "URL must start with http:// or https://" },
      { status: 400 }
    );
  }

  const existing = findByUrl(url);
  if (existing) {
    track("link_submitted", {
      url,
      is_duplicate: true,
      timestamp: Date.now(),
    });
    return Response.json(
      { error: "already_saved", link: existing },
      { status: 409 }
    );
  }

  const now = Date.now();
  const link: SavedLink = {
    id: randomUUID(),
    url,
    status: "pending",
    createdAt: now,
    updatedAt: now,
  };

  createLink(link);

  track("link_submitted", {
    url,
    is_duplicate: false,
    timestamp: now,
  });

  // Fire-and-forget: do not await — POST returns 201 immediately,
  // background fetch continues asynchronously in the Node.js runtime.
  void runBackgroundFetch(link.id);

  return Response.json(link, { status: 201 });
}
