import { db } from "@/db";
import { featureFlags } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "./permissions";
export async function requireFeature(key: string) {
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(eq(featureFlags.key, key))
    .limit(1);
  if (flag && !flag.enabled)
    throw new ApiError(
      403,
      "This feature is currently disabled by the administrator.",
    );
}
