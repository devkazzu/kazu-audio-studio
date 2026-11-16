# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: studio.spec.ts >> local audio responds to FFT, layers edit, undo and IndexedDB persist
- Location: tests/studio.spec.ts:34:1

# Error details

```
Error: expect(locator).toHaveValue(expected) failed

Locator: getByLabel('Project name')
Expected: "Untitled project"
Error: strict mode violation: getByLabel('Project name') resolved to 2 elements:
    1) <input disabled value="Opening project…" aria-label="Project name"/> aka getByRole('textbox', { name: 'Project name' })
    2) <input disabled value="Opening project…" aria-label="Project name"/> aka getByLabel('Project name').nth(1)

Call log:
  - Expect "toHaveValue" getByLabel('Project name') with timeout 15000ms
  - waiting for getByLabel('Project name')
    - locator resolved to <input disabled value="Opening project…" aria-label="Project name"/>
    - unexpected value "Opening project…"

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e3]:
      - link "KAZU AI home" [ref=e5] [cursor=pointer]:
        - /url: /
        - generic [ref=e13]:
          - text: KAZU
          - generic [ref=e14]: AI
      - generic [ref=e15]: WORKSPACE
      - navigation [ref=e16]:
        - link "Home" [ref=e17] [cursor=pointer]:
          - /url: /
        - link "Audio Studio NEW" [ref=e24] [cursor=pointer]:
          - /url: /audio-studio
          - generic [ref=e26]: Audio Studio
          - generic [ref=e27]: NEW
        - link "My Projects" [ref=e28] [cursor=pointer]:
          - /url: /audio-studio/projects
        - link "Visualizers" [ref=e32] [cursor=pointer]:
          - /url: /audio-studio/visualizers
        - link "Templates" [ref=e38] [cursor=pointer]:
          - /url: /audio-studio/templates
        - link "Presets" [ref=e44] [cursor=pointer]:
          - /url: /audio-studio/presets
      - generic [ref=e48]: YOUR LIBRARY
      - navigation [ref=e49]:
        - link "Export History" [ref=e50] [cursor=pointer]:
          - /url: /audio-studio/export-history
        - button "Feedback & Support" [ref=e55] [cursor=pointer]
      - generic [ref=e59]:
        - generic [ref=e60]:
          - heading "Made for your sound." [level=3] [ref=e73]
          - paragraph [ref=e74]: Your next great visualstarts with an idea.
          - button "Open Studio" [ref=e75] [cursor=pointer]
        - button "Help & shortcuts" [ref=e79] [cursor=pointer]
        - button "K KAZU Creator Your creative workspace" [ref=e86] [cursor=pointer]:
          - generic [ref=e87]: K
          - generic [ref=e88]:
            - strong [ref=e89]: KAZU Creator
            - generic [ref=e90]: Your creative workspace
    - generic [ref=e93]:
      - banner [ref=e94]:
        - generic [ref=e95]:
          - generic [ref=e96]: Workspace
          - strong [ref=e99]: Editor
        - generic [ref=e100]:
          - button "Search anything... ⌘ K" [ref=e101] [cursor=pointer]:
            - generic [ref=e105]: Search anything...
            - generic [ref=e106]: ⌘ K
          - button "Notifications" [ref=e109] [cursor=pointer]
          - link "Explore themes and presets" [ref=e113] [cursor=pointer]:
            - /url: /audio-studio/presets
          - button "Account menu" [ref=e121] [cursor=pointer]: K
      - main [ref=e122]:
        - heading "Audio Studio Editor" [level=1] [ref=e123]
        - button "Choose File" [ref=e124]
        - button "Choose File" [ref=e125]
        - generic [ref=e126]:
          - generic [ref=e127]:
            - button "Back to projects" [ref=e128] [cursor=pointer]
            - generic [ref=e131]:
              - textbox "Project name" [ref=e132]: Untitled project
              - paragraph [ref=e133]: All changes saved on this device
          - generic [ref=e135]:
            - button "Project" [ref=e136] [cursor=pointer]
            - button "Save preset" [ref=e139] [cursor=pointer]
            - button "Export video" [ref=e143] [cursor=pointer]
        - generic [ref=e147]:
          - generic [ref=e148]:
            - button "Undo" [disabled] [ref=e149]
            - button "Redo" [disabled] [ref=e153]
            - button "Choose an audio file" [ref=e158] [cursor=pointer]
            - button "Play or pause preview" [ref=e162] [cursor=pointer]
          - generic [ref=e164]:
            - generic [ref=e165]: VISUALIZER
            - combobox "Visualizer mode" [ref=e166]:
              - option "Classic Spectrum" [selected]
              - option "Circular Spectrum"
              - option "Radial Waveform"
              - option "Frequency Waveform"
              - option "Particle Universe"
              - option "Audio Reactive Sphere"
              - option "Infinite Tunnel"
              - option "Liquid Waves"
              - option "Plasma Field"
              - option "Energy Rings"
              - option "Galaxy Particles"
              - option "3D Equalizer"
              - option "Neon Oscilloscope"
              - option "Geometric Pulse"
              - option "Cinematic Landscape"
            - button "Browse presets" [ref=e167] [cursor=pointer]
            - combobox "Aspect ratio" [ref=e172]:
              - option "16:9 Landscape" [selected]
              - option "9:16 Vertical"
              - option "1:1 Square"
            - combobox "Performance quality" [ref=e173]:
              - option "LOW · Battery saver"
              - option "MEDIUM · Balanced" [selected]
              - option "HIGH · Best quality"
          - generic [ref=e174]:
            - button "Audio analysis settings" [ref=e175] [cursor=pointer]
            - button "Fullscreen preview" [ref=e179] [cursor=pointer]
            - button "Save" [ref=e185] [cursor=pointer]
        - generic [ref=e190]:
          - complementary [ref=e191]:
            - generic [ref=e192]:
              - generic [ref=e193]:
                - text: Layers
                - generic [ref=e198]: "3"
              - button "Add layer" [ref=e199] [cursor=pointer]
            - generic [ref=e201]:
              - button [ref=e202] [cursor=pointer]:
                - textbox "Layer name" [ref=e213]: Artist & title
                - generic [ref=e214]:
                  - button "Hide Artist & title" [ref=e215]
                  - button "Lock Artist & title" [ref=e219]
              - button [ref=e224] [cursor=pointer]:
                - textbox "Layer name" [ref=e234]: Main visualizer
                - generic [ref=e235]:
                  - button "Hide Main visualizer" [ref=e236]
                  - button "Lock Main visualizer" [ref=e240]
              - button [ref=e245] [cursor=pointer]:
                - textbox "Layer name" [ref=e256]: Background
                - generic [ref=e257]:
                  - button "Hide Background" [ref=e258]
                  - button "Lock Background" [ref=e262]
            - button "Add layer" [ref=e267] [cursor=pointer]
            - generic [ref=e269]:
              - paragraph [ref=e270]: Drag to reorder. Select a layer to make it yours.
              - generic [ref=e271]:
                - button "Down" [ref=e272] [cursor=pointer]
                - button "Up" [ref=e275] [cursor=pointer]
          - generic [ref=e278]:
            - generic [ref=e279]:
              - generic [ref=e280]: LIVE PREVIEW
              - generic [ref=e285]: SPECTRUM · MEDIUM QUALITY
            - generic [ref=e287]:
              - generic "Audio-reactive visualizer preview" [ref=e288]
              - generic [ref=e289]: Main visualizer
              - generic: Import audio to bring your visuals to life
            - generic [ref=e294]:
              - generic [ref=e295]: 16:9 · 1920 × 1080
              - generic [ref=e296]: LOCAL-FIRST WORKSPACE
          - complementary [ref=e300]:
            - generic [ref=e301]:
              - button "Properties" [ref=e302] [cursor=pointer]
              - button "Audio analysis" [ref=e303] [cursor=pointer]
            - generic [ref=e304]:
              - generic [ref=e308]:
                - textbox "Selected layer name" [ref=e309]: Main visualizer
                - text: Visual layer
              - generic [ref=e310]:
                - heading "Transform" [level=3] [ref=e311]
                - generic [ref=e312]:
                  - generic [ref=e313]:
                    - generic [ref=e314]: Position X
                    - spinbutton "Position X" [ref=e315]: "0"
                  - generic [ref=e316]:
                    - generic [ref=e317]: Position Y
                    - spinbutton "Position Y" [ref=e318]: "0"
                - generic [ref=e319]:
                  - generic [ref=e320]:
                    - generic [ref=e321]: Width
                    - spinbutton "Width" [ref=e322]: "1920"
                  - generic [ref=e323]:
                    - generic [ref=e324]: Height
                    - spinbutton "Height" [ref=e325]: "1080"
                - generic [ref=e326]:
                  - generic [ref=e327]:
                    - text: Scale
                    - generic [ref=e328]: 1×
                  - slider "Scale 1×" [ref=e329] [cursor=pointer]: "1"
                - generic [ref=e330]:
                  - generic [ref=e331]:
                    - text: Rotation
                    - generic [ref=e332]: 0°
                  - slider "Rotation 0°" [ref=e333] [cursor=pointer]: "0"
              - generic [ref=e334]:
                - heading "Color & appearance" [level=3] [ref=e335]
                - generic [ref=e336]:
                  - textbox "Layer color" [ref=e337] [cursor=pointer]: "#c77dff"
                  - textbox "Hex color" [ref=e338]: "#C77DFF"
                - generic [ref=e339]:
                  - generic [ref=e340]:
                    - text: Opacity
                    - generic [ref=e341]: "1"
                  - slider "Opacity 1" [ref=e342] [cursor=pointer]: "1"
                - generic [ref=e343]:
                  - generic [ref=e344]: Blend mode
                  - combobox "Blend mode" [ref=e345]:
                    - option "Normal"
                    - option "Screen" [selected]
                    - option "Multiply"
                    - option "Additive"
                    - option "Overlay"
              - generic [ref=e346]:
                - button "Duplicate" [ref=e347] [cursor=pointer]
                - button "Delete" [ref=e351] [cursor=pointer]
              - button "Reset layer properties" [ref=e355] [cursor=pointer]
        - region "Audio player" [ref=e359]:
          - generic [ref=e360]:
            - generic [ref=e365]:
              - strong [ref=e366]: Your sound goes here
              - generic [ref=e367]: Import a track or connect your microphone
            - button "Microphone" [ref=e368] [cursor=pointer]
          - generic [ref=e372] [cursor=pointer]:
            - generic [ref=e376]:
              - strong [ref=e377]: Drop your audio here, or click to browse
              - generic [ref=e378]: MP3, WAV, OGG, M4A, FLAC · up to 250 MB
            - button "Choose an audio file" [ref=e379]
          - generic "Waveform preview appears after importing audio" [ref=e381]
          - generic [ref=e382]:
            - button "Play audio" [disabled] [ref=e383]
            - generic [ref=e386]:
              - text: 0:00
              - generic [ref=e387]: / 0:00
            - slider "Seek audio" [disabled] [ref=e388]: "0"
            - generic [ref=e389]:
              - button "Mute audio" [ref=e390] [cursor=pointer]
              - slider "Volume" [ref=e395]: "0.8"
            - button "Loop audio" [ref=e396] [cursor=pointer]
            - button "Restart audio" [ref=e402] [cursor=pointer]
          - generic [ref=e406]:
            - generic [ref=e407]: Processed on your device. Always.
            - generic [ref=e411]: WEB AUDIO ENGINE
  - alert [ref=e413]
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | import { configSchema, BUILTIN_PRESETS } from "../src/lib/audio-studio/presets";
  3  | const email = `studio-e2e-${Date.now()}@example.test`;
  4  | const password = "KAZU-test-password-2026!";
  5  | function wavFile() {
  6  |   const rate = 22050, seconds = 3, samples = rate * seconds;
  7  |   const buffer = Buffer.alloc(44 + samples * 2);
  8  |   buffer.write("RIFF", 0); buffer.writeUInt32LE(buffer.length - 8, 4); buffer.write("WAVEfmt ", 8);
  9  |   buffer.writeUInt32LE(16, 16); buffer.writeUInt16LE(1, 20); buffer.writeUInt16LE(1, 22);
  10 |   buffer.writeUInt32LE(rate, 24); buffer.writeUInt32LE(rate * 2, 28); buffer.writeUInt16LE(2, 32); buffer.writeUInt16LE(16, 34);
  11 |   buffer.write("data", 36); buffer.writeUInt32LE(samples * 2, 40);
  12 |   for (let i = 0; i < samples; i++) buffer.writeInt16LE(Math.round(Math.sin(i / rate * Math.PI * 2 * 110) * 12000), 44 + i * 2);
  13 |   return buffer;
  14 | }
  15 | async function importTone(page: import("@playwright/test").Page, name: string) {
  16 |   await page.locator("input[type=file]").first().setInputFiles({ name, mimeType: "audio/wav", buffer: wavFile() });
  17 |   await expect(page.locator(".audio-track-info strong")).toHaveText(name);
  18 | }
  19 | test("all library routes, presets and mobile layout load", async ({ page }) => {
  20 |   const errors: string[] = []; page.on("pageerror", error => errors.push(error.message));
  21 |   for (const route of ["/", "/audio-studio", "/audio-studio/visualizers", "/audio-studio/templates", "/audio-studio/presets", "/audio-studio/projects", "/audio-studio/export-history", "/audio-studio/editor", "/admin"]) {
  22 |     const response = await page.goto(route); expect(response?.status()).toBe(200);
  23 |     await expect(page.getByRole("heading", { level: route === "/" ? 2 : 1 }).first()).toBeVisible();
  24 |   }
  25 |   await page.goto("/audio-studio"); await page.getByRole("button", { name: "Preview Sakura Dream", exact: true }).click();
  26 |   await expect(page.getByRole("dialog")).toBeVisible(); await expect(page.locator(".preset-preview-stage canvas")).toBeVisible();
  27 |   await page.getByRole("button", { name: "Use this preset" }).click(); await expect(page.getByLabel("Visualizer mode")).toHaveValue("particles");
  28 |   await expect(page.getByLabel("Project name")).toHaveValue(/Sakura Dream/);
  29 |   await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/audio-studio");
  30 |   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  31 |   await page.getByRole("button", { name: "Open navigation" }).click(); await expect(page.locator(".sidebar.mobile-open")).toBeVisible();
  32 |   await page.getByRole("button", { name: "Close menu", exact: true }).click(); expect(errors).toEqual([]);
  33 | });
  34 | test("local audio responds to FFT, layers edit, undo and IndexedDB persist", async ({ page }) => {
> 35 |   await page.goto("/audio-studio/editor"); await expect(page.getByLabel("Project name")).toHaveValue("Untitled project");
     |                                                                                          ^ Error: expect(locator).toHaveValue(expected) failed
  36 |   await importTone(page, "test-tone.wav"); await page.getByRole("button", { name: "Play audio", exact: true }).click();
  37 |   await expect(page.getByRole("button", { name: "Pause audio", exact: true })).toBeVisible(); await page.waitForTimeout(600);
  38 |   await page.getByRole("button", { name: "Audio analysis", exact: true }).click();
  39 |   await expect(page.locator(".audio-meter-grid").getByText("Bass", { exact: false })).toBeVisible();
  40 |   await expect.poll(async () => await page.locator(".meter-bar i").first().getAttribute("style")).not.toContain("width: 0%");
  41 |   await page.getByRole("button", { name: "Pause audio", exact: true }).click(); await page.getByRole("button", { name: "Properties", exact: true }).click();
  42 |   await page.getByLabel("Position X", { exact: true }).fill("900"); await page.getByRole("button", { name: "Undo", exact: true }).click();
  43 |   await expect(page.getByLabel("Position X", { exact: true })).toHaveValue("960");
  44 |   await page.getByLabel("Project name", { exact: true }).fill("My saved tone"); await page.getByRole("button", { name: "Save", exact: true }).click();
  45 |   await expect(page.locator(".editor-project-title p")).toContainText("All changes saved"); await page.reload();
  46 |   await expect(page.getByLabel("Project name", { exact: true })).toHaveValue("My saved tone"); await expect(page.locator(".audio-track-info strong")).toHaveText("test-tone.wav");
  47 | });
  48 | test("video export captures real audio and rendered visualizer frames", async ({ page }) => {
  49 |   await page.goto("/audio-studio/editor"); await expect(page.getByLabel("Project name")).toBeVisible(); await importTone(page, "export-tone.wav");
  50 |   await page.getByRole("button", { name: "Export video", exact: true }).click(); await page.getByLabel("Resolution", { exact: true }).selectOption("480");
  51 |   await page.getByRole("button", { name: "Start recording", exact: true }).click();
  52 |   await expect(page.getByText("Recording your masterpiece…", { exact: false })).toBeVisible(); await page.waitForTimeout(1400);
  53 |   await page.getByRole("button", { name: "Finish recording", exact: true }).click(); await expect(page.getByText("It’s a wrap.", { exact: true })).toBeVisible();
  54 |   const download = page.waitForEvent("download"); await page.getByRole("button", { name: "Download video", exact: true }).click();
  55 |   expect((await download).suggestedFilename()).toMatch(/\.(webm|mp4)$/); await page.getByRole("button", { name: "Back to studio", exact: true }).click();
  56 |   await page.goto("/audio-studio/export-history"); await expect(page.locator(".export-card")).toHaveCount(1); await expect(page.locator(".export-card-meta")).toContainText("854 × 480");
  57 | });
  58 | test("public signup is a User; admin operations are rejected server-side", async ({ request }) => {
  59 |   const signup = await request.post("/api/auth", { data: { action: "signup", email, password, name: "Studio Creator" } }); expect(signup.status()).toBe(200);
  60 |   const data = await signup.json(); expect(data.user.role).toBe("user");
  61 |   for (const section of ["dashboard", "users", "updates", "announcements", "themes", "features", "presets", "feedback", "audit-logs"]) expect((await request.get(`/api/admin/${section}`)).status()).toBe(403);
  62 |   expect((await request.post("/api/admin/users", { data: { action: "create", role: "super_admin" } })).status()).toBe(403);
  63 |   expect((await request.post("/api/feedback", { data: { category: "feature", message: "Testing secure feedback delivery from Audio Studio." } })).status()).toBe(200);
  64 |   expect((await request.post("/api/presets", { data: { name: "My test preset", config: BUILTIN_PRESETS[0].config } })).status()).toBe(200);
  65 | });
  66 | test("preset imports reject invalid frequency ranges", () => {
  67 |   expect(configSchema.safeParse(BUILTIN_PRESETS[0].config).success).toBe(true);
  68 |   expect(configSchema.safeParse({ ...BUILTIN_PRESETS[0].config, settings: { ...BUILTIN_PRESETS[0].config.settings, bassRange: [300, 20] } }).success).toBe(false);
  69 | });
  70 | 
```