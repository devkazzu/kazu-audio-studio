"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  ArrowUpRight,
  Sparkles,
  SlidersHorizontal,
  Search,
  Download,
  Upload,
  Copy,
  Trash2,
  Check,
  X,
  Box,
  Waves,
  AudioLines,
} from "lucide-react";
import { type Preset } from "@/lib/audio-studio/types";
import { presetImportSchema } from "@/lib/audio-studio/presets";
import { Modal, Button, EmptyState } from "@/components/ui";
import { VisualizerCanvas } from "./visualizer-canvas";
import { useApp } from "@/components/providers";
export function PresetCard({
  preset,
  onPreview,
  compact = false,
}: {
  preset: Preset;
  onPreview: (preset: Preset) => void;
  compact?: boolean;
}) {
  const is3D = ["3D", "Cosmic"].includes(preset.category);
  return (
    <article className={`preset-card ${compact ? "compact-card" : ""}`}>
      <button
        className="preset-art"
        onClick={() => onPreview(preset)}
        aria-label={`Preview ${preset.name}`}
      >
        <img
          src={preset.thumbnail || "/images/studio-hero.jpg"}
          alt={`${preset.name} audio visualizer`}
          loading="lazy"
        />
        <span className="preset-shade" />
        <span className={`preset-category ${is3D ? "three-d" : ""}`}>
          {is3D && <Box size={10} />}
          {preset.category}
        </span>
        <span className="preset-play">
          <Play size={19} fill="currentColor" />
        </span>
        <span className="preset-preview-label">Preview preset</span>
      </button>
      <div className="preset-info">
        <button onClick={() => onPreview(preset)}>
          <h3>{preset.name}</h3>
          {!compact && <p>{preset.description}</p>}
        </button>
        <button
          className="preset-use"
          onClick={() => onPreview(preset)}
          aria-label={`Use ${preset.name}`}
        >
          <ArrowUpRight size={18} />
        </button>
      </div>
      {!compact && (
        <div className="preset-card-footer">
          <span>
            <AudioLines size={11} />
            Audio reactive
          </span>
          <span>1920 × 1080</span>
        </div>
      )}
    </article>
  );
}
export function PresetPreview({
  preset,
  onClose,
}: {
  preset: Preset;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useApp();
  const [playing, setPlaying] = useState(true);
  return (
    <Modal
      title={preset.name}
      subtitle={`${preset.category} · ${preset.description}`}
      onClose={onClose}
      wide
    >
      <div className="preset-preview-stage">
        <VisualizerCanvas config={preset.config} demo={playing} />
        <span className="preview-demo-badge">PRESET PREVIEW</span>
        <button
          className="preview-play-toggle"
          onClick={() => setPlaying(!playing)}
          aria-label={playing ? "Pause preview" : "Play preview"}
        >
          {playing ? (
            <span className="pause-symbol" />
          ) : (
            <Play size={21} fill="currentColor" />
          )}
        </button>
      </div>
      <div className="preset-preview-meta">
        <span>
          <LayersIcon />3 editable layers
        </span>
        <span>
          <SlidersHorizontal size={14} />
          Fully customizable
        </span>
        <span>
          <Waves size={14} />
          Real audio in editor
        </span>
      </div>
      <div className="dialog-actions">
        <Button
          onClick={async () => {
            try {
              await savePresetFile(preset);
              toast("Preset exported as JSON.");
            } catch (e) {
              toast(e instanceof Error ? e.message : "Export failed.", "error");
            }
          }}
        >
          <Download size={16} />
          Export JSON
        </Button>
        <Button
          variant="primary"
          onClick={() => {
            onClose();
            router.push(
              `/audio-studio/editor?preset=${encodeURIComponent(preset.id)}`,
            );
          }}
        >
          Use this preset
          <ArrowUpRight size={16} />
        </Button>
      </div>
    </Modal>
  );
}
function LayersIcon() {
  return <Copy size={14} />;
}
export async function savePresetFile(preset: Preset) {
  const { downloadBlob } = await import("@/lib/audio-studio/project-storage");
  downloadBlob(
    new Blob(
      [
        JSON.stringify(
          {
            name: preset.name,
            description: preset.description,
            category: preset.category,
            config: preset.config,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    ),
    `${preset.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.kazu.json`,
  );
}
export function PresetGallery({
  kind = "presets",
}: {
  kind?: "presets" | "templates" | "visualizers";
}) {
  const { content, toast } = useApp();
  const router = useRouter();
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<Preset | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<Preset | null>(null);
  const categories = [
    "All",
    ...new Set(content.presets.map((p) => p.category)),
  ];
  const filtered = content.presets.filter(
    (p) =>
      (category === "All" || p.category === category) &&
      `${p.name} ${p.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  const title =
    kind === "visualizers"
      ? "Find your frequency."
      : kind === "templates"
        ? "A starting point for something great."
        : "Your next signature sound.";
  async function importFile(file?: File) {
    if (!file) return;
    setError("");
    try {
      if (file.size > 15 * 1024 * 1024)
        throw new Error("Preset files must be smaller than 15 MB.");
      const parsed = presetImportSchema.parse(JSON.parse(await file.text()));
      const preset: Preset = {
        id: `import-${crypto.randomUUID()}`,
        name: parsed.name,
        description: parsed.description || "Your imported preset",
        category: parsed.category || "Custom",
        config: parsed.config,
        thumbnail: "/images/studio-hero.jpg",
        featured: false,
        custom: true,
      };
      const { saveLocalPreset } =
        await import("@/lib/audio-studio/project-storage");
      await saveLocalPreset(preset);
      window.dispatchEvent(new Event("kazu-presets-changed"));
      setImportOpen(false);
      toast("Preset imported. It’s ready to make your own.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid preset file.");
    }
  }
  return (
    <>
      <div className="library-heading">
        <div>
          <div className="eyebrow">MADE TO MOVE YOU</div>
          <h1>{title}</h1>
          <p>Handcrafted starting points. Infinite ways to make them yours.</p>
        </div>
        <div className="heading-actions">
          <Button onClick={() => setImportOpen(true)}>
            <Upload size={16} />
            Import preset
          </Button>
          <Button
            variant="primary"
            onClick={() => router.push("/audio-studio/editor")}
          >
            <Sparkles size={16} />
            Create from scratch
          </Button>
        </div>
      </div>
      <div className="library-feature-banner">
        <span className="banner-symbol">
          <Sparkles size={28} />
        </span>
        <div>
          <h3>
            {kind === "visualizers"
              ? "15 visualizers. One creative playground."
              : "Your sound, with a whole new dimension."}
          </h3>
          <p>
            Every preset is a starting point—not a limit. Customize colors,
            layers, text, and motion.
          </p>
        </div>
        <span className="banner-tag">100% YOURS</span>
      </div>
      <div className="library-toolbar">
        <div className="category-tabs">
          {categories.map((c) => (
            <button
              className={category === c ? "active" : ""}
              onClick={() => setCategory(c)}
              key={c}
            >
              {c === "All"
                ? kind === "visualizers"
                  ? "All visualizers"
                  : "All presets"
                : c}
            </button>
          ))}
        </div>
        <div className="search-box small-search">
          <Search size={15} />
          <input
            placeholder="Search presets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search presets"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Clear search">
              <X size={13} />
            </button>
          )}
        </div>
      </div>
      <div className="library-count">
        {filtered.length} {kind === "visualizers" ? "visualizers" : "presets"}{" "}
        to explore<span>Preview. Customize. Make it yours.</span>
      </div>
      {filtered.length ? (
        <div className="preset-grid library-grid">
          {filtered.map((p) => (
            <div className="library-preset-wrap" key={p.id}>
              <PresetCard preset={p} onPreview={setPreview} />
              {p.custom && (
                <div className="custom-preset-actions">
                  <button
                    onClick={() => {
                      router.push(
                        `/audio-studio/editor?preset=${encodeURIComponent(p.id)}`,
                      );
                    }}
                  >
                    <Copy size={13} />
                    Customize
                  </button>
                  <button
                    onClick={() =>
                      void savePresetFile(p).then(() =>
                        toast("Preset exported."),
                      )
                    }
                  >
                    <Download size={13} />
                    Export
                  </button>
                  <button
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Search}
          title="No presets found"
          description="Try a different search or category. Your next idea might be one click away."
          action="Clear filters"
          onAction={() => {
            setSearch("");
            setCategory("All");
          }}
        />
      )}
      {preview && (
        <PresetPreview preset={preview} onClose={() => setPreview(null)} />
      )}
      {importOpen && (
        <Modal
          title="Bring your own preset"
          subtitle="Import a KAZU JSON preset. We validate the configuration before loading it."
          onClose={() => setImportOpen(false)}
        >
          <label
            className="file-drop-zone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void importFile(e.dataTransfer.files[0]);
            }}
          >
            <Upload size={30} />
            <strong>Choose a preset or drop it here</strong>
            <span>KAZU JSON · up to 15 MB</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) => void importFile(e.target.files?.[0])}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <p className="muted small">
            Imported files contain configuration only. No executable code is
            loaded.
          </p>
        </Modal>
      )}
      {deleting && (
        <Modal
          title={`Delete ${deleting.name}?`}
          subtitle="This removes the saved preset, not projects using it."
          onClose={() => setDeleting(null)}
        >
          <div className="dialog-actions">
            <Button onClick={() => setDeleting(null)}>Keep preset</Button>
            <Button
              variant="danger"
              onClick={async () => {
                try {
                  const { deleteLocalPreset } =
                    await import("@/lib/audio-studio/project-storage");
                  await deleteLocalPreset(deleting.id);
                  window.dispatchEvent(new Event("kazu-presets-changed"));
                  setDeleting(null);
                  toast("Preset deleted.");
                } catch (e) {
                  toast(
                    e instanceof Error ? e.message : "Could not delete preset.",
                    "error",
                  );
                }
              }}
            >
              Delete preset
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
