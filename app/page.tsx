"use client";

import { useState, useEffect, useCallback } from "react";
import { LinkCard } from "./components/LinkCard";
import type { SavedLink } from "@/lib/types";

export default function Home() {
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      if (!res.ok) return;
      const data = (await res.json()) as SavedLink[];
      setLinks(data);
    } catch {
      // Silently ignore poll failures — UI just shows last known state
    }
  }, []);

  useEffect(() => {
    void fetchLinks();
    // polling every 3s — simple, and good enough until we have real-time
    // listeners from Firestore
    const id = setInterval(() => void fetchLinks(), 3000);
    return () => clearInterval(id);
  }, [fetchLinks]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const url = urlInput.trim();

    if (!url) {
      setSubmitError("Please enter a URL");
      return;
    }
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      setSubmitError("URL must start with http:// or https://");
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.status === 409) {
        setSubmitError("Already saved");
        return;
      }

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setSubmitError(data.error ?? "Something went wrong");
        return;
      }

      const newLink = (await res.json()) as SavedLink;
      setLinks((prev) => [newLink, ...prev]);
      setUrlInput("");
    } catch {
      setSubmitError("Network error, please try again");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-bold text-gray-900">Link Saver</h1>
        <p className="text-sm text-gray-500 mt-1">
          Paste a URL to save it for later reading.
        </p>
      </div>

      <form onSubmit={(e) => void handleSubmit(e)} className="mb-8">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            placeholder="https://example.com/article"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? "Saving…" : "Save"}
          </button>
        </div>
        {submitError && (
          <p className="mt-2 text-sm text-red-600">{submitError}</p>
        )}
      </form>

      {links.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No links saved yet. Paste a URL above to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {links.map((link) => (
            <LinkCard key={link.id} link={link} />
          ))}
        </div>
      )}
    </main>
  );
}
