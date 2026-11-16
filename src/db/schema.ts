import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
  primaryKey,
  index,
  date,
} from "drizzle-orm/pg-core";
import type {
  StudioConfig,
  VisualizerSettings,
  ThemeConfig,
} from "@/lib/audio-studio/types";

export const roleEnum = pgEnum("user_role", [
  "user",
  "moderator",
  "admin",
  "super_admin",
]);
export const accountStatus = pgEnum("account_status", ["active", "suspended"]);
export const publishStatus = pgEnum("publish_status", [
  "draft",
  "scheduled",
  "published",
  "archived",
]);
export const users = pgTable("users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  status: accountStatus("status").notNull().default("active"),
  provider: text("provider").notNull().default("local"),
  passwordHash: text("password_hash"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const userRoles = pgTable(
  "user_roles",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: roleEnum("role").notNull().default("user"),
    grantedBy: uuid("granted_by").references(() => users.id),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.role] }),
    index("user_roles_user_idx").on(t.userId),
  ],
);
export const sessions = pgTable(
  "user_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);
export const appReleases = pgTable("app_releases", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: text("version").notNull().unique(),
  title: text("title").notNull(),
  releaseDate: date("release_date").notNull(),
  notes: text("notes").notNull().default(""),
  features: jsonb("features").$type<string[]>().notNull().default([]),
  fixes: jsonb("fixes").$type<string[]>().notNull().default([]),
  improvements: jsonb("improvements").$type<string[]>().notNull().default([]),
  updateUrl: text("update_url"),
  minimumVersion: text("minimum_version").notNull().default("1.0.0"),
  status: publishStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const announcements = pgTable("announcements", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: text("audience").notNull().default("all"),
  priority: text("priority").notNull().default("normal"),
  pinned: boolean("pinned").notNull().default(false),
  status: publishStatus("status").notNull().default("draft"),
  publishAt: timestamp("publish_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const themeConfigs = pgTable("theme_configs", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  config: jsonb("config").$type<ThemeConfig>().notNull(),
  version: integer("version").notNull().default(1),
  status: publishStatus("status").notNull().default("draft"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const featureFlags = pgTable("feature_flags", {
  key: text("key").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  enabled: boolean("enabled").notNull().default(true),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const visualizerPresets = pgTable("visualizer_presets", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  category: text("category").notNull().default("Custom"),
  thumbnail: text("thumbnail").notNull().default(""),
  config: jsonb("config").$type<StudioConfig>().notNull(),
  status: publishStatus("status").notNull().default("draft"),
  featured: boolean("featured").notNull().default(false),
  ownerId: uuid("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const feedbackReports = pgTable("feedback_reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"),
  category: text("category").notNull().default("general"),
  message: text("message").notNull(),
  status: text("status").notNull().default("new"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const adminAuditLogs = pgTable(
  "admin_audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    actorId: uuid("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("audit_created_idx").on(t.createdAt),
    index("audit_actor_idx").on(t.actorId),
  ],
);
export const notificationReads = pgTable(
  "notification_reads",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    itemId: text("item_id").notNull(),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.itemId] })],
);
export const studioProjects = pgTable(
  "studio_projects",
  {
    id: uuid("id").primaryKey(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    config: jsonb("config").$type<StudioConfig>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("studio_projects_owner_idx").on(t.ownerId)],
);
export const exportEvents = pgTable(
  "export_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    duration: integer("duration").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("export_events_user_idx").on(t.userId)],
);
export type DbSettings = typeof visualizerPresets.$inferSelect;
