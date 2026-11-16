"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Upload,
  ArrowUpRight,
  ArrowRight,
  Sparkles,
  FolderOpen,
  AudioLines,
  Download,
  Layers3,
  Play,
  WandSparkles,
  SlidersHorizontal,
  Clock3,
  ChevronRight,
  Box,
  ShieldCheck,
  Zap,
  Check,
  FileAudio,
  MonitorPlay,
} from "lucide-react";
import { Button, PageHeading, Modal, EmptyState } from "@/components/ui";
import { PresetCard, PresetPreview } from "./PresetGallery";
import { useApp } from "@/components/providers";
import {
  BUILTIN_PRESETS,
  configFromPreset,
  defaultSettings,
  createLayers,
} from "@/lib/audio-studio/presets";
import {
  getProjects,
  getExports,
  saveProject,
} from "@/lib/audio-studio/project-storage";
import {
  uid,
  formatTime,
  type Preset,
  type ProjectSummary,
  type ExportSummary,
  type AspectRatio,
  type LocalProject,
} from "@/lib/audio-studio/types";
export function StudioDashboard() {
  const router = useRouter();
  const { content, user, toast } = useApp();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [exports, setExports] = useState<ExportSummary[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [preview, setPreview] = useState<Preset | null>(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("Untitled project");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    void getProjects()
      .then(setProjects)
      .catch((e) => setStorageError(e.message));
    void getExports()
      .then(setExports)
      .catch((e) => setStorageError(e.message));
  }, []);
  const presets = content.presets.length ? content.presets : BUILTIN_PRESETS;
  const featured = presets.filter((p) => p.featured).slice(0, 4);
  const featuredList = featured.length ? featured : presets.slice(0, 4);
  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const settings = { ...defaultSettings(), aspectRatio: aspect };
      const project: LocalProject = {
        id: uid(),
        name: name.trim() || "Untitled project",
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
      setError(e instanceof Error ? e.message : "Could not create project.");
    } finally {
      setBusy(false);
    }
  }
  async function importAudio(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const project: LocalProject = {
        id: uid(),
        name: file.name.replace(/\.[^.]+$/, ""),
        config: {
          version: 1,
          settings: defaultSettings(),
          layers: createLayers(defaultSettings()),
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
      toast("Audio imported locally. Let’s give it a new dimension.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import audio.");
      toast(error, "error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <PageHeading
        title={`Welcome${user ? ` back, ${user.name.split(" ")[0]}` : " to your creative space"}.`}
        description="A little sound. A whole new dimension."
        actions={
          <>
            <Button
              onClick={() => {
                setError("");
                setCreateOpen(true);
              }}
            >
              <Plus size={16} />
              Create New Project
            </Button>
            <label
              className={`button primary import-button ${busy ? "disabled" : ""}`}
            >
              <Upload size={16} />
              Import Audio
              <input
                type="file"
                accept="audio/*,.mp3,.wav,.ogg,.m4a,.flac"
                onChange={(e) => void importAudio(e.target.files?.[0])}
                disabled={busy}
              />
            </label>
          </>
        }
      />
      {error && !createOpen && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {storageError && <div className="inline-warning">{storageError}</div>}
      <section className="dashboard-hero">
        <img
          className="hero-art"
          src="/images/studio-hero.jpg"
          alt="Luminous violet and pink audio-reactive particle rings"
          fetchPriority="high"
        />
        <div className="hero-overlay" />
        <div className="hero-copy">
          <span className="hero-eyebrow">
            <span />
            YOUR SOUND. REIMAGINED.
          </span>
          <h2>
            Give your music
            <br />a new dimension.
          </h2>
          <p>
            Turn every beat into a visual masterpiece.
            <br />
            Create, customize, and share your sound.
          </p>
          <div className="hero-actions">
            <Button
              variant="primary"
              onClick={() => router.push("/audio-studio/editor")}
            >
              <WandSparkles size={16} />
              Open Studio
              <ArrowUpRight size={16} />
            </Button>
            <button
              className="hero-template-link"
              onClick={() => router.push("/audio-studio/templates")}
            >
              Explore templates
              <ArrowRight size={14} />
            </button>
          </div>
          <div className="hero-note">
            <ShieldCheck size={12} />
            Your audio stays on your device.
          </div>
        </div>
        <div className="hero-corner-tag">
          <Sparkles size={12} />
          BUILT FOR YOUR IMAGINATION
        </div>
        <div className="hero-bottom-label">
          <span className="live-dot" />
          AUDIO REACTIVE. ALWAYS.
        </div>
      </section>
      <section className="stats-grid" aria-label="Your studio statistics">
        <StatCard
          icon={FolderOpen}
          label="Your Projects"
          value={projects.length}
          detail="Ideas brought to life"
          href="/audio-studio/projects"
          color="violet"
        />
        <StatCard
          icon={Layers3}
          label="Visualizer Modes"
          value="15"
          detail="Endless creative possibilities"
          href="/audio-studio/visualizers"
          color="pink"
        />
        <StatCard
          icon={SlidersHorizontal}
          label="Curated Presets"
          value={presets.length}
          detail="Find your signature style"
          href="/audio-studio/presets"
          color="blue"
        />
        <StatCard
          icon={Download}
          label="Videos Exported"
          value={exports.length}
          detail="Ready for the world"
          href="/audio-studio/export-history"
          color="orange"
        />
      </section>
      <section className="featured-section">
        <div className="section-heading">
          <div>
            <h2>
              Find your inspiration<span className="section-spark">✦</span>
            </h2>
            <p>A few favorites to get your creativity flowing.</p>
          </div>
          <button
            className="text-button"
            onClick={() => router.push("/audio-studio/templates")}
          >
            View all templates
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="featured-tabs">
          <button className="active">
            Featured presets<span>{featuredList.length}</span>
          </button>
          <button
            onClick={() => router.push("/audio-studio/templates?category=3D")}
          >
            3D Experiences
            <Box size={12} />
          </button>
          <button
            onClick={() =>
              router.push("/audio-studio/templates?category=Particles")
            }
          >
            Particles & Space
            <Sparkles size={12} />
          </button>
          <button
            onClick={() =>
              router.push("/audio-studio/templates?category=Liquid")
            }
          >
            Liquid & Motion
            <AudioLines size={12} />
          </button>
        </div>
        <div className="featured-grid">
          {featuredList.map((p) => (
            <PresetCard key={p.id} preset={p} onPreview={setPreview} />
          ))}
        </div>
      </section>
      <section className="dashboard-bottom-grid">
        <div className="recent-projects">
          <div className="section-heading">
            <div>
              <h2>Pick up where you left off</h2>
              <p>Your recent projects, ready for their next chapter.</p>
            </div>
            <button
              className="text-button"
              onClick={() => router.push("/audio-studio/projects")}
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          {projects.length ? (
            <div className="recent-project-list">
              {projects
                .sort((a, b) => b.updatedAt - a.updatedAt)
                .slice(0, 3)
                .map((p) => (
                  <button
                    key={p.id}
                    className="recent-project-row"
                    onClick={() =>
                      router.push(`/audio-studio/editor?project=${p.id}`)
                    }
                  >
                    <img
                      src={p.thumbnail || "/images/studio-hero.jpg"}
                      alt=""
                    />
                    <span>
                      <strong>{p.name}</strong>
                      <small>{p.audioName || "No audio imported"}</small>
                    </span>
                    <time>
                      {now - p.updatedAt < 86400000
                        ? "Today"
                        : new Date(p.updatedAt).toLocaleDateString()}
                    </time>
                    <ArrowUpRight size={17} />
                  </button>
                ))}
            </div>
          ) : (
            <div className="recent-empty">
              <div className="recent-empty-art">
                <FolderOpen size={27} strokeWidth={1.3} />
                <span>+</span>
              </div>
              <div>
                <h3>Your first masterpiece starts here.</h3>
                <p>Create a project. Add your sound. Make it yours.</p>
              </div>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                New project
              </Button>
            </div>
          )}
        </div>
        <div className="quick-start">
          <div className="section-heading">
            <div>
              <h2>Jump right in</h2>
              <p>Less setup. More creating.</p>
            </div>
            <Zap size={17} className="muted" />
          </div>
          <div className="quick-start-grid">
            <button onClick={() => setCreateOpen(true)}>
              <span className="quick-icon violet">
                <Plus size={18} />
              </span>
              <span>Start from scratch</span>
              <ArrowUpRight size={14} />
            </button>
            <button
              onClick={() =>
                document.getElementById("dashboard-audio")?.click()
              }
            >
              <span className="quick-icon pink">
                <Upload size={17} />
              </span>
              <span>Import a track</span>
              <ArrowUpRight size={14} />
            </button>
            <button onClick={() => router.push("/audio-studio/templates")}>
              <span className="quick-icon blue">
                <Play size={17} />
              </span>
              <span>Try a template</span>
              <ArrowUpRight size={14} />
            </button>
            <button onClick={() => router.push("/audio-studio/visualizers")}>
              <span className="quick-icon orange">
                <Sparkles size={17} />
              </span>
              <span>Explore visualizers</span>
              <ArrowUpRight size={14} />
            </button>
          </div>
        </div>
      </section>
      <section className="export-section">
        <div className="section-heading">
          <div>
            <h2>Made by you. Ready to share.</h2>
            <p>Your recently exported music videos.</p>
          </div>
          <button
            className="text-button"
            onClick={() => router.push("/audio-studio/export-history")}
          >
            Export history
            <ArrowRight size={14} />
          </button>
        </div>
        {exports.length ? (
          <div className="dashboard-exports">
            {exports
              .sort((a, b) => b.createdAt - a.createdAt)
              .slice(0, 3)
              .map((e) => (
                <button
                  key={e.id}
                  onClick={() => router.push("/audio-studio/export-history")}
                >
                  <img src={e.thumbnail} alt="" />
                  <span>
                    <strong>{e.name}</strong>
                    <small>
                      {e.width} × {e.height} · {formatTime(e.duration)}
                    </small>
                  </span>
                  <Download size={17} />
                </button>
              ))}
          </div>
        ) : (
          <div className="export-empty">
            <MonitorPlay size={18} />
            <span>
              Your exported videos will appear here. The world is waiting to see
              what you create.
            </span>
          </div>
        )}
      </section>
      <footer className="studio-footer">
        <span>
          <KazuMini />
          Crafted for creators. Powered by you.
        </span>
        <span>
          LOCAL-FIRST. LIMITLESS POSSIBILITIES.
          <span className="footer-dot" />
          KAZU AI
        </span>
      </footer>
      <input
        id="dashboard-audio"
        className="visually-hidden"
        type="file"
        accept="audio/*"
        onChange={(e) => void importAudio(e.target.files?.[0])}
      />
      {createOpen && (
        <Modal
          title="Let’s bring your sound to life"
          subtitle="Start a new project. You can change everything later."
          onClose={() => setCreateOpen(false)}
        >
          <form className="form-stack" onSubmit={createProject}>
            <label>
              Project name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={100}
                placeholder="Give your next masterpiece a name"
                autoFocus
              />
            </label>
            <label>
              Canvas format
              <div className="aspect-options">
                {(["16:9", "9:16", "1:1"] as const).map((a) => (
                  <button
                    type="button"
                    className={aspect === a ? "selected" : ""}
                    key={a}
                    onClick={() => setAspect(a)}
                  >
                    <span
                      className={`aspect-shape ratio-${a.replace(":", "-")}`}
                    />
                    <strong>{a}</strong>
                    <small>
                      {a === "16:9"
                        ? "Landscape"
                        : a === "9:16"
                          ? "Vertical"
                          : "Square"}
                    </small>
                    {aspect === a && <Check size={12} />}
                  </button>
                ))}
              </div>
            </label>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            <Button variant="primary" type="submit" loading={busy}>
              Create project
              <ArrowRight size={16} />
            </Button>
            <p className="muted small">
              <ShieldCheck size={12} />
              Saved on this device. No audio upload required.
            </p>
          </form>
        </Modal>
      )}
      {preview && (
        <PresetPreview preset={preview} onClose={() => setPreview(null)} />
      )}
    </>
  );
}
function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  href,
  color,
}: {
  icon: typeof FolderOpen;
  label: string;
  value: number | string;
  detail: string;
  href: string;
  color: string;
}) {
  const router = useRouter();
  return (
    <button className="stat-card" onClick={() => router.push(href)}>
      <span className={`stat-icon ${color}`}>
        <Icon size={19} strokeWidth={1.6} />
      </span>
      <span className="stat-main">
        <span>{label}</span>
        <strong>
          {value}
          <small>
            {label === "Visualizer Modes"
              ? "modes"
              : label === "Curated Presets"
                ? "presets"
                : ""}
          </small>
        </strong>
      </span>
      <span className="stat-detail">
        {detail}
        <ArrowUpRight size={13} />
      </span>
    </button>
  );
}
function KazuMini() {
  return <span className="footer-flower">✦</span>;
}
