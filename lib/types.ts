export interface SavedLink {
  id: string;
  url: string;
  status: "pending" | "fetching" | "done" | "failed";
  title?: string;
  description?: string;
  image?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export type TrackEvent =
  | "link_submitted"
  | "metadata_fetch_completed"
  | "link_card_viewed";
