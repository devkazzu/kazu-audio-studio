"use client";
import { useState } from "react";
import {
  Plus,
  Eye,
  EyeOff,
  LockKeyhole,
  UnlockKeyhole,
  GripVertical,
  Type,
  Image,
  AudioLines,
  Circle,
  Sparkles,
  Box,
  Sun,
  Film,
  ChevronUp,
  ChevronDown,
  Layers3,
} from "lucide-react";
import {
  type StudioLayer,
  type LayerType,
  uid,
} from "@/lib/audio-studio/types";
const layerTypes: { type: LayerType; label: string; icon: typeof Type }[] = [
  { type: "spectrum", label: "Spectrum bars", icon: AudioLines },
  { type: "circular", label: "Circular spectrum", icon: Circle },
  { type: "waveform", label: "Waveform", icon: AudioLines },
  { type: "text", label: "Text / title", icon: Type },
  { type: "image", label: "Image / logo", icon: Image },
  { type: "video", label: "Background video", icon: Film },
  { type: "particles", label: "Particle effects", icon: Sparkles },
  { type: "object", label: "3D object", icon: Box },
  { type: "glow", label: "Glow effects", icon: Sun },
];
export function LayerPanel({
  layers,
  selected,
  onSelect,
  onChange,
  onAdd,
  allow3D,
}: {
  layers: StudioLayer[];
  selected: string | null;
  onSelect: (id: string) => void;
  onChange: (layers: StudioLayer[]) => void;
  onAdd: (layer: StudioLayer) => void;
  allow3D: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  function add(type: LayerType) {
    const id = uid();
    const base = {
      id,
      name:
        type === "text"
          ? "New text"
          : `${type[0].toUpperCase()}${type.slice(1)} layer`,
      type,
      visible: true,
      locked: false,
      x: 960,
      y: 540,
      width: type === "glow" ? 1400 : type === "text" ? 1000 : 1200,
      height: type === "text" ? 220 : 650,
      rotation: 0,
      opacity: 1,
      color: "#C77DFF",
      blend: "screen" as const,
    };
    if (type === "text")
      onAdd({
        ...base,
        name: "New text",
        type,
        text: "YOUR NEXT MASTERPIECE",
        subtitle: "Made with KAZU",
        artist: "",
        song: "",
        font: "Inter, sans-serif",
        fontSize: 64,
        fontWeight: 600,
        align: "center",
        letterSpacing: 2,
        lineHeight: 1.2,
        shadow: 0.2,
        glow: 0.3,
      });
    else if (type === "image" || type === "video") {
      if (type === "video" && !allow3D) return;
      onAdd({
        ...base,
        type,
        src: "",
        crop: type === "image",
        fit: "contain",
        watermark: false,
      });
    } else onAdd({ ...base, type });
    setAdding(false);
  }
  function reorder(from: string, to: string) {
    if (from === to) return;
    const next = [...layers];
    const fromIndex = next.findIndex((l) => l.id === from);
    const toIndex = next.findIndex((l) => l.id === to);
    if (fromIndex < 0 || toIndex < 0) return;
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    onChange(next);
  }
  return (
    <aside className="editor-panel layer-panel">
      <div className="panel-heading">
        <span>
          <Layers3 size={14} />
          Layers<small>{layers.length}</small>
        </span>
        <button
          className="icon-button"
          onClick={() => setAdding(!adding)}
          aria-label="Add layer"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="layer-list">
        {[...layers].reverse().map((layer) => {
          const Icon =
            layerTypes.find((t) => t.type === layer.type)?.icon || Circle;
          return (
            <div
              key={layer.id}
              className={`layer-row ${selected === layer.id ? "selected" : ""} ${!layer.visible ? "hidden-layer" : ""} ${drag === layer.id ? "dragging" : ""} ${over === layer.id ? "drag-over" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(layer.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onSelect(layer.id);
              }}
              draggable={!layer.locked}
              onDragStart={(e) => {
                setDrag(layer.id);
                e.dataTransfer.setData("text/plain", layer.id);
              }}
              onDragEnd={() => {
                setDrag(null);
                setOver(null);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setOver(layer.id);
              }}
              onDrop={(e) => {
                e.preventDefault();
                reorder(e.dataTransfer.getData("text/plain"), layer.id);
                setDrag(null);
                setOver(null);
              }}
            >
              <GripVertical size={12} className="muted" />
              <Icon size={15} />
              <div className="layer-row-name">
                <input
                  value={layer.name}
                  aria-label="Layer name"
                  maxLength={100}
                  onChange={(e) => {
                    if (!layer.locked)
                      onChange(
                        layers.map((l) =>
                          l.id === layer.id
                            ? { ...l, name: e.target.value }
                            : l,
                        ),
                      );
                  }}
                />
              </div>
              <div className="layer-row-buttons">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(
                      layers.map((l) =>
                        l.id === layer.id ? { ...l, visible: !l.visible } : l,
                      ),
                    );
                  }}
                  aria-label={`${layer.visible ? "Hide" : "Show"} ${layer.name}`}
                >
                  {layer.visible ? <Eye /> : <EyeOff />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(
                      layers.map((l) =>
                        l.id === layer.id ? { ...l, locked: !l.locked } : l,
                      ),
                    );
                  }}
                  aria-label={`${layer.locked ? "Unlock" : "Lock"} ${layer.name}`}
                >
                  {layer.locked ? <LockKeyhole /> : <UnlockKeyhole />}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {adding && (
        <div className="add-layer-menu">
          {layerTypes
            .filter((t) => t.type !== "video" || allow3D)
            .map(({ type, label, icon: Icon }) => (
              <button key={type} onClick={() => add(type)}>
                <Icon size={14} />
                {label}
                <Plus size={12} />
              </button>
            ))}
        </div>
      )}
      <button className="layer-add" onClick={() => setAdding(!adding)}>
        <Plus size={13} />
        Add layer
      </button>
      <div className="layer-panel-bottom">
        <p>Drag to reorder. Select a layer to make it yours.</p>
        <div className="field-row">
          <button
            className="button"
            style={{ minHeight: 27, padding: 5, fontSize: 8 }}
            disabled={layers[0]?.id === selected}
            onClick={() => {
              const index = layers.findIndex((l) => l.id === selected);
              if (index > 0) {
                const next = [...layers];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next);
              }
            }}
          >
            <ChevronDown size={12} />
            Down
          </button>
          <button
            className="button"
            style={{ minHeight: 27, padding: 5, fontSize: 8 }}
            disabled={!selected || layers[layers.length - 1]?.id === selected}
            onClick={() => {
              const index = layers.findIndex((l) => l.id === selected);
              if (index >= 0 && index < layers.length - 1) {
                const next = [...layers];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                onChange(next);
              }
            }}
          >
            <ChevronUp size={12} />
            Up
          </button>
        </div>
      </div>
    </aside>
  );
}
