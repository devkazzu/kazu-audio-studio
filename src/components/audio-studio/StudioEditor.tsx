"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  Undo2,
  Redo2,
  Save,
  Download,
  Maximize2,
  Settings2,
  Layers3,
  SlidersHorizontal,
  AudioLines,
  Check,
  Cloud,
  FileJson,
  Upload,
  Sparkles,
  ShieldCheck,
  Copy,
  Trash2,
  LoaderCircle,
  RotateCcw,
  Eye,
  FolderOpen,
  AlertTriangle,
} from "lucide-react";
import { Button, Modal, ConfirmDialog } from "@/components/ui";
import { useApp } from "@/components/providers";
import { AudioEngine } from "@/lib/audio-studio/audio-engine";
import {
  defaultSettings,
  createLayers,
  BUILTIN_PRESETS,
  configFromPreset,
} from "@/lib/audio-studio/presets";
import {
  getProject,
  saveProject,
  deleteProject,
  saveLocalPreset,
  downloadBlob,
} from "@/lib/audio-studio/project-storage";
import {
  uid,
  type StudioConfig,
  type StudioLayer,
  type LocalProject,
  type Preset,
  type VisualizerSettings,
} from "@/lib/audio-studio/types";
import {
  fullscreen,
  deviceQuality,
} from "@/lib/audio-studio/device-capabilities";
import { VisualizerCanvas } from "./visualizer-canvas";
import { AudioTimeline } from "./AudioPlayer";
import { LayerPanel } from "./LayerPanel";
import { PropertiesPanel } from "./PropertiesPanel";
import { ExportPanel } from "./ExportPanel";
import { configSchema, presetImportSchema } from "@/lib/audio-studio/presets";
export function StudioEditor({
  initialProjectId,
  initialPresetId,
}: {
  initialProjectId?: string;
  initialPresetId?: string;
}) {
  const router = useRouter();

  const { content, user, toast } = useApp();
  const [project, setProject] = useState<LocalProject | null>(null);
  const [config, setConfig] = useState<StudioConfig>(() => ({
    version: 1,
    settings: defaultSettings(),
    layers: createLayers(defaultSettings()),
  }));
  const [selected, setSelected] = useState<string | null>("visual");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">(
    "saved",
  );
  const [error, setError] = useState("");
  const [panelTab, setPanelTab] = useState<"properties" | "analysis">(
    "properties",
  );
  const [mobilePanel, setMobilePanel] = useState<
    "canvas" | "layers" | "properties"
  >("canvas");
  const [engine, setEngine] = useState<AudioEngine | null>(null);
  const [allow3D, setAllow3D] = useState(true);
  const [allowExport, setAllowExport] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [presetOpen, setPresetOpen] = useState(false);
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetBusy, setPresetBusy] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [projectMenu, setProjectMenu] = useState(false);
  const [undoCount, setUndoCount] = useState(0);
  const [redoCount, setRedoCount] = useState(0);
  const [fullscreenFallback, setFullscreenFallback] = useState(false);
  const contentRef = useRef(content);
  const engineRef = useRef<AudioEngine | null>(null);
  const revision = useRef(0);
  useEffect(() => {
    contentRef.current = content;
  }, [content]);
  const history = useRef<StudioConfig[]>([]);
  const future = useRef<StudioConfig[]>([]);
  const current = useRef(config);
  const projectRef = useRef(project);
  const audioRef = useRef<Blob | null>(null);
  const dirty = useRef(false);
  const lastSaved = useRef("");
  const saving = useRef(false);
  const saveAgain = useRef(false);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    rect: DOMRect;
  } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const importRef = useRef<HTMLInputElement>(null);
  const projectImportRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    engineRef.current = engine;
  }, [engine]);
  useEffect(() => {
    current.current = config;
    projectRef.current = project;
  }, [config, project]);
  const changeConfig = useCallback((next: StudioConfig) => {
    if (JSON.stringify(next) === JSON.stringify(current.current)) return;
    history.current = [
      ...history.current.slice(-59),
      structuredClone(current.current),
    ];
    future.current = [];
    current.current = next;
    setConfig(next);
    setUndoCount(history.current.length);
    setRedoCount(0);
    dirty.current = true;
  }, []);
  const updateSettings = useCallback(
    (patch: Partial<VisualizerSettings>) => {
      const next = {
        ...current.current,
        settings: { ...current.current.settings, ...patch },
      };
      const layers = next.layers.map((layer) =>
        layer.type === "text" || layer.type === "background"
          ? layer
          : "settings" in layer
            ? { ...layer, settings: { ...layer.settings, ...patch } }
            : layer,
      );
      changeConfig({ ...next, layers });
    },
    [changeConfig],
  );
  const updateLayer = useCallback(
    (layer: StudioLayer) => {
      changeConfig({
        ...current.current,
        settings:
          layer.type === "background"
            ? { ...current.current.settings, background: layer.color }
            : current.current.settings,
        layers: current.current.layers.map((l) =>
          l.id === layer.id ? layer : l,
        ),
      });
    },
    [changeConfig],
  );
  const undo = useCallback(() => {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push(structuredClone(current.current));
    current.current = previous;
    setConfig(previous);
    setUndoCount(history.current.length);
    setRedoCount(future.current.length);
    dirty.current = true;
  }, []);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(structuredClone(current.current));
    current.current = next;
    setConfig(next);
    setUndoCount(history.current.length);
    setRedoCount(future.current.length);
    dirty.current = true;
  }, []);
  const save = useCallback(
    async function saveProjectInternal(notify = true) {
      if (!projectRef.current || saving.current) {
        saveAgain.current = true;
        return;
      }
      saving.current = true;
      setSaveState("saving");
      try {
        const canvas = stageRef.current?.querySelector("canvas");
        let thumbnail = projectRef.current.thumbnail;
        if (canvas) {
          const small = document.createElement("canvas");
          small.width = 320;
          small.height = 180;
          small.getContext("2d")?.drawImage(canvas, 0, 0, 320, 180);
          thumbnail = small.toDataURL("image/jpeg", 0.65);
        }
        const savedRevision = revision.current;
        const audio = audioRef.current;
        const saved = {
          ...projectRef.current,
          config: structuredClone(current.current),
          audio,
          thumbnail,
          duration:
            engineRef.current?.info.duration || projectRef.current.duration,
          updatedAt: Date.now(),
        };
        await saveProject(saved);
        lastSaved.current = JSON.stringify({
          config: saved.config,
          name: saved.name,
          hasAudio: !!audio,
        });
        dirty.current = revision.current !== savedRevision;
        setSaveState("saved");
        if (dirty.current) saveAgain.current = true;
        if (notify) toast("Project saved on this device.");
      } catch (e) {
        setSaveState("error");
        toast(
          e instanceof Error
            ? e.message
            : "Could not save. Browser storage may be full.",
          "error",
        );
      } finally {
        saving.current = false;
        if (saveAgain.current) {
          saveAgain.current = false;
          window.setTimeout(() => void saveProjectInternal(notify), 100);
        }
      }
    },
    [toast],
  );
  useEffect(() => {
    let audio: AudioEngine | null = null;
    const timer = window.setTimeout(() => {
      audio = new AudioEngine(defaultSettings());
      audio.configure({ ...defaultSettings(), quality: deviceQuality() });
      setEngine(audio);
      void fetch("/api/studio")
        .then((r) => r.json())
        .then((data) => {
          const flags = data.flags || [];
          setAllow3D(
            flags.find((f: { key: string }) => f.key === "engine_3d")
              ?.enabled !== false,
          );
          setAllowExport(
            flags.find((f: { key: string }) => f.key === "video_export")
              ?.enabled !== false,
          );
        })
        .catch(() => {});
    }, 0);
    return () => {
      clearTimeout(timer);
      audio?.dispose();
    };
  }, []);
  useEffect(() => {
    if (!engine) return;
    let disposed = false;
    const load = async () => {
      const id = initialProjectId;
      if (id) {
        try {
          const stored = await getProject(id);
          if (!stored)
            throw new Error(
              "This project is not on this device. Open it in the browser where you created it.",
            );
          if (disposed) return;
          current.current = stored.config;
          projectRef.current = stored;
          setProject(stored);
          setConfig(stored.config);
          setSelected(
            stored.config.layers.find((l) => l.type !== "background")?.id ||
              stored.config.layers[0]?.id ||
              null,
          );
          lastSaved.current = JSON.stringify({
            config: stored.config,
            name: stored.name,
            hasAudio: !!stored.audio,
          });
          audioRef.current = stored.audio;
          if (stored.audio) {
            try {
              await engine.load(
                new File([stored.audio], stored.audioName, {
                  type: stored.audio.type,
                }),
              );
            } catch (e) {
              setError(
                e instanceof Error ? e.message : "Could not load audio.",
              );
            }
          }
        } catch (e) {
          setError(e instanceof Error ? e.message : "Could not open project.");
        }
      } else {
        const presetId = initialPresetId;
        const preset = contentRef.current.presets.find(
          (p) => p.id === presetId,
        );
        const settings = {
          ...defaultSettings(),
          ...(preset?.config.settings || {}),
          quality: deviceQuality(),
        };
        const next = preset
          ? configFromPreset({
              name: preset.name,
              config: { version: 1, settings, layers: preset.config.layers },
            })
          : { version: 1 as const, settings, layers: createLayers(settings) };
        const newProject: LocalProject = {
          id: uid(),
          name: preset ? `${preset.name} — Remix` : "Untitled project",
          config: next,
          thumbnail: preset?.thumbnail || "/images/studio-hero.jpg",
          audio: null,
          audioName: "",
          duration: 0,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        current.current = next;
        projectRef.current = newProject;
        setProject(newProject);
        setConfig(next);
        audioRef.current = null;
        dirty.current = true;
        window.history.replaceState(
          null,
          "",
          `/audio-studio/editor?project=${newProject.id}`,
        );
      }
      if (!disposed) setReady(true);
    };
    void load();
    return () => {
      disposed = true;
    };
  }, [engine, initialProjectId, initialPresetId]);
  useEffect(() => {
    if (!ready || !project) return;
    const timer = window.setTimeout(() => {
      setSaveState("saving");
      void save(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [config, project?.name, ready, save]);
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z" &&
        !(
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        )
      ) {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    };
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("keydown", handler);
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [save, undo, redo]);
  useEffect(() => {
    const handler = (event: Event) =>
      toast((event as CustomEvent<string>).detail, "error");
    window.addEventListener("kazu-editor-error", handler);
    return () => window.removeEventListener("kazu-editor-error", handler);
  }, [toast]);
  async function importAudio(file?: File) {
    if (!file || !engine) return;
    try {
      await engine.load(file);
      audioRef.current = file;
      dirty.current = true;
      revision.current++;
      setProject((p) =>
        p ? { ...p, audioName: file.name, duration: engine.info.duration } : p,
      );
      toast("Audio imported. Press play to bring your visuals to life.");
      window.setTimeout(() => void save(false), 100);
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not import audio.",
        "error",
      );
    }
  }
  async function exportProject() {
    if (!project) return;
    downloadBlob(
      new Blob(
        [
          JSON.stringify(
            {
              format: "kazu-audio-studio",
              version: 1,
              name: project.name,
              config: current.current,
              audioReference: project.audioName,
              exportedAt: new Date().toISOString(),
            },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
      `${project.name.replace(/[^a-z0-9]/gi, "-")}.kazu.json`,
    );
    toast(
      "Project configuration exported. Audio files are not included; import your audio separately.",
    );
  }
  async function importProject(file?: File) {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024)
        throw new Error("Project files must be under 20 MB.");
      const parsed = JSON.parse(await file.text());
      const validated = configSchema.parse(parsed.config);
      const imported: LocalProject = {
        id: uid(),
        name: String(parsed.name || file.name).slice(0, 100),
        config: validated,
        thumbnail: "/images/studio-hero.jpg",
        audio: null,
        audioName: "",
        duration: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      await saveProject(imported);
      router.push(`/audio-studio/editor?project=${imported.id}`);
      toast("Project imported. Add its audio file to continue playback.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Invalid project file.", "error");
    }
  }
  async function savePreset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return;
    setPresetBusy(true);
    const form = new FormData(event.currentTarget);
    const preset: Preset = {
      id: `local-${uid()}`,
      name: String(form.get("name")),
      description: String(form.get("description") || "Your signature preset"),
      category: "Custom",
      config: current.current,
      thumbnail: project.thumbnail,
      custom: true,
      featured: false,
    };
    try {
      await saveLocalPreset(preset);
      window.dispatchEvent(new Event("kazu-presets-changed"));
      if (user) {
        try {
          const response = await fetch("/api/presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(preset),
          });
          if (!response.ok) throw new Error((await response.json()).error);
        } catch (e) {
          toast(
            `Saved locally. Cloud sync: ${e instanceof Error ? e.message : "unavailable"}`,
            "info",
          );
        }
      }
      setSavePresetOpen(false);
      toast("Your preset is saved. Find it in your library.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Could not save preset.", "error");
    } finally {
      setPresetBusy(false);
    }
  }

  async function removeProject() {
    if (!project) return;
    setDeleteBusy(true);
    try {
      await deleteProject(project.id);
      dirty.current = false;
      router.push("/audio-studio/projects");
      toast("Project deleted from this device.");
    } catch (e) {
      toast(
        e instanceof Error ? e.message : "Could not delete project.",
        "error",
      );
    } finally {
      setDeleteBusy(false);
    }
  }
  const layer = config.layers.find((l) => l.id === selected) || null;
  const selectedRef = useRef(layer);
  useEffect(() => {
    selectedRef.current = layer;
  }, [layer]);
  function pointerDown(event: React.PointerEvent<HTMLDivElement>, id: string) {
    const item = current.current.layers.find((l) => l.id === id);
    const rect = stageRef.current
      ?.querySelector(".canvas-frame")
      ?.getBoundingClientRect();
    if (!item || item.locked || item.type === "background" || !rect) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelected(id);
    drag.current = {
      id,
      startX: event.clientX,
      startY: event.clientY,
      x: item.x,
      y: item.y,
      rect,
    };
  }
  function pointerMove(event: React.PointerEvent<HTMLDivElement>) {
    const data = drag.current;
    if (!data) return;
    const x = Math.max(
      -1000,
      Math.min(
        2920,
        data.x + ((event.clientX - data.startX) / data.rect.width) * 1920,
      ),
    );
    const y = Math.max(
      -1000,
      Math.min(
        2080,
        data.y + ((event.clientY - data.startY) / data.rect.height) * 1080,
      ),
    );
    const item = current.current.layers.find((l) => l.id === data.id);
    if (item) updateLayer({ ...item, x: Math.round(x), y: Math.round(y) });
  }
  function duplicateLayer() {
    if (!layer) return;
    const next = {
      ...structuredClone(layer),
      id: uid(),
      name: `${layer.name} copy`,
      x: layer.x + 40,
      y: layer.y + 40,
      locked: false,
    };
    changeConfig({
      ...current.current,
      layers: [...current.current.layers, next],
    });
    setSelected(next.id);
  }
  function deleteLayer() {
    if (!layer || layer.locked || layer.type === "background") {
      toast(
        "Unlock this layer before deleting it. The background is required.",
        "info",
      );
      return;
    }
    changeConfig({
      ...current.current,
      layers: current.current.layers.filter((l) => l.id !== layer.id),
    });
    setSelected(null);
  }
  const aspect = config.settings.aspectRatio;
  const canvasStyle = {
    aspectRatio: aspect.replace(":", " / "),
    maxHeight: "55dvh",
  };
  return (
    <>
      <h1 className="visually-hidden">Audio Studio Editor</h1>
      <input
        ref={importRef}
        type="file"
        accept="audio/*"
        className="visually-hidden"
        onChange={(e) => void importAudio(e.target.files?.[0])}
      />
      <input
        ref={projectImportRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        onChange={(e) => void importProject(e.target.files?.[0])}
      />
      <div className="editor-heading">
        <div className="editor-project-title">
          <button
            className="icon-button"
            onClick={() => router.push("/audio-studio/projects")}
            aria-label="Back to projects"
          >
            <ArrowLeft size={17} />
          </button>
          <div>
            <input
              aria-label="Project name"
              value={project?.name || "Opening project…"}
              disabled={!ready}
              onChange={(e) => {
                if (project) {
                  setProject({ ...project, name: e.target.value });
                  dirty.current = true;
                  revision.current++;
                }
              }}
              onBlur={() => void save(false)}
            />
            <p>
              <i className={`save-state-dot ${saveState}`} />
              {saveState === "saving"
                ? "Saving locally…"
                : saveState === "error"
                  ? "Save failed · storage may be full"
                  : "All changes saved on this device"}
            </p>
          </div>
        </div>
        <div className="heading-actions">
          <Button onClick={() => setProjectMenu(!projectMenu)}>
            <ChevronDown size={13} />
            Project
          </Button>
          <Button onClick={() => setSavePresetOpen(true)} disabled={!ready}>
            <Sparkles size={13} />
            Save preset
          </Button>
          <Button
            variant="primary"
            onClick={() => setExportOpen(true)}
            disabled={!ready}
          >
            <Download size={14} />
            Export video
          </Button>
        </div>
      </div>
      {projectMenu && (
        <div className="editor-project-menu">
          <button onClick={() => void exportProject()}>
            <FileJson size={14} />
            Export project JSON
          </button>
          <button onClick={() => projectImportRef.current?.click()}>
            <Upload size={14} />
            Import project
          </button>
          <button
            onClick={() => {
              if (project) {
                const next = {
                  ...structuredClone(project),
                  id: uid(),
                  name: `${project.name} — Copy`,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                void saveProject(next).then(() => {
                  window.history.replaceState(
                    null,
                    "",
                    `/audio-studio/editor?project=${next.id}`,
                  );
                  toast("Project duplicated.");
                });
              }
            }}
          >
            <Copy size={14} />
            Duplicate project
          </button>
          <button className="danger-text" onClick={() => setDeleteOpen(true)}>
            <Trash2 size={14} />
            Delete project
          </button>
        </div>
      )}
      {error && (
        <div className="inline-warning">
          {error}
          <button
            className="text-button"
            onClick={() => router.push("/audio-studio/projects")}
          >
            Back to projects
          </button>
        </div>
      )}
      <div className="editor-toolbar">
        <div className="toolbar-group">
          <button
            className="icon-button"
            onClick={undo}
            disabled={!undoCount}
            aria-label="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button
            className="icon-button"
            onClick={redo}
            disabled={!redoCount}
            aria-label="Redo"
          >
            <Redo2 size={16} />
          </button>
          <span className="toolbar-separator" />
          <button
            className="icon-button"
            onClick={() => importRef.current?.click()}
            aria-label="Choose an audio file"
          >
            <Upload size={15} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              if (engine) {
                if (engine.info.playing) engine.pause();
                else void engine.play().catch((e) => toast(e.message, "error"));
              }
            }}
            aria-label="Play or pause preview"
          >
            <AudioLines size={16} />
          </button>
        </div>
        <div className="toolbar-group">
          <span className="editor-toolbar-label">VISUALIZER</span>
          <select
            aria-label="Visualizer mode"
            value={config.settings.mode}
            onChange={(e) =>
              updateSettings({
                mode: e.target.value as VisualizerSettings["mode"],
              })
            }
          >
            {[
              ["spectrum", "Classic Spectrum"],
              ["circular", "Circular Spectrum"],
              ["radial-wave", "Radial Waveform"],
              ["waveform", "Frequency Waveform"],
              ["particles", "Particle Universe"],
              ["sphere", "Audio Reactive Sphere"],
              ["tunnel", "Infinite Tunnel"],
              ["liquid", "Liquid Waves"],
              ["plasma", "Plasma Field"],
              ["rings", "Energy Rings"],
              ["galaxy", "Galaxy Particles"],
              ["equalizer", "3D Equalizer"],
              ["oscilloscope", "Neon Oscilloscope"],
              ["geometry", "Geometric Pulse"],
              ["landscape", "Cinematic Landscape"],
            ].map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            className="icon-button"
            onClick={() => setPresetOpen(true)}
            aria-label="Browse presets"
          >
            <Sparkles size={15} />
          </button>
          <span className="toolbar-separator" />
          <select
            aria-label="Aspect ratio"
            value={aspect}
            onChange={(e) =>
              updateSettings({
                aspectRatio: e.target
                  .value as VisualizerSettings["aspectRatio"],
              })
            }
          >
            <option value="16:9">16:9 Landscape</option>
            <option value="9:16">9:16 Vertical</option>
            <option value="1:1">1:1 Square</option>
          </select>
          <select
            aria-label="Performance quality"
            value={config.settings.quality}
            onChange={(e) =>
              updateSettings({
                quality: e.target.value as VisualizerSettings["quality"],
              })
            }
          >
            <option value="low">LOW · Battery saver</option>
            <option value="medium">MEDIUM · Balanced</option>
            <option value="high">HIGH · Best quality</option>
          </select>
        </div>
        <div className="toolbar-group">
          <button
            className="icon-button"
            onClick={() => {
              setPanelTab("analysis");
              setMobilePanel("properties");
            }}
            aria-label="Audio analysis settings"
          >
            <Settings2 size={15} />
          </button>
          <button
            className="icon-button"
            onClick={() => {
              if (stageRef.current)
                void fullscreen(stageRef.current).then(() =>
                  setFullscreenFallback(
                    stageRef.current!.classList.contains("preview-fullscreen"),
                  ),
                );
            }}
            aria-label="Fullscreen preview"
          >
            <Maximize2 size={15} />
          </button>
          <Button onClick={() => void save()}>
            <Save size={13} />
            Save
          </Button>
        </div>
      </div>
      <div className={`editor-workspace show-${mobilePanel}`}>
        <LayerPanel
          layers={config.layers}
          selected={selected}
          onSelect={(id) => {
            setSelected(id);
            setPanelTab("properties");
          }}
          onChange={(layers) => changeConfig({ ...current.current, layers })}
          onAdd={(layer) => {
            if (current.current.layers.length >= 40) {
              toast("This project has reached the 40-layer limit.", "info");
              return;
            }
            changeConfig({
              ...current.current,
              layers: [...current.current.layers, layer],
            });
            setSelected(layer.id);
          }}
          allow3D={allow3D}
        />
        <section className="canvas-workspace">
          <div className="canvas-topbar">
            <span>
              <Eye size={12} />
              LIVE PREVIEW
              <i className="live-dot" />
            </span>
            <span>
              {config.settings.mode.toUpperCase()} ·{" "}
              {config.settings.quality.toUpperCase()} QUALITY
            </span>
          </div>
          <div className="canvas-stage" ref={stageRef}>
            <div className="canvas-frame" style={canvasStyle}>
              <VisualizerCanvas
                config={config}
                engine={engine}
                allow3D={allow3D}
                onFallback={() =>
                  toast(
                    "WebGL is unavailable. Using the Canvas 2D visualizer instead.",
                    "info",
                  )
                }
              />
              {config.layers
                .filter(
                  (l) =>
                    l.visible && l.type !== "background" && l.type !== "glow",
                )
                .map((l) => (
                  <div
                    key={l.id}
                    className={`canvas-selection ${selected === l.id ? "" : "selection-inactive"} ${l.locked ? "locked" : ""}`}
                    style={{
                      left: `${((l.x - l.width / 2) / 1920) * 100}%`,
                      top: `${((l.y - l.height / 2) / 1080) * 100}%`,
                      width: `${(l.width / 1920) * 100}%`,
                      height: `${(l.height / 1080) * 100}%`,
                      transform: `rotate(${l.rotation}deg)`,
                      display: selected === l.id ? "block" : "none",
                    }}
                    onPointerDown={(e) => pointerDown(e, l.id)}
                    onPointerMove={pointerMove}
                    onPointerUp={() => {
                      drag.current = null;
                    }}
                    onPointerCancel={() => {
                      drag.current = null;
                    }}
                  >
                    <span>{l.name}</span>
                    {!l.locked && (
                      <>
                        <i className="canvas-selection-handle tl" />
                        <i className="canvas-selection-handle tr" />
                        <i className="canvas-selection-handle bl" />
                        <i className="canvas-selection-handle br" />
                      </>
                    )}
                  </div>
                ))}
              {!engine?.info.name && !engine?.info.microphone && (
                <div className="canvas-empty-hint">
                  <Upload size={12} />
                  Import audio to bring your visuals to life
                </div>
              )}
            </div>
          </div>
          <div className="canvas-bottom-label">
            <span>
              {aspect} ·{" "}
              {aspect === "16:9"
                ? "1920 × 1080"
                : aspect === "9:16"
                  ? "1080 × 1920"
                  : "1080 × 1080"}
            </span>
            <span>
              <ShieldCheck size={9} />
              LOCAL-FIRST WORKSPACE
            </span>
          </div>
        </section>
        <PropertiesPanel
          layer={layer}
          onChange={updateLayer}
          engine={engine!}
          tab={panelTab}
          allow3D={allow3D}
          onDuplicate={duplicateLayer}
          onDelete={deleteLayer}
        />
      </div>
      <div className="mobile-editor-tabs">
        <button
          className={mobilePanel === "canvas" ? "active" : ""}
          onClick={() => setMobilePanel("canvas")}
        >
          <MonitorIcon />
          Canvas
        </button>
        <button
          className={mobilePanel === "layers" ? "active" : ""}
          onClick={() => setMobilePanel("layers")}
        >
          <Layers3 size={15} />
          Layers
        </button>
        <button
          className={mobilePanel === "properties" ? "active" : ""}
          onClick={() => setMobilePanel("properties")}
        >
          <SlidersHorizontal size={15} />
          Properties
        </button>
      </div>
      {engine && (
        <AudioTimeline
          engine={engine}
          onImport={(file) => void importAudio(file)}
          onError={(message) => toast(message, "error")}
        />
      )}
      {!ready && (
        <div className="editor-loading">
          <LoaderCircle className="spin" size={15} />
          Opening your local workspace…
        </div>
      )}
      {exportOpen && engine && project && (
        <ExportPanel
          config={config}
          engine={engine}
          projectId={project.id}
          allow3D={allow3D}
          allowExport={allowExport}
          onClose={() => setExportOpen(false)}
          onComplete={() => {
            dirty.current = true;
            void save(false);
          }}
        />
      )}
      {presetOpen && (
        <Modal
          title="Find your next look"
          subtitle="Apply a preset to this project. You can undo this change."
          onClose={() => setPresetOpen(false)}
          wide
        >
          <div className="preset-grid library-grid">
            {content.presets.map((p) => (
              <button
                key={p.id}
                className="editor-preset-option"
                onClick={() => {
                  const next = configFromPreset(p);
                  updateSettings(next.settings);
                  changeConfig({
                    ...next,
                    layers: next.layers.map((l) =>
                      l.type === "text"
                        ? { ...l, text: project?.name || l.text }
                        : l,
                    ),
                  });
                  setSelected("visual");
                  setPresetOpen(false);
                  toast(`${p.name} applied. Make it your own.`);
                }}
              >
                <img
                  src={p.thumbnail || "/images/studio-hero.jpg"}
                  alt={p.name}
                />
                <span>
                  {p.name}
                  <small>{p.category}</small>
                </span>
              </button>
            ))}
          </div>
        </Modal>
      )}
      {savePresetOpen && (
        <Modal
          title="Save your signature preset"
          subtitle="Keep this look in your local library and make it yours again."
          onClose={() => setSavePresetOpen(false)}
        >
          <form className="form-stack" onSubmit={savePreset}>
            <label>
              Preset name
              <input
                name="name"
                required
                maxLength={100}
                defaultValue={project?.name}
              />
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={3}
                maxLength={1000}
                placeholder="What makes this preset special?"
              />
            </label>
            <Button variant="primary" type="submit" loading={presetBusy}>
              Save preset
              <Sparkles size={15} />
            </Button>
          </form>
        </Modal>
      )}
      {deleteOpen && (
        <ConfirmDialog
          title="Delete this project?"
          message="This permanently removes the project and its local audio from this browser. Export a project backup first if you want to keep a copy."
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => void removeProject()}
          loading={deleteBusy}
        />
      )}
    </>
  );
}
function MonitorIcon() {
  return <Maximize2 size={15} />;
}
