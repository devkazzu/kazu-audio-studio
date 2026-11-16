import { count, desc, eq, gte, and, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users,
  userRoles,
  appReleases,
  announcements,
  themeConfigs,
  featureFlags,
  visualizerPresets,
  feedbackReports,
  adminAuditLogs,
  studioProjects,
  exportEvents,
} from "@/db/schema";
import { ApiError, requireAdmin } from "./permissions";
import { BUILTIN_PRESETS } from "@/lib/audio-studio/presets";
import {
  adminInputSchema,
  themeInputSchema,
  releaseInputSchema,
  announcementInputSchema,
  featureInputSchema,
  presetInputSchema,
  userInputSchema,
} from "./validation";
export async function audit(
  actorId: string,
  action: string,
  entity: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await db
    .insert(adminAuditLogs)
    .values({ actorId, action, entity, entityId, metadata });
}
export async function adminData(section: string) {
  const actor = await requireAdmin(section);
  if (section === "dashboard") {
    const [userCount] = await db.select({ value: count() }).from(users);
    const [projectCount] = await db
      .select({ value: count() })
      .from(studioProjects);
    const [presetCount] = await db
      .select({ value: count() })
      .from(visualizerPresets)
      .where(eq(visualizerPresets.status, "published"));
    const [exportCount] = await db
      .select({ value: count() })
      .from(exportEvents);
    const [feedbackCount] = await db
      .select({ value: count() })
      .from(feedbackReports)
      .where(eq(feedbackReports.status, "new"));
    const [activeCount] = await db
      .select({ value: count() })
      .from(users)
      .where(
        and(
          eq(users.status, "active"),
          gte(users.createdAt, new Date(Date.now() - 7 * 86400000)),
        ),
      );
    return {
      users: userCount.value,
      projects: projectCount.value,
      presets: presetCount.value + BUILTIN_PRESETS.length,
      exports: exportCount.value,
      feedback: feedbackCount.value,
      activeUsers: activeCount.value,
      releases: await db
        .select()
        .from(appReleases)
        .orderBy(desc(appReleases.createdAt))
        .limit(5),
      activity: await db
        .select()
        .from(adminAuditLogs)
        .orderBy(desc(adminAuditLogs.createdAt))
        .limit(8),
      flags: await db.select().from(featureFlags),
      system: {
        database: "connected",
        storage: "local-first",
        auth: process.env.NEXT_PUBLIC_SUPABASE_URL ? "supabase" : "local",
      },
    };
  }
  const tables = {
    updates: appReleases,
    announcements,
    themes: themeConfigs,
    features: featureFlags,
    users,
    presets: visualizerPresets,
    feedback: feedbackReports,
    "audit-logs": adminAuditLogs,
  } as const;
  const table = tables[section as keyof typeof tables];
  if (!table) throw new ApiError(404, "Admin section not found.");
  const createdAtColumn =
    section === "users"
      ? users.createdAt
      : section === "features"
        ? featureFlags.updatedAt
        : appReleases.createdAt;
  const records =
    section === "features"
      ? await db
          .select()
          .from(featureFlags)
          .orderBy(featureFlags.key)
          .limit(250)
      : await db.select().from(table).orderBy(desc(createdAtColumn)).limit(250);
  if (section === "users")
    return {
      records: await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          status: users.status,
          createdAt: users.createdAt,
          role: sql<string>`coalesce((select role from user_roles where user_id = ${users.id} order by granted_at limit 1), 'user')`,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(250),
    };
  if (section === "presets")
    return {
      records,
      builtins: BUILTIN_PRESETS.map((p) => ({ ...p, status: "published" })),
    };
  return { records, actor: { id: actor.id, role: actor.role } };
}
export async function adminMutation(section: string, raw: unknown) {
  const input = adminInputSchema.parse(raw);
  const actor = await requireAdmin(section);
  const action = input.action;
  const data = raw as Record<string, unknown>;
  if ((action as string) === "delete-audit")
    throw new ApiError(403, "Audit history is append-only.");
  if (section === "users") {
    const { id, role, status } = userInputSchema.parse(data);
    if (id === actor.id && (role || status))
      throw new ApiError(
        400,
        "You cannot change your own role or account status.",
      );
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(724001)`);
      const [target] = await tx.select().from(users).where(eq(users.id, id));
      if (!target) throw new ApiError(404, "User not found.");
      const [targetRole] = await tx
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, id));
      if (targetRole?.role === "super_admin") {
        if (actor.role !== "super_admin")
          throw new ApiError(403, "Cannot modify a Super Admin.");
        const [superAdmins] = await tx
          .select({ value: count() })
          .from(userRoles)
          .where(eq(userRoles.role, "super_admin"));
        if (
          superAdmins.value <= 1 &&
          (status === "suspended" || (role && role !== "super_admin"))
        )
          throw new ApiError(
            400,
            "The last active Super Admin cannot be suspended or demoted.",
          );
      }
      if (role && role !== targetRole?.role) {
        await tx.delete(userRoles).where(eq(userRoles.userId, id));
        await tx
          .insert(userRoles)
          .values({ userId: id, role, grantedBy: actor.id });
      }
      if (status)
        await tx.update(users).set({ status }).where(eq(users.id, id));
      await tx
        .insert(adminAuditLogs)
        .values({
          actorId: actor.id,
          action: "user.updated",
          entity: "users",
          entityId: id,
          metadata: {
            role: role || targetRole?.role || "user",
            status: status || target.status,
          },
        });
    });
    return { ok: true };
  }
  if (
    ["dashboard", "audit-logs"].includes(section) ||
    !["create", "update", "archive"].includes(String(action))
  )
    throw new ApiError(400, "Unsupported operation.");
  const values: Record<string, unknown> = { updatedAt: new Date() };
  if (section === "updates") {
    Object.assign(values, releaseInputSchema.parse(data));
  }
  if (section === "announcements") {
    const parsed = announcementInputSchema.parse(data);
    Object.assign(values, parsed);
    values.publishAt = parsed.publishAt ? new Date(parsed.publishAt) : null;
    values.expiresAt = parsed.expiresAt ? new Date(parsed.expiresAt) : null;
  }
  if (section === "themes") {
    const parsed = themeInputSchema.parse(data);
    Object.assign(values, parsed);
  }
  if (section === "features") {
    Object.assign(values, featureInputSchema.parse(data));
  }
  if (section === "presets") {
    Object.assign(values, presetInputSchema.parse(data));
  }
  if (section === "feedback") {
    if (
      !["new", "reviewing", "resolved", "archived"].includes(
        String(data.status),
      )
    )
      throw new ApiError(400, "Invalid feedback status.");
    values.status = data.status;
  }
  const table = {
    updates: appReleases,
    announcements,
    themes: themeConfigs,
    features: featureFlags,
    presets: visualizerPresets,
    feedback: feedbackReports,
  }[section as "updates"];
  if (!table) throw new ApiError(404, "Section not found.");
  let id = "";
  await db.transaction(async (tx) => {
    if (action === "create") {
      if (section === "themes") {
        await tx.execute(sql`select pg_advisory_xact_lock(724002)`);
        const [latest] = await tx
          .select()
          .from(themeConfigs)
          .orderBy(desc(themeConfigs.version))
          .limit(1);
        values.version = (latest?.version ?? 0) + 1;
      }
      const [record] = await tx
        .insert(table)
        .values(values as never)
        .returning({ id: table.id });
      id = record.id;
    } else {
      id = String(data.id || "");
      if (!/^[0-9a-f-]{36}$/i.test(id))
        throw new ApiError(400, "Invalid record ID.");
      if (action === "archive") {
        values.status = "archived";
        if (section === "themes")
          throw new ApiError(
            400,
            "Theme history is preserved. Publish a draft instead.",
          );
      }
      if (section === "themes" && values.status === "published") {
        await tx.execute(sql`select pg_advisory_xact_lock(724002)`);
        const [latest] = await tx
          .select()
          .from(themeConfigs)
          .orderBy(desc(themeConfigs.version))
          .limit(1);
        values.version = (latest?.version ?? 0) + 1;
      }
      const [record] = await tx
        .update(table)
        .set(values as never)
        .where(eq(table.id, id))
        .returning({ id: table.id });
      if (!record) throw new ApiError(404, "Record not found.");
    }
    await tx
      .insert(adminAuditLogs)
      .values({
        actorId: actor.id,
        action: `${section}.${action}`,
        entity: section,
        entityId: id,
        metadata: {
          ...data,
          config: values.config ? "[validated configuration]" : undefined,
          thumbnail: values.thumbnail ? "[image]" : undefined,
        } as Record<string, unknown>,
      });
  });
  return { ok: true, id };
}
