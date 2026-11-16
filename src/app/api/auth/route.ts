import { cookies } from "next/headers";
import { db } from "@/db";
import { users, userRoles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import {
  ApiError,
  apiError,
  createSession,
  destroySession,
  getPrincipal,
  hashPassword,
  rateLimit,
  sameOrigin,
  verifyPassword,
} from "@/lib/admin/permissions";
import { ensureUsersTable } from "@/lib/admin/bootstrap";
export const dynamic = "force-dynamic";
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("session") }),
  z.object({
    action: z.literal("signup"),
    email: z.string().email().max(254),
    password: z.string().min(10).max(128),
    name: z.string().min(1).max(80),
  }),
  z.object({
    action: z.literal("login"),
    email: z.string().email().max(254),
    password: z.string().min(1).max(128),
  }),
  z.object({ action: z.literal("logout") }),
]);
export async function GET() {
  try {
    return Response.json({
      user: await getPrincipal(),
      supabaseConfigured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    });
  } catch (error) {
    return apiError(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    rateLimit(request, "auth", 12);
    const input = schema.parse(await request.json());
    if (input.action === "session")
      return Response.json({ user: await getPrincipal() });
    await ensureUsersTable();
    if (input.action === "logout") {
      await destroySession();
      return Response.json({ ok: true });
    }
    const client =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        ? createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              auth: {
                autoRefreshToken: false,
                detectSessionInUrl: false,
                persistSession: false,
              },
            },
          )
        : null;
    if (client) {
      if (input.action === "signup") {
        const { data, error } = await client.auth.signUp({
          email: input.email,
          password: input.password,
          options: { data: { name: input.name } },
        });
        if (error) throw new ApiError(400, error.message);
        if (!data.session) return Response.json({ confirmationRequired: true });
        (await cookies()).set(
          "kazu_supabase_access",
          data.session.access_token,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          },
        );
      } else {
        const { data, error } = await client.auth.signInWithPassword({
          email: input.email,
          password: input.password,
        });
        if (error || !data.session)
          throw new ApiError(401, "Invalid email or password.");
        (await cookies()).set(
          "kazu_supabase_access",
          data.session.access_token,
          {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          },
        );
      }
      return Response.json({ user: await getPrincipal() });
    }
    const email = input.email.trim().toLowerCase();
    if (input.action === "signup") {
      const [existing] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, email));
      if (existing)
        throw new ApiError(
          409,
          "An account with this email already exists. Sign in instead.",
        );
      const id = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx
          .insert(users)
          .values({
            id,
            email,
            name: input.name.trim(),
            passwordHash: await hashPassword(input.password),
          });
        await tx.insert(userRoles).values({ userId: id, role: "user" });
      });
      await createSession(id);
    } else {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);
      if (
        !user?.passwordHash ||
        !(await verifyPassword(input.password, user.passwordHash))
      )
        throw new ApiError(401, "Invalid email or password.");
      if (user.status === "suspended")
        throw new ApiError(
          403,
          "This account has been suspended. Contact support.",
        );
      await createSession(user.id);
    }
    return Response.json({ user: await getPrincipal() });
  } catch (error) {
    return apiError(error);
  }
}
