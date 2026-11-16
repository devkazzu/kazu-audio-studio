import { sql } from "drizzle-orm";
import { db } from "@/db";
let ready: Promise<void> | undefined;
export function ensureUsersTable() {
  if (!ready)
    ready = db
      .execute(sql`select to_regclass('public.users') as present`)
      .then((result) => {
        const present = (result.rows[0] as { present?: string })?.present;
        if (!present)
          throw new Error(
            "Database schema is not initialized. Run the Drizzle schema push and see README.md.",
          );
      })
      .catch((error) => {
        ready = undefined;
        throw error;
      });
  return ready;
}
