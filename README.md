# KAZU AI / Audio Studio

## Repository finding

The supplied workspace is a clean Next.js 16.4.2, React 19.2.6, TypeScript 5.9.17, App Router project with Drizzle ORM 0.45.2 and PostgreSQL. It contains no existing GitHub history, Supabase project, authentication, Vercel configuration, or additional product routes. This expansion therefore preserves the existing root route and database health check, extends the existing application shell, and adds an optional Supabase adapter rather than inventing an existing integration. No separate site or second authentication UI was created.

## Implemented

- `/audio-studio`: dashboard, real local project/export counts, creation/import, featured presets, recent projects, quick actions.
- `/audio-studio/editor`: local audio and microphone input, FFT analysis, fifteen visualizer modes, layered Canvas 2D compositing, optimized Three.js scenes, text/artwork/video layers, pointer/touch positioning, undo/redo, local autosave, JSON project import/export, custom presets, music video recording.
- `/audio-studio/visualizers`, `/templates`, `/presets`: searchable library, fifteen distinct built-in presets, real animated previews, validated JSON import/export, local custom presets and authenticated database preset publishing.
- `/audio-studio/projects`: IndexedDB projects including local audio blobs, rename, duplicate, delete confirmation, search/sort, JSON backups.
- `/audio-studio/export-history`: IndexedDB video blobs, playback, download, confirmed deletion.
- `/admin`: server-verified roles and real PostgreSQL statistics; release, announcement, theme/version, feature flag, user/role, preset, feedback and append-only audit management.
- Actual published releases and announcements drive the notification bell. Read state is stored per user in PostgreSQL. There are no fabricated notifications.
- Feedback is validated and stored in PostgreSQL for authorized administrators.

## Audio and graphics

Audio is never uploaded. Local files are stored in IndexedDB, not localStorage. Playback uses HTMLAudioElement, AudioContext, AnalyserNode and GainNode. Microphone input is never monitored to speakers (feedback prevention). Files up to 250 MB are accepted; files up to 48 MB are decoded for a true waveform preview. Larger files use the live analyser. Browser codec support determines which local audio formats actually play. Microphone input requires HTTPS and explicit permission.

The FFT engine reports bass/mid/treble energy, spectrum, time-domain samples and energy. Spectral-flux transient detection is implemented with attack/release smoothing and a refractory period; it is **not** a tested professional beat/BPM detector. Preset thumbnail animations are explicitly previews, not fake audio input. Editor and exported frames use actual analyser data when a track is playing.

Canvas visualizers: classic spectrum, circular spectrum, radial waveform, frequency waveform, particle universe, reactive sphere, tunnel, liquid waves, plasma, energy rings, galaxy, 3D equalizer, oscilloscope, geometry and cinematic landscape. Three.js implements particles/galaxy, deformed sphere, tunnel, rings, geometric pulse and equalizer scenes. WebGL detection, offscreen rendering, quality caps, visibility suspension, resize handling and GPU disposal are included. Unsupported WebGL falls back to Canvas 2D.

Video export uses Canvas.captureStream(30 fps), a cloned Web Audio destination track and MediaRecorder. Supported MIME types are detected; WebM is preferred when supported, with MP4 used only when the browser actually supports it. Resolution options are 480p/720p/1080p; 1080p memory warnings, pause/resume, finish, cancel, background-tab pause, track cleanup and storage-error reporting are included. Videos remain on the device until explicitly downloaded. Export activity is synced as metadata only for signed-in users. There is no automatic FFmpeg/MP4 conversion or native APK update installation.

## Database and deployment

1. Configure `DATABASE_URL` in the private server environment. Never expose it through `NEXT_PUBLIC_*`.
2. Install dependencies, then run `npx drizzle-kit push` against the local sandbox. The platform-managed preview bootstraps PostgreSQL.
3. Run `npx tsx scripts/seed.ts` to initialize feature flags.
4. Run `npm run build`. The platform-managed production runtime serves the application and checks `/api/health`.

