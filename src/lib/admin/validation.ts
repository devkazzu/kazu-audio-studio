import { z } from "zod";
import { configSchema } from "@/lib/audio-studio/presets";
export const adminInputSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create") }),
  z.object({ action: z.literal("update") }),
  z.object({ action: z.literal("archive") }),
]);
const color = z.string().regex(/^#[0-9a-f]{6}$/i);
export const themeInputSchema = z.object({
  name: z.string().min(1).max(100),
  status: z.enum(["draft", "published"]),
  config: z.object({
    background: color,
    surface: color,
    primary: color,
    secondary: color,
    text: color,
    border: color,
    radius: z.number().min(0).max(32),
    glow: z.number().min(0).max(1),
    font: z.enum([
      "Inter, system-ui, sans-serif",
      "Georgia, serif",
      "monospace",
    ]),
    animations: z.boolean(),
  }),
});
export const releaseInputSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i),
  title: z.string().min(1).max(200),
  releaseDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => !Number.isNaN(Date.parse(value)), "Invalid date"),
  notes: z.string().max(20000).default(""),
  features: z.array(z.string().max(2000)).max(30).default([]),
  fixes: z.array(z.string().max(2000)).max(30).default([]),
  improvements: z.array(z.string().max(2000)).max(30).default([]),
  updateUrl: z
    .string()
    .url()
    .refine((value) => value.startsWith("https://"), "HTTPS is required")
    .or(z.literal(""))
    .default(""),
  minimumVersion: z
    .string()
    .regex(/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/i)
    .default("1.0.0"),
  status: z.enum(["draft", "published", "archived"]),
});
export const announcementInputSchema = z
  .object({
    title: z.string().min(1).max(200),
    body: z.string().min(1).max(10000),
    audience: z.enum(["all", "signed-in", "administrators"]),
    priority: z.enum(["normal", "important", "maintenance"]),
    pinned: z.boolean(),
    status: z.enum(["draft", "scheduled", "published", "archived"]),
    publishAt: z.string().datetime().optional().nullable(),
    expiresAt: z.string().datetime().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.status === "scheduled" && !value.publishAt)
      ctx.addIssue({
        code: "custom",
        path: ["publishAt"],
        message: "Choose a scheduled publish time.",
      });
    if (value.publishAt && value.expiresAt && value.publishAt > value.expiresAt)
      ctx.addIssue({
        code: "custom",
        path: ["expiresAt"],
        message: "Expiration must be after publishing.",
      });
  });
export const featureInputSchema = z.object({
  key: z.string().regex(/^[a-z0-9_-]{2,60}$/),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).default(""),
  enabled: z.boolean(),
});
export const presetInputSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).default(""),
  category: z.string().min(1).max(60).default("Custom"),
  config: configSchema,
  thumbnail: z
    .string()
    .max(3000000)
    .refine(
      (value) => !value || /^data:image\/(jpeg|png|webp);base64,/.test(value),
      "Invalid thumbnail",
    )
    .default(""),
  status: z.enum(["draft", "published", "archived"]),
});
export const userInputSchema = z.object({
  id: z.string().uuid(),
  role: z.enum(["user", "moderator", "admin", "super_admin"]).optional(),
  status: z.enum(["active", "suspended"]).optional(),
});
