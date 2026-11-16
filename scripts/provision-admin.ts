import "dotenv/config";
import { db, pool } from "../src/db/index";
import {
  users,
  userRoles,
  adminAuditLogs,
  featureFlags,
} from "../src/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/admin/permissions";
async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const role = process.env.ADMIN_ROLE || "super_admin";
  if (
    !email ||
    !password ||
    password.length < 16 ||
    !["admin", "super_admin"].includes(role)
  )
    throw new Error(
      "Set ADMIN_EMAIL, a strong ADMIN_PASSWORD (16+ characters), and ADMIN_ROLE=admin or super_admin. Never use this script in a public route.",
    );
  const id = crypto.randomUUID();
  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(users.email, email));
    const userId = existing?.id || id;
    if (existing) {
      await tx
        .update(users)
        .set({
          status: "active",
          provider: "local",
          passwordHash: await hashPassword(password),
        })
        .where(eq(users.id, userId));
      await tx.delete(userRoles).where(eq(userRoles.userId, userId));
    } else
      await tx
        .insert(users)
        .values({
          id: userId,
          email,
          name: "KAZU Administrator",
          provider: "local",
          passwordHash: await hashPassword(password),
        });
    await tx
      .insert(userRoles)
      .values({ userId, role: role as "admin" | "super_admin" });
    await tx
      .insert(adminAuditLogs)
      .values({
        actorId: userId,
        action: "admin.provisioned",
        entity: "users",
        entityId: userId,
        metadata: { method: "trusted CLI" },
      });
  });
  console.log(
    `Provisioned ${email} with ${role} permissions. Sign in at /admin. No credentials were sent to the browser.`,
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Provisioning failed.",
    );
    process.exitCode = 1;
  })
  .finally(() => pool.end());
