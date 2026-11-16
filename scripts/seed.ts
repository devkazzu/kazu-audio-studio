import "dotenv/config";
import { db, pool } from "../src/db/index";
import { featureFlags } from "../src/db/schema";
async function main() {
  await db
    .insert(featureFlags)
    .values([
      {
        key: "audio_studio",
        name: "Audio Studio",
        description: "Dashboard, editor, and local project creation.",
        enabled: true,
      },
      {
        key: "visualizer_modules",
        name: "Visualizer Modules",
        description: "Canvas visualizers and creative preset library.",
        enabled: true,
      },
      {
        key: "engine_3d",
        name: "3D Visual Engine",
        description: "WebGL scenes with a Canvas 2D fallback.",
        enabled: true,
      },
      {
        key: "video_export",
        name: "Video Export",
        description: "Browser-native video recording with original audio.",
        enabled: true,
      },
      {
        key: "experimental_features",
        name: "Experimental Features",
        description: "Future creative modules. Disabled until ready.",
        enabled: false,
      },
    ])
    .onConflictDoNothing();
  console.log(
    "Feature flags initialized. No users or privileges were created.",
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
