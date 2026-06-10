import { fetchWithRetry } from "./retry";

interface MetadataResult {
  title?: string;
  description?: string;
  image?: string;
}

export async function fetchMetadata(url: string): Promise<MetadataResult> {
  const serviceUrl =
    `http://localhost:4000/metadata?url=${encodeURIComponent(url)}`;

  const response = await fetchWithRetry(serviceUrl, { method: "GET" });
  const json = (await response.json()) as Record<string, unknown>;

  return {
    title: typeof json.title === "string" ? json.title : undefined,
    description:
      typeof json.description === "string" ? json.description : undefined,
    image: typeof json.image === "string" ? json.image : undefined,
  };
}
