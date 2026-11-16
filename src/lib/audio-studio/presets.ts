import { z } from "zod";
import {
  VISUALIZER_MODES,
  type Preset,
  type StudioConfig,
  type VisualizerSettings,
  type StudioLayer,
} from "./types";

const color = z.string().regex(/^#[0-9a-f]{6}$/i);
const unit = z.number().min(0).max(1);
export const settingsSchema = z.object({
  mode: z.enum(VISUALIZER_MODES),
  color,
  secondaryColor: color,
  background: color,
  intensity: unit,
  speed: z.number().min(0.05).max(3),
  sensitivity: z.number().min(0.1).max(3),
  glow: unit,
  rotation: z.number().min(-2).max(2),
  particleCount: z.number().int().min(100).max(12000),
  fftSize: z.union([
    z.literal(512),
    z.literal(1024),
    z.literal(2048),
    z.literal(4096),
  ]),
  smoothing: unit,
  attack: unit,
  release: unit,
  bassRange: z.tuple([
    z.number().min(20).max(2000),
    z.number().min(20).max(2000),
  ]),
  midRange: z.tuple([
    z.number().min(20).max(12000),
    z.number().min(20).max(12000),
  ]),
  trebleRange: z.tuple([
    z.number().min(20).max(20000),
    z.number().min(20).max(20000),
  ]),
  frequencyGain: z.number().min(0.1).max(3),
  quality: z.enum(["low", "medium", "high"]),
  aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
  resolution: z.union([z.literal(480), z.literal(720), z.literal(1080)]),
});
const base = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(100),
  type: z.enum([
    "background",
    "spectrum",
    "circular",
    "waveform",
    "text",
    "image",
    "particles",
    "object",
    "glow",
    "video",
  ]),
  visible: z.boolean(),
  locked: z.boolean(),
  x: z.number().min(-10000).max(10000),
  y: z.number().min(-10000).max(10000),
  width: z.number().min(1).max(10000),
  height: z.number().min(1).max(10000),
  rotation: z.number().min(-360).max(360),
  opacity: unit,
  color,
  blend: z.enum(["normal", "screen", "multiply", "lighter", "overlay"]),
});
export const layerSchema = z.discriminatedUnion("type", [
  base.extend({
    type: z.literal("text"),
    text: z.string().max(1000),
    subtitle: z.string().max(200),
    artist: z.string().max(200),
    song: z.string().max(200),
    font: z.string().max(100),
    fontSize: z.number().min(8).max(300),
    fontWeight: z.number().min(100).max(900),
    align: z.enum(["left", "center", "right"]),
    letterSpacing: z.number().min(-5).max(30),
    lineHeight: z.number().min(0.8).max(2.5),
    shadow: unit,
    glow: unit,
  }),
  base.extend({
    type: z.literal("image"),
    src: z
      .string()
      .max(3000000)
      .refine(
        (s) =>
          s === "" ||
          /^data:image\/(png|jpeg|webp);base64,/.test(s) ||
          /^blob:\/\//.test(s),
      ),
    fit: z.enum(["contain", "cover"]),
    crop: z.boolean(),
    watermark: z.boolean(),
  }),
  base.extend({
    type: z.literal("video"),
    src: z
      .string()
      .max(12000000)
      .refine(
        (s) => s === "" || /^data:video\//.test(s) || /^blob:\/\//.test(s),
      ),
  }),
  base.extend({
    type: z.enum([
      "background",
      "spectrum",
      "circular",
      "waveform",
      "particles",
      "object",
      "glow",
    ]),
    settings: z.object(settingsSchema.shape).partial().optional(),
  }),
]);
export const configSchema = z
  .object({
    version: z.literal(1),
    settings: settingsSchema,
    layers: z.array(layerSchema).max(40),
  })
  .superRefine((config, ctx) => {
    for (const [name, range] of [
      ["bassRange", config.settings.bassRange],
      ["midRange", config.settings.midRange],
      ["trebleRange", config.settings.trebleRange],
    ] as const) {
      if (range[0] >= range[1])
        ctx.addIssue({
          code: "custom",
          path: ["settings", name],
          message: "Frequency ranges must be ordered from low to high.",
        });
    }
  });
