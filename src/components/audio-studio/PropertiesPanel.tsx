"use client";
import { useRef } from "react";
import {
  Type,
  Image,
  AudioLines,
  Circle,
  Sparkles,
  Box,
  Sun,
  Film,
  RotateCcw,
  SlidersHorizontal,
  Activity,
  Copy,
  Trash2,
} from "lucide-react";
import {
  type StudioLayer,
  type TextLayer,
  type ImageLayer,
  type VisualizerSettings,
} from "@/lib/audio-studio/types";
import { Slider, Button } from "@/components/ui";
import { AudioMeters } from "./AudioPlayer";
import type { AudioEngine } from "@/lib/audio-studio/audio-engine";
export function PropertiesPanel({
  layer,
  onChange,
  engine,
  tab,
  allow3D,
  onDuplicate,
  onDelete,
}: {
  layer: StudioLayer | null;
  onChange: (layer: StudioLayer) => void;
  engine: AudioEngine;
  tab: "properties" | "analysis";
  allow3D: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const patch = (data: Record<string, unknown>) => {
    if (layer) onChange({ ...layer, ...data } as StudioLayer);
  };
  const reset = () => {
    if (!layer) return;
    if (layer.type === "text")
      onChange({
        ...layer,
        x: 960,
        y: 900,
        width: 1400,
        height: 200,
        rotation: 0,
        opacity: 1,
        color: "#F5F1FA",
        blend: "normal",
        fontSize: 48,
        fontWeight: 600,
        align: "center",
        letterSpacing: 4,
        lineHeight: 1.2,
        shadow: 0.3,
        glow: 0.2,
      });
    else
      onChange({
        ...layer,
        x: 960,
        y: 540,
        width: 1920,
        height: 1080,
        rotation: 0,
        opacity: 1,
        color: "#C77DFF",
        blend: "screen",
      });
  };
  async function upload(file: File | undefined, type: "image" | "video") {
    if (!file || !layer) return;
    if (file.size > (type === "image" ? 2 : 8) * 1024 * 1024)
      throw new Error(
        `Choose a ${type} smaller than ${type === "image" ? "2" : "8"} MB.`,
      );
    if (!file.type.startsWith(`${type}/`))
      throw new Error(`Please choose a ${type} file.`);
    const reader = new FileReader();
    reader.onload = () => {
      onChange({ ...layer, src: String(reader.result) } as StudioLayer);
    };
    reader.onerror = () => {
      throw new Error("Could not read this file.");
    };
    reader.readAsDataURL(file);
  }
  const colors = (secondary = false) => (
    <div className="color-input-inline">
      <input
        type="color"
        value={layer?.color || "#C77DFF"}
        onChange={(e) => patch({ color: e.target.value })}
        aria-label={secondary ? "Secondary color" : "Layer color"}
      />
      <input
        key={`${layer?.id}-${layer?.color}`}
        type="text"
        defaultValue={layer?.color}
        aria-label="Hex color"
        maxLength={7}
        onBlur={(e) => {
          if (/^#[0-9a-f]{6}$/i.test(e.target.value))
            patch({ color: e.target.value });
          else e.target.value = layer?.color || "#C77DFF";
        }}
      />
    </div>
  );
  return (
    <aside className="editor-panel properties-panel">
      <div className="properties-tabs">
        <button className={tab === "properties" ? "active" : ""}>
          Properties
        </button>
        <button className={tab === "analysis" ? "active" : ""}>
          Audio analysis
        </button>
      </div>
      {tab === "analysis" ? (
        <div className="inspector-content">
          <AudioMeters engine={engine} />
        </div>
      ) : !layer ? (
        <div className="inspector-empty">
          <SlidersHorizontal size={26} />
          Select a layer to customize
          <br />
          its look and feel.
        </div>
      ) : (
        <div className="inspector-content">
          <div className="inspector-layer-type">
            <span>
              {layer.type === "text" ? (
                <Type size={16} />
              ) : layer.type === "image" ? (
                <Image size={16} />
              ) : ["spectrum", "waveform"].includes(layer.type) ? (
                <AudioLines size={16} />
              ) : layer.type === "particles" ? (
                <Sparkles size={16} />
              ) : layer.type === "object" ? (
                <Box size={16} />
              ) : layer.type === "glow" ? (
                <Sun size={16} />
              ) : (
                <Circle size={16} />
              )}
            </span>
            <div>
              <input
                value={layer.name}
                onChange={(e) => patch({ name: e.target.value })}
                aria-label="Selected layer name"
              />
              <small>
                {layer.type === "text"
                  ? "Text layer"
                  : layer.type === "image"
                    ? "Image layer"
                    : layer.type === "video"
                      ? "Video layer"
                      : "Visual layer"}
              </small>
            </div>
          </div>
          {layer.type === "text" && (
            <div className="inspector-section">
              <h3>Typography & content</h3>
              {(["text", "subtitle", "artist", "song"] as const)
                .filter((key) => layer.type === "text")
                .map((key) => (
                  <label
                    className="field-group"
                    key={key}
                    style={{ marginBottom: 10 }}
                  >
                    <span>
                      {key === "text"
                        ? "Main title"
                        : key[0].toUpperCase() + key.slice(1)}
                    </span>
                    {key === "text" || key === "subtitle" ? (
                      <textarea
                        className="field-input"
                        rows={key === "text" ? 2 : 1}
                        value={layer.type === "text" ? layer[key] : ""}
                        onChange={(e) => patch({ [key]: e.target.value })}
                        maxLength={key === "text" ? 1000 : 200}
                      />
                    ) : (
                      <input
                        className="field-input"
                        value={layer.type === "text" ? layer[key] : ""}
                        onChange={(e) => patch({ [key]: e.target.value })}
                        maxLength={200}
                      />
                    )}
                  </label>
                ))}
              <div className="field-row">
                <label className="field-group">
                  <span>Font family</span>
                  <select
                    className="field-input"
                    value={layer.font}
                    onChange={(e) => patch({ font: e.target.value })}
                  >
                    <option value="Inter, sans-serif">Inter</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="monospace">Monospace</option>
                  </select>
                </label>
                <label className="field-group">
                  <span>Alignment</span>
                  <select
                    className="field-input"
                    value={layer.align}
                    onChange={(e) => patch({ align: e.target.value })}
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                  </select>
                </label>
              </div>
              <Slider
                label="Font size"
                value={layer.fontSize}
                min={8}
                max={300}
                step={1}
                onChange={(v) => patch({ fontSize: v })}
              />
              <Slider
                label="Font weight"
                value={layer.fontWeight}
                min={100}
                max={900}
                step={100}
                onChange={(v) => patch({ fontWeight: v })}
              />
              <Slider
                label="Letter spacing"
                value={layer.letterSpacing}
                min={-5}
                max={30}
                step={0.1}
                onChange={(v) => patch({ letterSpacing: v })}
              />
              <Slider
                label="Line height"
                value={layer.lineHeight}
                min={0.8}
                max={2.5}
                onChange={(v) => patch({ lineHeight: v })}
              />
              <Slider
                label="Text shadow"
                value={layer.shadow}
                onChange={(v) => patch({ shadow: v })}
              />
              <Slider
                label="Text glow"
                value={layer.glow}
                onChange={(v) => patch({ glow: v })}
              />
            </div>
          )}
          {(layer.type === "image" || layer.type === "video") && (
            <div className="inspector-section">
              <h3>
                {layer.type === "video"
                  ? "Video background"
                  : "Artwork & watermark"}
              </h3>
              <Button
                className="full-width"
                style={{ fontSize: 10 }}
                onClick={() =>
                  (layer.type === "video"
                    ? videoInput
                    : imageInput
                  ).current?.click()
                }
              >
                <Image size={13} />
                {"src" in layer && layer.src
                  ? "Replace file"
                  : `Choose ${layer.type}`}
              </Button>
              <input
                ref={imageInput}
                type="file"
                className="visually-hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) =>
                  void upload(e.target.files?.[0], "image").catch((error) =>
                    window.dispatchEvent(
                      new CustomEvent("kazu-editor-error", {
                        detail: error.message,
                      }),
                    ),
                  )
                }
              />
              <input
                ref={videoInput}
                type="file"
                className="visually-hidden"
                accept="video/mp4,video/webm,video/ogg"
                onChange={(e) =>
                  void upload(e.target.files?.[0], "video").catch((error) =>
                    window.dispatchEvent(
                      new CustomEvent("kazu-editor-error", {
                        detail: error.message,
                      }),
                    ),
                  )
                }
              />
              {layer.type === "image" && (
                <>
                  <label className="theme-toggle-row">
                    Crop to fill
                    <input
                      type="checkbox"
                      checked={layer.crop}
                      onChange={(e) => patch({ crop: e.target.checked })}
                    />
                  </label>
                  <label className="theme-toggle-row">
                    KAZU watermark
                    <input
                      type="checkbox"
                      checked={layer.type === "image" && layer.watermark}
                      onChange={(e) => patch({ watermark: e.target.checked })}
                    />
                  </label>
                  <label className="field-group" style={{ marginBottom: 10 }}>
                    <span>Image fit</span>
                    <select
                      className="field-input"
                      value={layer.fit}
                      onChange={(e) => patch({ fit: e.target.value })}
                    >
                      <option value="contain">Contain</option>
                      <option value="cover">Cover</option>
                    </select>
                  </label>
                </>
              )}
              <p className="track-analysis-note">
                Files stay on your device. Use short, lightweight videos for
                better mobile performance. Supported formats depend on your
                browser.
              </p>
            </div>
          )}
          <div className="inspector-section">
            <h3>Transform</h3>
            <div className="field-row">
              <label className="field-group">
                <span>Position X</span>
                <input
                  className="field-input"
                  type="number"
                  value={Math.round(layer.x)}
                  onChange={(e) => patch({ x: Number(e.target.value) })}
                />
              </label>
              <label className="field-group">
                <span>Position Y</span>
                <input
                  className="field-input"
                  type="number"
                  value={Math.round(layer.y)}
                  onChange={(e) => patch({ y: Number(e.target.value) })}
                />
              </label>
            </div>
            <div className="field-row">
              <label className="field-group">
                <span>Width</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={10000}
                  value={Math.round(layer.width)}
                  onChange={(e) =>
                    patch({ width: Math.max(1, Number(e.target.value)) })
                  }
                />
              </label>
              <label className="field-group">
                <span>Height</span>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  max={10000}
                  value={Math.round(layer.height)}
                  onChange={(e) =>
                    patch({ height: Math.max(1, Number(e.target.value)) })
                  }
                />
              </label>
            </div>
            <Slider
              label="Scale"
              value={layer.width / (layer.type === "text" ? 1400 : 1920)}
              min={0.05}
              max={3}
              onChange={(v) => {
                const base = layer.type === "text" ? 1400 : 1920;
                patch({
                  width: Math.round(base * v),
                  height: Math.round((layer.height / layer.width) * base * v),
                });
              }}
              suffix="×"
            />
            <Slider
              label="Rotation"
              value={layer.rotation}
              min={-180}
              max={180}
              step={1}
              suffix="°"
              onChange={(v) => patch({ rotation: v })}
            />
          </div>
          <div className="inspector-section">
            <h3>Color & appearance</h3>
            {colors()}
            <Slider
              label="Opacity"
              value={layer.opacity}
              min={0}
              max={1}
              onChange={(v) => patch({ opacity: v })}
            />
            <label className="field-group">
              <span>Blend mode</span>
              <select
                className="field-input"
                value={layer.blend}
                onChange={(e) => patch({ blend: e.target.value })}
              >
                <option value="normal">Normal</option>
                <option value="screen">Screen</option>
                <option value="multiply">Multiply</option>
                <option value="lighter">Additive</option>
                <option value="overlay">Overlay</option>
              </select>
            </label>
            {layer.type === "object" && !allow3D && (
              <p className="track-analysis-note">
                3D is disabled by your administrator. A Canvas 2D preview is
                used instead.
              </p>
            )}
          </div>
          <div className="dialog-actions" style={{ marginTop: 17 }}>
            <Button onClick={onDuplicate} style={{ flex: 1, fontSize: 9 }}>
              <Copy size={12} />
              Duplicate
            </Button>
            <Button variant="danger" onClick={onDelete} style={{ fontSize: 9 }}>
              <Trash2 size={12} />
              Delete
            </Button>
          </div>
          <button className="inspector-reset" onClick={reset}>
            <RotateCcw size={12} />
            Reset layer properties
          </button>
        </div>
      )}
    </aside>
  );
}
