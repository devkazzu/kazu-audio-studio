import { db } from "@/db";
import { visualizerPresets } from "@/db/schema";
import { and, eq, or, desc } from "drizzle-orm";
import { configSchema } from "@/lib/audio-studio/presets";
import { requireFeature } from "@/lib/admin/feature-service";
import { BUILTIN_PRESETS } from "@/lib/audio-studio/presets";
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
    const user = await getPrincipal();
    const records = await db
      .select()
      .from(visualizerPresets)
      .where(
        and(
          eq(visualizerPresets.status, "published"),
          user ? or(eq(visualizerPresets.ownerId, user.id), or()) : or(),
        ),
      )
      .orderBy(desc(visualizerPresets.createdAt));
    return Response.json({
      presets: [
        ...BUILTIN_PRESETS,
        ...records.map((p) => ({ ...p, custom: true })),
      ],
    });
  } catch (error) {
    return apiError(error);
  }
}
function sqlIsPublic() {
  return eq(visualizerPresets.status, "published");
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    rateLimit(request, "presets", 15);
    const user = await getPrincipal();
    if (!user)
      throw new ApiError(
        401,
        "Sign in to save your preset to the library. Local presets are also available in the editor.",
      );
    const input = await request.json();
    const config = configSchema.parse(input.config);
    if (
      typeof input.name !== "string" ||
      !input.name.trim() ||
      input.name.length > 100
    )
      throw new ApiError(400, "Enter a preset name under 100 characters.");
    if (
      input.thumbnail &&
      (typeof input.thumbnail !== "string" ||
        input.thumbnail.length > 3000000 ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(input.thumbnail))
    )
      throw new ApiError(400, "Invalid thumbnail image.");
    const [record] = await db
      .insert(visualizerPresets)
      .values({
        name: input.name.trim(),
        description: String(input.description || "").slice(0, 1000),
        category: String(input.category || "Custom").slice(0, 60),
        config,
        thumbnail: input.thumbnail || "",
        ownerId: user.id,
        status: "published",
      })
      .returning();
    return Response.json({ preset: { ...record, custom: true } });
  } catch (error) {
    return apiError(error);
  }
}
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const user = await getPrincipal();
    if (!user) throw new ApiError(401, "Sign in first.");
    const id = new URL(request.url).searchParams.get("id") || "";
    if (!/^[0-9a-f-]{36}$/i.test(id))
      throw new ApiError(400, "Invalid preset ID.");
    const [preset] = await db
      .select()
      .from(visualizerPresets)
      .where(eq(visualizerPresets.id, id));
    if (
      !preset ||
      (preset.ownerId !== user.id &&
        !["admin", "super_admin"].includes(user.role))
    )
      throw new ApiError(403, "You can only delete your own presets.");
    await db.delete(visualizerPresets).where(eq(visualizerPresets.id, id));
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
