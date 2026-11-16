import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  appReleases,
  announcements,
  themeConfigs,
  visualizerPresets,
  notificationReads,
  featureFlags,
} from "@/db/schema";
import {
  getPrincipal,
  apiError,
  sameOrigin,
  ApiError,
} from "@/lib/admin/permissions";
import { BUILTIN_PRESETS } from "@/lib/audio-studio/presets";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await getPrincipal();
    const now = new Date();
    const visibility = user
      ? or(
          eq(announcements.audience, "all"),
          eq(announcements.audience, "signed-in"),
          and(
            eq(announcements.audience, "administrators"),
            ["admin", "super_admin"].includes(user.role)
              ? eq(announcements.status, "published")
              : eq(announcements.id, "00000000-0000-0000-0000-000000000000"),
          ),
        )
      : eq(announcements.audience, "all");
    const [themes, releases, notices, presets, reads] = await Promise.all([
      db
        .select()
        .from(themeConfigs)
        .where(eq(themeConfigs.status, "published"))
        .orderBy(desc(themeConfigs.version))
        .limit(1),
      db
        .select()
        .from(appReleases)
        .where(eq(appReleases.status, "published"))
        .orderBy(desc(appReleases.releaseDate))
        .limit(30),
      db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.status, "published"),
            or(
              isNull(announcements.publishAt),
              lte(announcements.publishAt, now),
            ),
            or(
              isNull(announcements.expiresAt),
              gte(announcements.expiresAt, now),
            ),
            visibility,
          ),
        )
        .orderBy(desc(announcements.pinned), desc(announcements.createdAt))
        .limit(40),
      db
        .select()
        .from(visualizerPresets)
        .where(eq(visualizerPresets.status, "published"))
        .orderBy(desc(visualizerPresets.createdAt))
        .limit(100),
      user
        ? db
            .select()
            .from(notificationReads)
            .where(eq(notificationReads.userId, user.id))
        : Promise.resolve([]),
    ]);
    const flags = await db.select().from(featureFlags);
    const ids = [
      ...releases.map((r) => `release:${r.id}`),
      ...notices.map((r) => `announcement:${r.id}`),
    ];
    return Response.json({
      theme: themes[0]?.config ?? null,
      releases,
      announcements: notices,
      presets: [
        ...BUILTIN_PRESETS,
        ...presets.map((p) => ({ ...p, custom: true })),
      ],
      readIds: reads.map((r) => r.itemId),
      notificationIds: ids,
      flags,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const user = await getPrincipal();
    if (!user) throw new ApiError(401, "Sign in to save notifications.");
    const input = await request.json();
    if (input.action === "read-all") {
      const response = await fetch(new URL("/api/content", request.url));
      const content = await response.json();
      if (!response.ok)
        throw new ApiError(500, "Could not load notifications.");
      const ids: string[] = content.notificationIds || [];
      if (ids.length)
        await db
          .insert(notificationReads)
          .values(ids.map((itemId) => ({ userId: user.id, itemId })))
          .onConflictDoNothing();
    } else if (typeof input.id === "string" && input.id.length < 150) {
      await db
        .insert(notificationReads)
        .values({ userId: user.id, itemId: input.id })
        .onConflictDoNothing();
    } else throw new ApiError(400, "Invalid notification.");
    return Response.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
