"use client";
import { useState, useEffect, useCallback, type ReactNode } from "react";
import {
  Search,
  Plus,
  Download,
  Upload,
  Archive,
  Pencil,
  Save,
  ArrowUpRight,
  ShieldCheck,
  X,
  FileJson,
  Sparkles,
  Copy,
  Check,
  Palette,
  RotateCcw,
  History,
  Eye,
  Users,
  LayoutGrid,
  AudioLines,
  SlidersHorizontal,
  DownloadCloud,
  MessageSquare,
  Megaphone,
} from "lucide-react";
import { Button, Modal, PageHeading, EmptyState } from "@/components/ui";
import { useApp } from "@/components/providers";
import {
  DEFAULT_THEME,
  type ThemeConfig,
  type Preset,
} from "@/lib/audio-studio/types";
import { presetImportSchema } from "@/lib/audio-studio/presets";
import {
  saveLocalPreset,
  downloadBlob,
} from "@/lib/audio-studio/project-storage";
type RecordData = {
  id: string;
  name?: string;
  title?: string;
  email?: string;
  role?: string;
  status?: string;
  version?: string;
  createdAt?: string;
  [key: string]: unknown;
};
export const adminSections = [
  {
    id: "updates",
    title: "App Updates",
    description: "Release notes & version history",
    icon: Sparkles,
  },
  {
    id: "announcements",
    title: "Announcements",
    description: "Keep your community in the loop",
    icon: Megaphone,
  },
  {
    id: "themes",
    title: "Global Themes",
    description: "Your brand, everywhere",
    icon: Palette,
  },
  {
    id: "features",
    title: "Feature Flags",
    description: "Control what’s available",
    icon: SlidersHorizontal,
  },
  {
    id: "users",
    title: "User Management",
    description: "Accounts, roles & permissions",
    icon: Users,
  },
  {
    id: "presets",
    title: "Preset Management",
    description: "Curate the creative library",
    icon: AudioLines,
  },
  {
    id: "feedback",
    title: "Feedback & Reports",
    description: "Listen. Learn. Make it better.",
    icon: MessageSquare,
  },
  {
    id: "audit-logs",
    title: "Audit Logs",
    description: "A transparent activity trail",
    icon: History,
  },
];
export async function adminRequest(
  section: string,
  data?: Record<string, unknown>,
) {
  const response = await fetch(
    `/api/admin/${section}`,
    data
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      : { cache: "no-store" },
  );
  const result = await response.json();
  if (!response.ok)
    throw new Error(result.error || "This action could not be completed.");
  return result;
}
export function AdminManager({ section }: { section: string }) {
  const { toast, refreshContent } = useApp();
  const [records, setRecords] = useState<RecordData[]>([]);
  const [builtins, setBuiltins] = useState<Preset[]>([]);
  const [actor, setActor] = useState<{ id: string; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [editor, setEditor] = useState<RecordData | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [archiving, setArchiving] = useState<RecordData | null>(null);
  const [details, setDetails] = useState<RecordData | null>(null);
  const load = useCallback(async () => {
    try {
      const data = await adminRequest(section);
      setRecords(data.records || []);
      setBuiltins(data.builtins || []);
      setActor(data.actor || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load this section.");
    } finally {
      setLoading(false);
    }
  }, [section]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
      setQuery("");
    }, 0);
    return () => clearTimeout(timer);
  }, [load]);
  const mutate = async (data: Record<string, unknown>) => {
    setBusy(true);
    try {
      await adminRequest(section, data);
      setEditor(null);
      setArchiving(null);
      await load();
      if (section === "themes") await refreshContent();
      toast(
        section === "themes"
          ? "Theme saved. Publish it to update the whole application."
          : "Changes saved securely.",
      );
    } catch (e) {
      toast(e instanceof Error ? e.message : "Action failed.", "error");
    } finally {
      setBusy(false);
    }
  };
  const title =
    adminSections.find((s) => s.id === section)?.title || "Management";
  const actionLabel =
    section === "themes"
      ? "New theme draft"
      : section === "presets"
        ? "Create preset"
        : section === "updates"
          ? "Create release"
          : "Create announcement";
  const canCreate = !["audit-logs", "users", "features"].includes(section);
  const filtered = records.filter((r) =>
    `${r.name || ""} ${r.title || ""} ${r.email || ""} ${r.version || ""}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  return (
    <>
      <PageHeading
        title={title}
        description={
          section === "audit-logs"
            ? "A permanent record of administrative actions. History cannot be edited or erased."
            : "A thoughtfully managed workspace starts behind the scenes."
        }
        actions={
          canCreate && (
            <Button variant="primary" onClick={() => setEditor("new")}>
              <Plus size={15} />
              {actionLabel}
            </Button>
          )
        }
      />
      {error && (
        <div className="inline-warning">
          {error}
          <button className="text-button" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}
      {section === "themes" ? (
        <ThemeManager
          records={records}
          onSave={(data) => void mutate(data)}
          busy={busy}
        />
      ) : (
        <>
          <div className="admin-section-toolbar">
            <div className="search-box">
              <Search size={15} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={`Search ${title.toLowerCase()}...`}
                aria-label={`Search ${title}`}
              />
            </div>
            <span className="muted small">
              {filtered.length} records
              {builtins.length ? ` · ${builtins.length} built-in presets` : ""}
            </span>
          </div>
          {loading ? (
            <div className="editor-loading">Loading secure records…</div>
          ) : section === "features" ? (
            <FeatureFlags
              records={records}
              onSave={(data) => void mutate(data)}
              busy={busy}
            />
          ) : filtered.length || builtins.length ? (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    {(section === "presets"
                      ? ["Preset", "Category", "Status", "Source", "Actions"]
                      : section === "audit-logs"
                        ? [
                            "Action",
                            "Administrator",
                            "Resource",
                            "Details",
                            "Date",
                          ]
                        : section === "feedback"
                          ? ["Report", "Category", "Status", "Date", "Actions"]
                          : section === "users"
                            ? ["User", "Role", "Status", "Joined", "Actions"]
                            : [
                                "Title",
                                "Status",
                                "Audience / Version",
                                "Created",
                                "Actions",
                              ]
                    ).map((h) => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {section === "presets" &&
                    builtins
                      .filter((p) =>
                        p.name.toLowerCase().includes(query.toLowerCase()),
                      )
                      .map((p) => (
                        <tr key={p.id}>
                          <td>
                            <strong>{p.name}</strong>
                            <small>{p.description}</small>
                          </td>
                          <td>{p.category}</td>
                          <td>
                            <span className="status-pill published">
                              Published
                            </span>
                          </td>
                          <td>Built-in</td>
                          <td>
                            <button
                              className="button"
                              style={{ fontSize: 9 }}
                              onClick={() => {
                                downloadBlob(
                                  new Blob([JSON.stringify(p, null, 2)], {
                                    type: "application/json",
                                  }),
                                  `${p.id}.json`,
                                );
                              }}
                            >
                              <Download size={12} />
                              Export
                            </button>
                          </td>
                        </tr>
                      ))}
                  {filtered.map((r) => (
                    <tr key={r.id}>
                      {section === "audit-logs" ? (
                        <>
                          <td>
                            <strong>{String(r.action)}</strong>
                            <small>{String(r.entityId || "")}</small>
                          </td>
                          <td>{String(r.actorId || "System").slice(0, 8)}</td>
                          <td>{String(r.entity)}</td>
                          <td>
                            <button
                              className="text-button"
                              onClick={() => setDetails(r)}
                            >
                              View details
                              <ArrowUpRight size={12} />
                            </button>
                          </td>
                          <td>
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleString()
                              : "—"}
                          </td>
                        </>
                      ) : section === "users" ? (
                        <>
                          <td>
                            <strong>{String(r.name)}</strong>
                            <small>{String(r.email)}</small>
                          </td>
                          <td>
                            <select
                              value={String(r.role)}
                              disabled={
                                busy ||
                                r.id === actor?.id ||
                                (r.role === "super_admin" &&
                                  actor?.role !== "super_admin")
                              }
                              aria-label={`Role for ${r.name}`}
                              onChange={(e) =>
                                void mutate({ id: r.id, role: e.target.value })
                              }
                            >
                              {[
                                "user",
                                "moderator",
                                "admin",
                                "super_admin",
                              ].map((role) => (
                                <option key={role} value={role}>
                                  {role.replace("_", " ")}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`status-pill ${r.status}`}>
                              {String(r.status)}
                            </span>
                          </td>
                          <td>
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <Button
                              style={{ fontSize: 9, minHeight: 28 }}
                              disabled={busy || r.id === actor?.id}
                              onClick={() =>
                                void mutate({
                                  id: r.id,
                                  status:
                                    r.status === "active"
                                      ? "suspended"
                                      : "active",
                                })
                              }
                            >
                              {r.status === "active" ? "Suspend" : "Reactivate"}
                            </Button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td>
                            <strong>
                              {String(
                                r.name ||
                                  r.title ||
                                  r.version ||
                                  r.message ||
                                  "Untitled",
                              )}
                            </strong>
                            <small>
                              {String(
                                r.description ||
                                  r.notes ||
                                  r.body ||
                                  r.email ||
                                  "",
                              ).slice(0, 160)}
                            </small>
                          </td>
                          <td>
                            {section === "presets" ? (
                              String(r.category || "Custom")
                            ) : section === "feedback" ? (
                              String(r.category)
                            ) : (
                              <span className={`status-pill ${r.status}`}>
                                {String(r.status)}
                              </span>
                            )}
                          </td>
                          <td>
                            {section === "updates" ? (
                              String(r.version)
                            ) : section === "announcements" ? (
                              <div>
                                <span>{String(r.audience)}</span>
                                {Boolean(r.pinned) && (
                                  <small>Pinned · {String(r.priority)}</small>
                                )}
                                {Boolean(r.publishAt) && (
                                  <small>
                                    Scheduled:{" "}
                                    {new Date(
                                      String(r.publishAt),
                                    ).toLocaleString()}
                                  </small>
                                )}
                              </div>
                            ) : section === "feedback" ? (
                              <span className={`status-pill ${r.status}`}>
                                {String(r.status)}
                              </span>
                            ) : (
                              <span className={`status-pill ${r.status}`}>
                                {String(r.status)}
                              </span>
                            )}
                          </td>
                          <td>
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString()
                              : "—"}
                          </td>
                          <td>
                            <div className="admin-table-actions">
                              <button
                                className="icon-button"
                                onClick={() => setEditor(r)}
                                aria-label={`Edit ${r.name || r.title}`}
                              >
                                <Pencil size={14} />
                              </button>
                              {section !== "feedback" && (
                                <button
                                  className="icon-button"
                                  onClick={() => setArchiving(r)}
                                  aria-label={`Archive ${r.name || r.title}`}
                                >
                                  <Archive size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && !builtins.length && (
                <EmptyState
                  compact
                  icon={section === "feedback" ? MessageSquare : History}
                  title={
                    section === "audit-logs"
                      ? "Your audit trail starts here."
                      : "No records yet"
                  }
                  description={
                    section === "audit-logs"
                      ? "Administrative changes will be securely recorded automatically."
                      : "Published content and new activity will appear here."
                  }
                />
              )}
            </div>
          ) : (
            <EmptyState
              icon={section === "feedback" ? MessageSquare : FileJson}
              title={
                section === "feedback"
                  ? "Listening for your next great idea."
                  : "A fresh start."
              }
              description={
                section === "feedback"
                  ? "Feedback submitted in Audio Studio will appear here securely."
                  : `Create your first ${section === "updates" ? "release" : section === "presets" ? "preset" : "announcement"} to get started.`
              }
            />
          )}
        </>
      )}
      {editor && (
        <RecordEditor
          section={section}
          record={editor === "new" ? null : editor}
          actor={actor}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={(data) => void mutate(data)}
        />
      )}
      {archiving && (
        <Modal
          title={`Archive ${archiving.name || archiving.title}?`}
          subtitle="The record will be preserved in history and removed from public content."
          onClose={() => setArchiving(null)}
        >
          <div className="dialog-actions">
            <Button onClick={() => setArchiving(null)}>Keep published</Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() =>
                void mutate({ id: archiving.id, action: "archive" })
              }
            >
              Archive record
            </Button>
          </div>
        </Modal>
      )}
      {details && (
        <Modal
          title="Audit event details"
          subtitle="Append-only administrative history"
          onClose={() => setDetails(null)}
          wide
        >
          <pre className="audit-details">
            {JSON.stringify(details, null, 2)}
          </pre>
          <div className="dialog-actions">
            <Button onClick={() => setDetails(null)}>Close details</Button>
          </div>
        </Modal>
      )}
    </>
  );
}
function RecordEditor({
  section,
  record,
  actor,
  busy,
  onClose,
  onSave,
}: {
  section: string;
  record: RecordData | null;
  actor: { id: string; role: string } | null;
  busy: boolean;
  onClose: () => void;
  onSave: (data: Record<string, unknown>) => void;
}) {
  const defaults: Record<string, unknown> = {
    title: "",
    name: "",
    description: "",
    body: "",
    notes: "",
    version: "1.0.0",
    releaseDate: new Date().toISOString().slice(0, 10),
    minimumVersion: "1.0.0",
    updateUrl: "",
    features: [],
    fixes: [],
    improvements: [],
    audience: "all",
    priority: "normal",
    pinned: false,
    status: "draft",
    publishAt: "",
    expiresAt: "",
    category: "Custom",
    config: {
      version: 1,
      settings: {
        mode: "spectrum",
        color: "#C77DFF",
        secondaryColor: "#FF9BD2",
        background: "#0B0714",
        intensity: 0.75,
        speed: 1,
        sensitivity: 1,
        glow: 0.65,
        rotation: 0.3,
        particleCount: 2200,
        fftSize: 2048,
        smoothing: 0.75,
        attack: 0.65,
        release: 0.15,
        bassRange: [20, 250],
        midRange: [250, 4000],
        trebleRange: [4000, 16000],
        frequencyGain: 1,
        quality: "high",
        aspectRatio: "16:9",
        resolution: 1080,
      },
      layers: [],
    },
    thumbnail: "",
  };
  const [values, setValues] = useState<Record<string, unknown>>(() => ({
    ...defaults,
    ...record,
    action: record ? "update" : "create",
  }));
  const [error, setError] = useState("");
  const patch = (key: string, value: unknown) =>
    setValues((v) => ({ ...v, [key]: value }));
  const text = (
    key: string,
    label: string,
    type = "text",
    required = false,
  ) => (
    <label className="field-group">
      <span>{label}</span>
      <input
        className="field-input"
        type={type}
        value={String(values[key] || "")}
        required={required}
        maxLength={type === "datetime-local" ? 50 : 200}
        onChange={(e) => patch(key, e.target.value)}
      />
    </label>
  );
  async function importPreset(file?: File) {
    if (!file) return;
    try {
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Preset file must be under 15 MB.");
      const parsed = presetImportSchema.parse(JSON.parse(await file.text()));
      setValues((v) => ({
        ...v,
        name: parsed.name,
        description: parsed.description || "",
        category: parsed.category || "Custom",
        config: parsed.config,
      }));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid preset.");
    }
  }
  return (
    <Modal
      title={`${record ? "Edit" : "Create"} ${section === "updates" ? "release" : section === "presets" ? "preset" : section === "themes" ? "theme" : "announcement"}`}
      subtitle="Changes are validated on the server and recorded in the audit trail."
      onClose={onClose}
      wide
    >
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          const data = { ...values };
          if (section === "announcements") {
            if (data.publishAt)
              data.publishAt = new Date(String(data.publishAt)).toISOString();
            if (data.expiresAt)
              data.expiresAt = new Date(String(data.expiresAt)).toISOString();
          }
          onSave(data);
        }}
      >
        <div className="editor-form-grid">
          {section === "updates" ? (
            <>
              {text("version", "Version", "text", true)}
              {text("releaseDate", "Release date", "date", true)}
              {text("title", "Update title", "text", true).props.children ? (
                <label className="field-group full-span">
                  <span>Update title</span>
                  <input
                    className="field-input"
                    required
                    value={String(values.title || "")}
                    onChange={(e) => patch("title", e.target.value)}
                  />
                </label>
              ) : null}
              <label className="field-group full-span">
                <span>Release notes</span>
                <textarea
                  className="field-input"
                  rows={3}
                  value={String(values.notes || "")}
                  onChange={(e) => patch("notes", e.target.value)}
                />
              </label>
              {(["features", "fixes", "improvements"] as const).map((key) => (
                <label className="field-group full-span" key={key}>
                  <span>
                    {key[0].toUpperCase() + key.slice(1)} · one item per line
                  </span>
                  <textarea
                    className="field-input"
                    rows={3}
                    value={
                      Array.isArray(values[key])
                        ? (values[key] as string[]).join("\n")
                        : ""
                    }
                    onChange={(e) =>
                      patch(key, e.target.value.split("\n").filter(Boolean))
                    }
                  />
                </label>
              ))}
              {text("minimumVersion", "Minimum supported version")}
              {text("updateUrl", "Update URL (optional)", "url")}
            </>
          ) : section === "presets" ? (
            <>
              <label className="field-group full-span">
                <span>Preset name</span>
                <input
                  className="field-input"
                  required
                  value={String(values.name || "")}
                  onChange={(e) => patch("name", e.target.value)}
                />
              </label>
              <label className="field-group full-span">
                <span>Description</span>
                <textarea
                  className="field-input"
                  rows={2}
                  value={String(values.description || "")}
                  onChange={(e) => patch("description", e.target.value)}
                />
              </label>
              {text("category", "Category")}
              <label className="field-group">
                <span>Thumbnail image</span>
                <input
                  className="field-input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                      setError("Thumbnail must be under 2 MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => patch("thumbnail", reader.result);
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <label className="field-group">
                <span>Import validated preset JSON</span>
                <input
                  className="field-input"
                  type="file"
                  accept=".json"
                  onChange={(e) => void importPreset(e.target.files?.[0])}
                />
              </label>
              <p className="track-analysis-note full-span">
                Layer count:{" "}
                {Array.isArray(
                  (values.config as { layers?: unknown[] })?.layers,
                )
                  ? (values.config as { layers: unknown[] }).layers.length
                  : 0}
                . Import a KAZU preset to configure visualizer settings and
                layers. No executable code is loaded.
              </p>
            </>
          ) : (
            <>
              {text("title", "Announcement title", "text", true)}
              <label className="field-group full-span">
                <span>Message</span>
                <textarea
                  className="field-input"
                  rows={4}
                  required
                  value={String(values.body || "")}
                  onChange={(e) => patch("body", e.target.value)}
                />
              </label>
              <label className="field-group">
                <span>Audience</span>
                <select
                  className="field-input"
                  value={String(values.audience)}
                  onChange={(e) => patch("audience", e.target.value)}
                >
                  <option value="all">Everyone</option>
                  <option value="signed-in">Signed-in users</option>
                  <option value="administrators">Administrators</option>
                </select>
              </label>
              <label className="field-group">
                <span>Priority</span>
                <select
                  className="field-input"
                  value={String(values.priority)}
                  onChange={(e) => patch("priority", e.target.value)}
                >
                  <option value="normal">Normal</option>
                  <option value="important">Important</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </label>
              {text(
                "publishAt",
                "Scheduled publish (optional)",
                "datetime-local",
              )}
              {text("expiresAt", "Expiration (optional)", "datetime-local")}
              <label className="theme-toggle-row full-span">
                Pin announcement
                <input
                  type="checkbox"
                  checked={Boolean(values.pinned)}
                  onChange={(e) => patch("pinned", e.target.checked)}
                />
              </label>
            </>
          )}
          <label className="field-group full-span">
            <span>Status</span>
            <select
              className="field-input"
              value={String(values.status)}
              onChange={(e) => patch("status", e.target.value)}
            >
              <option value="draft">Draft</option>
              {section === "announcements" && (
                <option value="scheduled">Schedule</option>
              )}
              <option value="published">Published</option>
              {record && <option value="archived">Archived</option>}
            </select>
          </label>
        </div>
        {error && <p className="form-error">{error}</p>}
        <div className="dialog-actions">
          <Button type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={busy}>
            <Save size={15} />
            Save {section === "themes" ? "theme" : "changes"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
function FeatureFlags({
  records,
  onSave,
  busy,
}: {
  records: RecordData[];
  onSave: (data: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const descriptions: Record<string, string> = {
    audio_studio: "The creative studio dashboard and editor.",
    visualizer_modules:
      "Canvas-based audio visualizers and the preset library.",
    engine_3d:
      "Three.js / WebGL scenes. Canvas 2D remains available as a fallback.",
    video_export: "Music video recording and export activity.",
    experimental_features: "New and experimental creative tools.",
  };
  return (
    <>
      <div className="admin-gated-note">
        Feature flags control application access. Server-protected actions
        reject disabled features. 3D and video export also check browser
        capabilities and use graceful fallbacks.
      </div>
      {records.map((r) => (
        <div key={r.id} className="feature-flag-row">
          <span className="feature-flag-icon">
            <SlidersHorizontal size={21} />
          </span>
          <div>
            <h3>{String(r.name)}</h3>
            <p>
              {String(
                r.description ||
                  descriptions[String(r.key)] ||
                  "Module availability",
              )}
            </p>
            <code>{String(r.key)}</code>
          </div>
          <span
            className={`status-pill ${r.enabled ? "published" : "archived"}`}
          >
            {r.enabled ? "Enabled" : "Disabled"}
          </span>
          <input
            type="checkbox"
            checked={Boolean(r.enabled)}
            disabled={busy}
            aria-label={`Enable ${r.name}`}
            onChange={(e) =>
              onSave({ action: "update", ...r, enabled: e.target.checked })
            }
          />
        </div>
      ))}
    </>
  );
}
function ThemeManager({
  records,
  onSave,
  busy,
}: {
  records: RecordData[];
  onSave: (data: Record<string, unknown>) => void;
  busy: boolean;
}) {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [name, setName] = useState("Sakura Studio");
  const [status, setStatus] = useState("draft");
  const [editing, setEditing] = useState<RecordData | null>(null);
  const { setTheme: applyTheme, theme: currentTheme } = useApp();
  const patch = (key: keyof ThemeConfig, value: string | number | boolean) =>
    setTheme((t) => ({ ...t, [key]: value }));
  const style = {
    "--theme-bg": theme.background,
    "--theme-surface": theme.surface,
    "--theme-primary": theme.primary,
    "--theme-secondary": theme.secondary,
    "--theme-text": theme.text,
    "--theme-border": theme.border,
    "--theme-radius": `${theme.radius}px`,
  } as React.CSSProperties;
  return (
    <>
      <div className="admin-gated-note">
        Preview safely before publishing. A published theme updates the entire
        KAZU application, including navigation, studio, dialogs, and admin.
        Previous versions remain in theme history.
      </div>
      <div className="theme-preview-grid">
        <div className="theme-preview-card">
          <span>LIVE APPLICATION THEME</span>
          <h3>Make something that moves you.</h3>
          <p>Your sound, reimagined. A creative space that feels like you.</p>
          <div className="theme-preview-buttons">
            <button className="button" onClick={() => applyTheme(currentTheme)}>
              Create something
            </button>
            <button className="button">Explore</button>
          </div>
        </div>
        <div className="theme-preview-card" style={style}>
          <span>YOUR THEME PREVIEW</span>
          <h3>Make something that moves you.</h3>
          <p>Your sound, reimagined. A creative space that feels like you.</p>
          <div className="theme-preview-buttons">
            <button className="button" onClick={() => applyTheme(theme)}>
              Preview globally
            </button>
            <button className="button" onClick={() => setTheme(DEFAULT_THEME)}>
              Reset
            </button>
          </div>
        </div>
      </div>
      <div className="editor-form-grid" style={{ marginTop: 25 }}>
        <label className="field-group">
          <span>Theme name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
          />
        </label>
        <label className="field-group">
          <span>Save as</span>
          <select
            className="field-input"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="draft">Draft</option>
            <option value="published">Publish globally</option>
          </select>
        </label>
        <div className="theme-color-grid full-span">
          {(
            [
              ["background", "Background"],
              ["surface", "Surface"],
              ["primary", "Primary accent"],
              ["secondary", "Secondary accent"],
              ["text", "Text"],
              ["border", "Border"],
            ] as [keyof ThemeConfig, string][]
          ).map(([key, label]) => (
            <label className="field-group" key={key}>
              <span>{label}</span>
              <div className="color-input-inline">
                <input
                  type="color"
                  value={theme[key] as string}
                  onChange={(e) => patch(key, e.target.value)}
                  aria-label={label}
                />
                <input
                  key={`${key}-${theme[key]}`}
                  type="text"
                  defaultValue={theme[key] as string}
                  maxLength={7}
                  onBlur={(e) => {
                    if (/^#[0-9a-f]{6}$/i.test(e.target.value))
                      patch(key, e.target.value);
                  }}
                />
              </div>
            </label>
          ))}
        </div>
        <label className="field-group full-span">
          <span>Typography</span>
          <select
            className="field-input"
            value={theme.font}
            onChange={(e) => patch("font", e.target.value)}
          >
            <option value="Inter, system-ui, sans-serif">
              Inter · Modern & clean
            </option>
            <option value="Georgia, serif">Georgia · Editorial</option>
            <option value="monospace">Monospace · Technical</option>
          </select>
        </label>
        <label className="slider-field full-span">
          <span>
            Corner radius<small>{theme.radius}px</small>
          </span>
          <input
            type="range"
            min={0}
            max={32}
            value={theme.radius}
            onChange={(e) => patch("radius", Number(e.target.value))}
          />
        </label>
        <label className="slider-field full-span">
          <span>
            Glow intensity<small>{Math.round(theme.glow * 100)}%</small>
          </span>
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={theme.glow}
            onChange={(e) => patch("glow", Number(e.target.value))}
          />
        </label>
        <label className="theme-toggle-row full-span">
          Cinematic animations
          <input
            type="checkbox"
            checked={theme.animations}
            onChange={(e) => patch("animations", e.target.checked)}
          />
        </label>
      </div>
      <div className="dialog-actions">
        <Button onClick={() => applyTheme(DEFAULT_THEME)}>
          <RotateCcw size={14} />
          Restore Sakura defaults
        </Button>
        <Button
          variant="primary"
          loading={busy}
          onClick={() =>
            onSave({
              action: editing ? "update" : "create",
              id: editing?.id,
              name,
              status,
              config: theme,
            })
          }
        >
          <Save size={15} />
          {status === "published"
            ? "Publish theme globally"
            : "Save theme draft"}
        </Button>
      </div>
      <div className="theme-history">
        <strong>Theme version history</strong>
        {records.map((r) => (
          <div className="release-list-row" key={r.id}>
            <span>
              <Palette size={18} />
            </span>
            <div>
              <strong>
                {String(r.name)} · v{String(r.version || 1)}
              </strong>
              <p>{new Date(String(r.createdAt)).toLocaleString()}</p>
            </div>
            <small>{String(r.status)}</small>
            <button
              className="text-button"
              onClick={() => {
                setEditing(r);
                setTheme({ ...DEFAULT_THEME, ...(r.config as ThemeConfig) });
                setName(String(r.name));
                setStatus("draft");
              }}
            >
              Restore as draft
            </button>
          </div>
        ))}
        {!records.length && (
          <p style={{ marginTop: 12 }}>
            Your published theme versions will appear here.
          </p>
        )}
      </div>
    </>
  );
}
