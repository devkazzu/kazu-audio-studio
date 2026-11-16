import { db } from "@/db";
import { feedbackReports } from "@/db/schema";
import { z } from "zod";
import {
  ApiError,
  apiError,
  getPrincipal,
  rateLimit,
  sameOrigin,
} from "@/lib/admin/permissions";
const schema = z.object({
  category: z.enum([
    "audio",
    "visualizer",
    "export",
    "performance",
    "feature",
    "bug",
    "general",
  ]),
  message: z.string().trim().min(10).max(5000),
  email: z.string().email().max(254).optional(),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    rateLimit(request, "feedback", 5);
    const user = await getPrincipal();
    const input = schema.parse(await request.json());
    const [record] = await db
      .insert(feedbackReports)
      .values({ userId: user?.id, email: user?.email || input.email, ...input })
      .returning({ id: feedbackReports.id });
    return Response.json({ ok: true, id: record.id });
  } catch (error) {
    return apiError(error);
  }
}