For a public Supabase deployment:

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` for the optional Supabase authentication adapter. These are public client identifiers, not privileged keys.
- Apply `database/security.sql` using a trusted owner/admin connection. It enables RLS and defines user isolation, published-content visibility, admin read policies and a verified-identity mirror trigger.
- Point the server's private `DATABASE_URL` at that same Supabase PostgreSQL database using a trusted, least-privileged server connection. The supplied local sandbox does not contain a Supabase database or credentials.
- Apply Drizzle schema changes using a privileged migration connection. A non-owner runtime needs appropriate schema/table grants. Do not run synchronization triggers as an unprivileged user.
- For a hardened runtime, use a dedicated `kazu_runtime` login. Revoke UPDATE/DELETE on `admin_audit_logs` and write access to `user_roles`. Role changes then must use a narrowly authorized SECURITY DEFINER server function, not a broad runtime write grant. The commented section in security.sql documents this boundary; it is not represented as an already configured production role.
- Configure trusted deployment proxy headers and database network restrictions. The included process-local rate limiter is suitable for a single instance; multi-instance deployments should replace it with a shared limiter.
- No Supabase service-role key is used or exposed. A Supabase access-token cookie is HTTP-only; this adapter does not implement silent OAuth/refresh flows. Users sign in again when their one-hour access session expires.

**No Supabase configuration was present, so this turn validates the local PostgreSQL/fullstack path. A live hosted Supabase migration and tenant-specific RLS verification require the actual project connection and are not claimed as completed.**

## Administrator provisioning

New public accounts always receive `user`. There is no public endpoint that grants administrator privileges. Provision a trusted administrator using the server-only CLI:

- Set `ADMIN_EMAIL` to the administrator's email.
- Set `ADMIN_PASSWORD` to a unique password of at least 16 characters.
- Set `ADMIN_ROLE` to `admin` or `super_admin`.
- Run `npx tsx scripts/provision-admin.ts`.
- Sign in at `/admin` with those credentials.

The CLI uses a server-side password hash and writes an audit record. Do not commit credentials or run this script from a route. Ordinary users cannot access protected API data or operations. Suspended accounts cannot authenticate. Administrators cannot change their own role/status, ordinary admins cannot manage users/feature flags or modify a Super Admin, and the last Super Admin cannot be demoted/suspended. Role changes and audit inserts are transactional.

## Privacy and limits

- Local project/audio/video data belongs to the browser origin. Clearing site storage removes it; deleting browser data is never done automatically. Use JSON project backups and download videos separately.
- Imported project/preset JSON is schema-validated. No imported JavaScript, CSS or executable configuration is evaluated. Image/video sources are data URLs or local blobs; remote untrusted media URLs are rejected by preset validation.
- 3D/video availability depends on WebGL, codec support, secure context and device performance. Unsupported paths report the limitation explicitly.
- Audio/video background imports are validated for type/size; large videos should be avoided on older Android devices.
- The visualizer editor is local-first. There is no mandatory cloud audio processing, paid AI API, GPU service or native binary.
- The supplied repository had no existing Git history or Vercel project configuration. The standard Next.js build remains deployment-compatible; connecting the actual repository to Vercel is an external deployment action, not a fabricated integration.

## Validation

Run from the project root:

- `npx next typegen`
- `npm exec tsc -- --noEmit --pretty false`
- `npm run lint`
- `npm run build`
- Platform-managed `build_and_start` (production startup and database health check).

Browser tests in `tests/studio.spec.ts` cover routes, local audio/FFT response, layer changes, undo, persistence, preset import, video/audio capture, mobile layout and server-side admin authorization. Run them against the managed production preview with `npx playwright test tests/studio.spec.ts`. Test administrator provisioning is performed only through the trusted CLI.

## Trusted smoke tests

After provisioning a test administrator with the CLI, run `npx tsx scripts/admin-smoke.ts` with `ADMIN_EMAIL` and `ADMIN_PASSWORD` exported in the server environment. It verifies real publishing, feature-flag enforcement, presets, audit records, self-role protection and suspension. Test-only accounts must be provisioned explicitly; there is no public privilege-escalation endpoint.
