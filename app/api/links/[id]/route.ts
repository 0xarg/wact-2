import { getById } from "@/lib/store";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;
  const link = getById(id);

  if (!link) {
    return Response.json({ error: "not_found" }, { status: 404 });
  }

  return Response.json(link);
}
