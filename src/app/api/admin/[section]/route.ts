import {
  apiError,
  sameOrigin,
  rateLimit,
  ApiError,
} from "@/lib/admin/permissions";
import { adminData, adminMutation } from "@/lib/admin/admin-service";
export const dynamic = "force-dynamic";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  try {
    const { section } = await params;
    return Response.json(await adminData(section), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(
  request: Request,
  { params }: { params: Promise<{ section: string }> },
) {
  try {
    const length = Number(request.headers.get("content-length") || 0);
    if (length > 4 * 1024 * 1024)
      throw new ApiError(413, "Request is too large. Use a smaller thumbnail.");
    sameOrigin(request);
    rateLimit(request, "admin", 60);
    const { section } = await params;
    const text = await request.text();
    if (text.length > 4 * 1024 * 1024)
      throw new ApiError(413, "Request is too large.");
    let input: unknown;
    try {
      input = JSON.parse(text);
    } catch {
      throw new ApiError(400, "Invalid JSON.");
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ApiError(400, "Invalid request.");
    return Response.json(await adminMutation(section, input));
  } catch (error) {
    return apiError(error);
  }
}
