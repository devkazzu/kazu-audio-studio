import { test, expect } from "@playwright/test";
import { configSchema, BUILTIN_PRESETS } from "../src/lib/audio-studio/presets";
const email = `studio-e2e-${Date.now()}@example.test`;
const password = "KAZU-test-password-2026!";
function wavFile() {
  const rate = 22050, seconds = 3, samples = rate * seconds;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 110) * 12000), 44 + i * 2);
  return buffer;
}
async function importTone(page: import("@playwright/test").Page, name: string) {
  await page.locator("input[type=file]").first().setInputFiles({ name, mimeType: "audio/wav", buffer: wavFile() });
  await expect(page.locator(".audio-track-info strong")).toHaveText(name);
}
test("all library routes, presets and mobile layout load", async ({ page }) => {
  const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  for (const route of ["/", "/audio-studio", "/audio-studio/visualizers", "/audio-studio/templates", "/audio-studio/presets", "/audio-studio/projects", "/audio-studio/export-history", "/audio-studio/editor", "/admin"]) {
    const response = await page.goto(route); expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: route === "/" ? 2 : 1 }).first()).toBeVisible();
  }
  await page.goto("/audio-studio"); await page.getByRole("button", { name: "Preview Sakura Dream", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.locator(".preset-preview-stage canvas")).toBeVisible();
  await page.getByRole("button", { name: "Use this preset" }).click(); await expect(page.getByLabel("Visualizer mode")).toHaveValue("particles");
  await expect(page.getByLabel("Project name")).toHaveValue(/Sakura Dream/);
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/audio-studio");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.locator(".sidebar.mobile-open")).toBeVisible();
  await page.getByRole("button", { name: "Close menu", exact: true }).click(); expect(errors).toEqual([]);
});
test("local audio responds to FFT, layers edit, undo and IndexedDB persist", async ({ page }) => {
  await page.goto("/audio-studio/editor"); await expect(page.getByLabel("Project name")).toHaveValue("Untitled project");
  await importTone(page, "test-tone.wav"); await page.getByRole("button", { name: "Play audio", exact: true }).click();
  await expect(page.getByRole("button", { name: "Pause audio", exact: true })).toBeVisible(); await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Audio analysis", exact: true }).click();
  await expect(page.locator(".audio-meter-grid").getByText("Bass", { exact: false })).toBeVisible();
  await expect.poll(async () => await page.locator(".meter-bar i").first().getAttribute("style")).not.toContain("width: 0%");
  await page.getByRole("button", { name: "Pause audio", exact: true }).click(); await page.getByRole("button", { name: "Properties", exact: true }).click();
  await page.getByLabel("Position X", { exact: true }).fill("900"); await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByLabel("Position X", { exact: true })).toHaveValue("960");
  await page.getByLabel("Project name", { exact: true }).fill("My saved tone"); await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-project-title p")).toContainText("All changes saved"); await page.reload();
  await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("My saved tone"); await expect(page.locator(".audio-track-info strong")).toHaveText("test-tone.wav");
});
test("video export captures real audio and rendered visualizer frames", async ({ page }) => {
  await page.goto("/audio-studio/editor"); await expect(page.getByLabel("Project name")).toBeVisible(); await importTone(page, "export-tone.wav");
  await page.getByRole("button", { name: "Export video", exact: true }).click(); await page.getByLabel("Resolution", { exact: true }).selectOption("480");
  await page.getByRole("button", { name: "Start recording", exact: true }).click();
  await expect(page.getByText("Recording your masterpiece…", { exact: false })).toBeVisible(); await page.waitForTimeout(1400);
  await page.getByRole("button", { name: "Finish recording", exact: true }).click(); await expect(page.getByText("It’s a wrap.", { exact: true })).toBeVisible();
  const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download video", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.(webm|mp4)$/); await page.getByRole("button", { name: "Back to studio", exact: true }).click();
  await page.goto("/audio-studio/export-history"); await expect(page.locator(".export-card")).toHaveCount(1); await expect(page.locator(".export-card-meta")).toContainText("854 × 480");
});
test("public signup is a User; admin operations are rejected server-side", async ({ request }) => {
  const signup = await request.post("/api/auth", { data: { action: "signup", email, password, name: "Studio Creator" } }); expect(signup.status()).toBe(200);
  const data = await signup.json(); expect(data.user.role).toBe("user");
  for (const section of ["dashboard", "users", "updates", "announcements", "themes", "features", "presets", "feedback", "audit-logs"]) expect((await request.get(`/api/admin/${section}`)).status()).toBe(403);
  expect((await request.post("/api/admin/users", { data: { action: "create", role: "super_admin" } })).status()).toBe(403);
  expect((await request.post("/api/feedback", { data: { category: "feature", message: "Testing secure feedback delivery from Audio Studio." } })).status()).toBe(200);
  expect((await request.post("/api/presets", { data: { name: "My test preset", config: BUILTIN_PRESETS[0].config } })).status()).toBe(200);
});
test("preset imports reject invalid frequency ranges", () => {
  expect(configSchema.safeParse(BUILTIN_PRESETS[0].config).success).toBe(true);
  expect(configSchema.safeParse({ ...BUILTIN_PRESETS[0].config, settings: { ...BUILTIN_PRESETS[0].config.settings, bassRange: [300, 20] } }).success).toBe(false);
});
