"use client";

import { useEffect } from "react";
import { track } from "@/lib/track";
import type { SavedLink } from "@/lib/types";

interface Props {
  link: SavedLink;
}

function StatusBadge({ status }: { status: SavedLink["status"] }) {
  const base = "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium";
  switch (status) {
    case "pending":
      return <span className={`${base} bg-gray-100 text-gray-600`}>Pending</span>;
    case "fetching":
      return (
        <span className={`${base} bg-blue-100 text-blue-700`}>
          <span className="h-3 w-3 rounded-full border-2 border-blue-500 border-t-transparent animate-spin" />
          Fetching
        </span>
      );
    case "done":
      return <span className={`${base} bg-green-100 text-green-700`}>Done</span>;
    case "failed":
      return <span className={`${base} bg-red-100 text-red-700`}>Failed</span>;
  }
}

export function LinkCard({ link }: Props) {
  useEffect(() => {
    track("link_card_viewed", {
      link_id: link.id,
      status: link.status,
      has_metadata: !!link.title,
    });
    // Only fire once per card mount — link.id is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [link.id]);

  const displayTitle = link.title ?? link.url;
  const hostname = (() => {
    try {
      return new URL(link.url).hostname;
    } catch {
      return link.url;
    }
  })();

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <a
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-900 font-semibold text-sm leading-snug hover:text-blue-600 transition-colors line-clamp-2 block"
          >
            {displayTitle}
          </a>
          <p className="text-xs text-gray-400 mt-0.5 truncate">{hostname}</p>
        </div>
        <StatusBadge status={link.status} />
      </div>

      {link.description && (
        <p className="mt-2 text-sm text-gray-500 line-clamp-2">
          {link.description}
        </p>
      )}

      {link.status === "failed" && link.error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
          {link.error}
        </p>
      )}

      <p className="mt-3 text-xs text-gray-400">
        {new Date(link.createdAt).toLocaleString()}
      </p>
    </div>
  );
}
