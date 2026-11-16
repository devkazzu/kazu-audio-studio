import { db } from "@/db";
import { exportEvents, featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireFeature } from "@/lib/admin/feature-service";
import { z } from "zod";
import {
  ApiError,
  apiError,
  getPrincipal,
  rateLimit,
  sameOrigin,
} from "@/lib/admin/permissions";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const flags = await db.select().from(featureFlags);
    return Response.json({
      flags,
      capabilities: { recording: typeof MediaRecorder !== "undefined" },
    });
  } catch (error) {
    return apiError(error);
  }
}
const schema = z.object({
  projectId: z.string().uuid(),
  duration: z.number().min(0).max(86400),
  width: z.union([z.literal(480), z.literal(720), z.literal(1080)]),
  height: z.union([z.literal(480), z.literal(720), z.literal(1080)]),
});
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    rateLimit(request, "export", 20);
    const user = await getPrincipal();
    if (!user)
      throw new ApiError(
        401,
        "Sign in to sync export activity. Your local video is still available.",
      );
    const [flag] = await db
      .select()
      .from(featureFlags)
      .where(eq(featureFlags.key, "video_export"));
    if (flag && !flag.enabled)
      throw new ApiError(403, "Video export is currently disabled.");
    const input = schema.parse(await request.json());
    await db.insert(exportEvents).values({
      userId: user.id,
      projectId: input.projectId,
      duration: Math.round(input.duration),
      width: input.width,
      height: input.height,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
