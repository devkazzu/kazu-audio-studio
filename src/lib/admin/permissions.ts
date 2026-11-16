import { cookies } from "next/headers";
import {
  createHash,
  randomBytes,
  scrypt as nodeScrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { users, userRoles, sessions } from "@/db/schema";
import type { Principal } from "@/lib/audio-studio/types";
import { ensureUsersTable } from "@/lib/admin/bootstrap";
const scrypt = promisify(nodeScrypt);
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export const newToken = () => randomBytes(32).toString("hex");
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${key.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const key = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, "hex");
  return key.length === expected.length && timingSafeEqual(key, expected);
}
const supabase = () =>
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
          },
        },
      )
    : null;
export async function getSupabaseUser() {
  const client = supabase();
  if (!client) return null;
  const {
    data: { user },
  } = await client.auth.getUser(await getAccessToken());
  return user;
}
async function getAccessToken() {
  const token = (await cookies()).get("kazu_supabase_access")?.value;
  return token || undefined;
}
export async function getPrincipal(): Promise<Principal | null> {
  const client = supabase();
  if (client) {
    const user = await getSupabaseUser();
    if (!user) return null;
    await db
      .insert(users)
      .values({
        id: user.id,
        email: user.email ?? "",
        name:
          (user.user_metadata?.name as string) ||
          user.email?.split("@")[0] ||
          "Creator",
        provider: "supabase",
      })
      .onConflictDoNothing();
    await db
      .insert(userRoles)
      .values({ userId: user.id, role: "user" })
      .onConflictDoNothing();
  } else {
    const token = (await cookies()).get("kazu_session")?.value;
    if (!token) return null;
    const [session] = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.tokenHash, hashToken(token)),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) return null;
  }
  await ensureUsersTable();
  const id = client
    ? (await getSupabaseUser())!.id
    : (
        await db
          .select()
          .from(sessions)
          .where(
            and(
              eq(
                sessions.tokenHash,
                hashToken((await cookies()).get("kazu_session")!.value),
              ),
              gt(sessions.expiresAt, new Date()),
            ),
          )
          .limit(1)
      )[0].userId;
  const [record] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      status: users.status,
      provider: users.provider,
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!record || record.status === "suspended") return null;
  // A user may have several historical/current role grants. Resolve the
  // highest effective role explicitly; selecting the oldest grant could
  // accidentally leave a promoted administrator with the default "user" role.
  const rolePriority: Record<Principal["role"], number> = {
    user: 0,
    moderator: 1,
    admin: 2,
    super_admin: 3,
  };
  const assignedRoles = await db
    .select({ role: userRoles.role })
    .from(userRoles)
    .where(eq(userRoles.userId, id));
  const effectiveRole =
    assignedRoles
      .map((entry) => entry.role as Principal["role"])
      .sort((a, b) => rolePriority[b] - rolePriority[a])[0] ?? "user";
  return {
    ...record,
    provider: record.provider as Principal["provider"],
    role: effectiveRole,
  };
}
export async function requireUser() {
  const user = await getPrincipal();
  if (!user) throw new ApiError(401, "Sign in to continue.");
  return user;
}
export async function requireAdmin(section?: string) {
  const user = await requireUser();
  if (user.role !== "admin" && user.role !== "super_admin")
    throw new ApiError(403, "Administrator access is required.");
  if (
    ["users", "features"].includes(section ?? "") &&
    user.role !== "super_admin"
  )
    throw new ApiError(403, "Super Admin access is required.");
  return user;
}
export async function createSession(userId: string) {
  const token = newToken();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db
    .insert(sessions)
    .values({ tokenHash: hashToken(token), userId, expiresAt: expires });
  (await cookies()).set("kazu_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires,
  });
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get("kazu_session")?.value;
  if (token)
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
  jar.delete("kazu_session");
  jar.delete("kazu_supabase_access");
  jar.delete("kazu_supabase_refresh");
}
const attempts = new Map<string, { count: number; until: number }>();
export function rateLimit(request: Request, scope: string, limit = 20) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${scope}:${ip}`;
  const now = Date.now();
  if (attempts.size > 5000)
    for (const [k, v] of attempts) if (v.until < now) attempts.delete(k);
  const entry = attempts.get(key);
  if (!entry || entry.until < now) {
    attempts.set(key, { count: 1, until: now + 60000 });
    return;
  }
  if (++entry.count > limit)
    throw new ApiError(429, "Too many requests. Please try again in a minute.");
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("[kazu-api]", error);
  return Response.json(
    { error: "Something went wrong. Please try again." },
    { status: 500 },
  );
}
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");
  if (origin && new URL(origin).host !== host)
    throw new ApiError(403, "Invalid request origin.");
}
