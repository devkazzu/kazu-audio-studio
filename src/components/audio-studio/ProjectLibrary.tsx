"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen,
  Plus,
  Upload,
  Search,
  ArrowUpRight,
  MoreHorizontal,
  Download,
  Copy,
  Trash2,
  ShieldCheck,
  HardDrive,
  ArrowRight,
  SlidersHorizontal,
  FileJson,
  Video,
  Play,
  X,
} from "lucide-react";
import {
  Button,
  PageHeading,
  EmptyState,
  Modal,
  ConfirmDialog,
} from "@/components/ui";
import { useApp } from "@/components/providers";
import {
  getProjects,
  getExports,
  saveProject,
  deleteProject,
  getExport,
  deleteExport,
  downloadBlob,
} from "@/lib/audio-studio/project-storage";
import {
  uid,
  formatTime,
  type ProjectSummary,
  type ExportSummary,
  type LocalProject,
} from "@/lib/audio-studio/types";
export function ProjectLibrary() {
  const router = useRouter();
  const { toast } = useApp();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("updated");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [usage, setUsage] = useState(0);
  const [quota, setQuota] = useState(1000000000);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("Untitled project");
  const reload = () =>
    void getProjects()
      .then(setProjects)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  useEffect(() => {
    void reload();
    void navigator.storage?.estimate().then((estimate) => {
      if (estimate?.usage) setUsage(estimate.usage);
      if (estimate?.quota) setQuota(estimate.quota);
    });
  }, []);
  async function create(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const { defaultSettings, createLayers } =
        await import("@/lib/audio-studio/presets");
      const settings = defaultSettings();
      const project: LocalProject = {
        id: uid(),
        name: name.trim(),
        config: { version: 1, settings, layers: createLayers(settings) },
        thumbnail: "/images/studio-hero.jpg",
        audio: null,
        audioName: "",
        duration: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      router.push(`/audio-studio/editor?project=${project.id}`);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not create project.",
        "error",
      );
    } finally {
      setBusy(false);
    }
  }
  async function duplicate(project: ProjectSummary) {
    setMenu(null);
    try {
      const { getProject } = await import("@/lib/audio-studio/project-storage");
      const original = await getProject(project.id);
      if (!original) throw new Error("Project not found on this device.");
      const next = {
        ...original,
        id: uid(),
        name: `${original.name} — Copy`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(next);
      await reload();
      toast("Project duplicated.");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not duplicate project.",
        "error",
      );
    }
  }
  async function backup(project: ProjectSummary) {
    setMenu(null);
    try {
      const { getProject } = await import("@/lib/audio-studio/project-storage");
      const record = await getProject(project.id);
      if (!record) throw new Error("Project not found.");
      downloadBlob(
        new Blob(
          [
            JSON.stringify(
              {
                format: "kazu-audio-studio",
                version: 1,
                name: record.name,
                config: record.config,
                audioReference: record.audioName,
              },
              null,
              2,
            ),
          ],
          { type: "application/json" },
        ),
        `${project.name}.kazu.json`,
      );
      toast("Project backup exported. Audio stays on your device.");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not export project.",
        "error",
      );
    }
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Project files must be under 20 MB.");
      const { configSchema } = await import("@/lib/audio-studio/presets");
      const parsed = JSON.parse(await file.text());
      const config = configSchema.parse(parsed.config);
      const project: LocalProject = {
        id: uid(),
        name: String(parsed.name || "Imported project").slice(0, 100),
        config,
        thumbnail: "/images/studio-hero.jpg",
        audio: null,
        audioName: "",
        duration: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(project);
      router.push(`/audio-studio/editor?project=${project.id}`);
      toast("Project imported. Import its audio file to restore playback.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invalid project file.", "error");
    }
  }
  const filtered = projects
    .filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name)
        : b.updatedAt - a.updatedAt,
    );
  return (
    <>
      <PageHeading
        title="Your ideas, in motion."
        description="Every project is a new possibility. Pick up where you left off."
        actions={
          <>
            <Button onClick={() => setCreating(true)}>
              <Plus size={15} />
              New Project
            </Button>
            <label className="button primary">
              <Upload size={15} />
              Import Audio
              <input
                type="file"
                accept="audio/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  try {
                    const { defaultSettings, createLayers } =
                      await import("@/lib/audio-studio/presets");
                    const settings = defaultSettings();
                    const project: LocalProject = {
                      id: uid(),
                      name: file.name.replace(/\.[^.]+$/, ""),
                      config: {
                        version: 1,
                        settings,
                        layers: createLayers(settings),
                      },
                      thumbnail: "/images/studio-hero.jpg",
                      audio: file,
                      audioName: file.name,
                      duration: 0,
                      createdAt: Date.now(),
                      updatedAt: Date.now(),
                    };
                    await saveProject(project);
                    router.push(`/audio-studio/editor?project=${project.id}`);
                  } catch (error) {
                    toast(
                      error instanceof Error ? error.message : "Import failed.",
                      "error",
                    );
                  }
                }}
              />
            </label>
          </>
        }
      />
      <div className="project-info-strip">
        <span>
          <ShieldCheck size={14} />
          Private by default. Stored on this device.
        </span>
        <span>
          <FolderOpen size={13} />
          {projects.length} projects
        </span>
        <span className="storage-usage">
          <HardDrive size={13} />
          {(usage / 1024 / 1024).toFixed(1)} MB used
          <div className="storage-bar">
            <i
              style={{
                width: `${Math.min(100, (usage / quota) * 100)}%`,
              }}
            />
          </div>
        </span>
      </div>
      {error && <div className="inline-warning">{error}</div>}
      <div className="projects-toolbar">
        <div className="search-box">
          <Search size={15} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your projects..."
            aria-label="Search projects"
          />
        </div>
        <div className="toolbar-group">
          <select
            className="field-input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sort projects"
          >
            <option value="updated">Last edited</option>
            <option value="name">Name A–Z</option>
          </select>
          <Button onClick={() => importProjectFile()}>
            <FileJson size={14} />
            Import project
          </Button>
        </div>
      </div>
      {loading ? (
        <div className="editor-loading">Opening your projects…</div>
      ) : filtered.length ? (
        <div className="project-grid">
          {filtered.map((p) => (
            <article key={p.id} className="project-card">
              <button
                className="project-card-preview"
                onClick={() =>
                  router.push(`/audio-studio/editor?project=${p.id}`)
                }
              >
                <img
                  src={p.thumbnail || "/images/studio-hero.jpg"}
                  alt={`${p.name} preview`}
                />
                <span>
                  {p.config.settings.aspectRatio} · {p.config.settings.mode}
                </span>
              </button>
              <div className="project-card-info">
                <h3>{p.name}</h3>
                <p>{p.audioName || "Add a sound to get started"}</p>
                <div className="project-card-footer">
                  <span>
                    {now - p.updatedAt < 86400000
                      ? "Edited today"
                      : `Edited ${new Date(p.updatedAt).toLocaleDateString()}`}
                  </span>
                  <div>
                    <button
                      className="icon-button"
                      onClick={() => setMenu(menu === p.id ? null : p.id)}
                      aria-label={`Actions for ${p.name}`}
                    >
                      <MoreHorizontal size={17} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() =>
                        router.push(`/audio-studio/editor?project=${p.id}`)
                      }
                      aria-label={`Open ${p.name}`}
                    >
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                </div>
              </div>
              {menu === p.id && (
                <div className="project-card-menu">
                  <button onClick={() => void backup(p)}>
                    <Download size={13} />
                    Export backup
                  </button>
                  <button onClick={() => void duplicate(p)}>
                    <Copy size={13} />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      setMenu(null);
                      setDeleting(p);
                    }}
                  >
                    <Trash2 size={13} />
                    Delete project
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={query ? Search : FolderOpen}
          title={
            query ? "No projects found" : "Your first masterpiece starts here."
          }
          description={
            query
              ? "Try a different project name."
              : "Start with a sound and a spark of inspiration. Your projects are saved privately in this browser."
          }
          action={query ? "Clear search" : "Create your first project"}
          onAction={() => (query ? setQuery("") : setCreating(true))}
        />
      )}
      {creating && (
        <Modal
          title="A new idea starts here"
          subtitle="Give your project a name. The rest is up to you."
          onClose={() => setCreating(false)}
        >
          <form className="form-stack" onSubmit={create}>
            <label>
              Project name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
              />
            </label>
            <Button variant="primary" loading={busy} type="submit">
              Create project
              <ArrowRight size={15} />
            </Button>
          </form>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          message="This permanently removes this project and its local audio. Export a backup first if you want to keep a copy."
          onClose={() => setDeleting(null)}
          loading={busy}
          onConfirm={() => {
            setBusy(true);
            void deleteProject(deleting.id)
              .then(() => {
                setDeleting(null);
                toast("Project deleted from this device.");
                void reload();
              })
              .catch((e) => toast(e.message, "error"))
              .finally(() => setBusy(false));
          }}
        />
      )}
    </>
  );
  function importProjectFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => void importProject(input.files?.[0]);
    input.click();
  }
}
export function ExportHistory() {
  const router = useRouter();
  const { toast } = useApp();
  const [exports, setExports] = useState<ExportSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<ExportSummary | null>(null);
  const [url, setVideoUrl] = useState("");
  const videoUrl = preview ? url : "";
  const [deleting, setDeleting] = useState<ExportSummary | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    void getExports()
      .then(setExports)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    let disposed = false;
    let url = "";
    const selected = preview;
    if (!selected) return;
    void getExport(selected.id)
      .then((data) => {
        if (!data || !selected || disposed) return;
        url = URL.createObjectURL(data.blob);
        setVideoUrl(url);
      })
      .catch((e) => toast(e.message, "error"));
    return () => {
      disposed = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [preview, toast]);
  async function download(record: ExportSummary) {
    try {
      const full = await getExport(record.id);
      if (!full) throw new Error("Video not found on this device.");
      downloadBlob(
        full.blob,
        `${record.name}.${record.mimeType.includes("mp4") ? "mp4" : "webm"}`,
      );
      toast("Your video is downloading.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Download failed.", "error");
    }
  }
  return (
    <>
      <PageHeading
        title="Made by you. Ready to share."
        description="Your exported music videos, saved right here on your device."
        actions={
          <button
            className="button primary"
            onClick={() => router.push("/audio-studio/editor")}
          >
            <Plus size={15} />
            Create a video
          </button>
        }
      />
      {error && <div className="inline-warning">{error}</div>}
      {loading ? (
        <div className="editor-loading">Loading your video library…</div>
      ) : exports.length ? (
        <div className="export-history-grid">
          {exports
            .sort((a, b) => b.createdAt - a.createdAt)
            .map((e) => (
              <article className="export-card" key={e.id}>
                <div className="export-thumbnail">
                  {e.thumbnail && <img src={e.thumbnail} alt={e.name} />}
                  <span className="export-format">
                    {e.mimeType.includes("mp4") ? "MP4" : "WEBM"}
                  </span>
                  <button
                    onClick={() => setPreview(e)}
                    aria-label={`Play ${e.name}`}
                  >
                    <Play size={17} fill="currentColor" />
                  </button>
                </div>
                <div className="export-card-info">
                  <h3>{e.name}</h3>
                  <div className="export-card-meta">
                    <span>
                      {e.width} × {e.height}
                    </span>
                    <span>{formatTime(e.duration)}</span>
                    <span>{(e.size / 1024 / 1024).toFixed(1)} MB</span>
                    <span>{new Date(e.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="export-card-actions">
                    <Button onClick={() => setPreview(e)}>
                      <Play size={13} />
                      Preview
                    </Button>
                    <Button variant="primary" onClick={() => void download(e)}>
                      <Download size={13} />
                      Download
                    </Button>
                    <button
                      className="icon-button"
                      onClick={() => setDeleting(e)}
                      aria-label={`Delete ${e.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
        </div>
      ) : (
        <EmptyState
          icon={Video}
          title="The world is waiting to see what you create."
          description="Open the studio, import your sound, and export your first music video. Your finished videos will appear here."
          action="Create your first video"
          onAction={() => router.push("/audio-studio/editor")}
        />
      )}
      {preview && (
        <Modal
          title={preview.name}
          subtitle={`${preview.width} × ${preview.height} · ${formatTime(preview.duration)}`}
          onClose={() => setPreview(null)}
          wide
        >
          {videoUrl ? (
            <video
              className="export-video-player"
              src={videoUrl}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <div className="editor-loading">Loading video…</div>
          )}
          <div className="dialog-actions">
            <Button onClick={() => setPreview(null)}>Close</Button>
            <Button variant="primary" onClick={() => void download(preview)}>
              <Download size={15} />
              Download video
            </Button>
          </div>
        </Modal>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this video?"
          message="This removes the video from this browser. Download a copy first if you want to keep it."
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            void deleteExport(deleting.id)
              .then(() => {
                setExports((items) =>
                  items.filter((e) => e.id !== deleting.id),
                );
                setDeleting(null);
                toast("Video deleted from this device.");
              })
              .catch((e) => toast(e.message, "error"));
          }}
        />
      )}
    </>
  );
}