export const presetImportSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: z.string().max(60).optional(),
  config: configSchema,
});
export function defaultSettings(): VisualizerSettings {
  return {
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
  };
}
export function createLayers(
  settings: VisualizerSettings,
  title = "YOUR SOUND, VISUALIZED",
): StudioLayer[] {
  return [
    {
      id: "background",
      name: "Background",
      type: "background",
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      rotation: 0,
      opacity: 1,
      color: settings.background,
      blend: "normal",
    },
    {
      id: "visual",
      name: "Main visualizer",
      type:
        settings.mode === "waveform" || settings.mode === "oscilloscope"
          ? "waveform"
          : settings.mode === "circular"
            ? "circular"
            : settings.mode === "spectrum" || settings.mode === "equalizer"
              ? "spectrum"
              : "particles",
      visible: true,
      locked: false,
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
      rotation: 0,
      opacity: 1,
      color: settings.color,
      blend: "screen",
      settings: { ...settings },
    },
    {
      id: "title",
      name: "Artist & title",
      type: "text",
      visible: true,
      locked: false,
      x: 960,
      y: 900,
      width: 1400,
      height: 200,
      rotation: 0,
      opacity: 1,
      color: "#F5F1FA",
      blend: "normal",
      text: title,
      subtitle: "Made with KAZU Audio Studio",
      artist: "",
      song: "",
      font: "Inter, sans-serif",
      fontSize: 48,
      fontWeight: 600,
      align: "center",
      letterSpacing: 4,
      lineHeight: 1.2,
      shadow: 0.3,
      glow: 0.2,
    },
  ];
}
export function configFromPreset(
  preset: Pick<Preset, "config" | "name">,
  aspectRatio?: VisualizerSettings["aspectRatio"],
): StudioConfig {
  const config = structuredClone(preset.config);
  if (aspectRatio) config.settings.aspectRatio = aspectRatio;
  return config;
}
const definitions: [
  string,
  string,
  VisualizerSettings["mode"],
  string,
  string,
  string,
  string,
][] = [
  [
    "sakura",
    "Sakura Dream",
    "particles",
    "Dreamy",
    "Soft petals. Infinite possibilities.",
    "#FF9BD2",
    "dream",
  ],
  [
    "galaxy",
    "Neon Galaxy",
    "galaxy",
    "Cosmic",
    "A universe born from every beat.",
    "#9D5CFF",
    "cosmic",
  ],
  [
    "tunnel",
    "Purple Tunnel",
    "tunnel",
    "3D",
    "Fall into an infinite rhythm.",
    "#8B3DFF",
    "cosmic",
  ],
  [
    "sphere",
    "Cosmic Sphere",
    "sphere",
    "3D",
    "Sound takes on a new dimension.",
    "#C77DFF",
    "cosmic",
  ],
  [
    "wave",
    "Infinity Wave",
    "liquid",
    "Liquid",
    "Fluid frequencies, endless motion.",
    "#69DFFF",
    "liquid",
  ],
  [
    "horizon",
    "Pink Horizon",
    "landscape",
    "Cinematic",
    "A retro-futurist escape in pink.",
    "#FF70BD",
    "cinematic",
  ],
  [
    "bass",
    "Bass Reactor",
    "equalizer",
    "Neon",
    "Give your low end a little power.",
    "#FF6E9F",
    "neon",
  ],
  [
    "dark",
    "Dark Frequency",
    "spectrum",
    "Minimal",
    "Nothing but you and the music.",
    "#B59CFF",
    "minimal",
  ],
  [
    "rings",
    "Electric Rings",
    "rings",
    "3D",
    "Energy in perfect orbit.",
    "#58E9FF",
    "cosmic",
  ],
  [
    "midnight",
    "Midnight Spectrum",
    "spectrum",
    "Minimal",
    "Classic bars. After-dark energy.",
    "#9B70FF",
    "minimal",
  ],
  [
    "dream",
    "Dream Particles",
    "particles",
    "Particles",
    "A slow dance through the stars.",
    "#F5A7FF",
    "dream",
  ],
  [
    "geometry",
    "Infinite Geometry",
    "geometry",
    "3D",
    "Precision meets creative chaos.",
    "#A58AFF",
    "cosmic",
  ],
  [
    "storm",
    "Violet Storm",
    "plasma",
    "Liquid",
    "A beautiful storm of sound.",
    "#B04CFF",
    "liquid",
  ],
  [
    "pulse",
    "Cyber Pulse",
    "oscilloscope",
    "Neon",
    " razor-sharp lines. Pure electricity.",
    "#57F1D0",
    "neon",
  ],
  [
    "energy",
    "Liquid Energy",
    "radial-wave",
    "Liquid",
    "Let the frequencies flow.",
    "#FF8AD8",
    "liquid",
  ],
];
export const BUILTIN_PRESETS: Preset[] = definitions.map(
  ([id, name, mode, category, description, accent, image]) => {
    const settings = {
      ...defaultSettings(),
      mode,
      color: accent,
      secondaryColor: id === "pulse" ? "#C77DFF" : "#FF9BD2",
      speed: [0.65, 0.8, 1.2, 0.9, 1.4][Number.parseInt(id, 36) % 5] || 1,
      particleCount: 1600 + (name.length % 6) * 650,
      intensity: 0.55 + (name.length % 5) * 0.1,
      glow: 0.55 + (name.length % 4) * 0.1,
      rotation: (name.length % 5) * 0.15,
    };
    return {
      id: `builtin-${id}`,
      name,
      category,
      description,
      config: {
        version: 1,
        settings,
        layers: createLayers(settings, name.toUpperCase()),
      },
      thumbnail: `/images/${image === "dream" ? "sakura-dream" : image === "neon" ? "neon-galaxy" : image === "cinematic" ? "studio-hero" : image === "minimal" ? "purple-tunnel" : image === "liquid" ? "neon-galaxy" : "cosmic-sphere"}.jpg`,
      featured: ["sakura", "galaxy", "tunnel", "sphere"].includes(id),
    };
  },
);
